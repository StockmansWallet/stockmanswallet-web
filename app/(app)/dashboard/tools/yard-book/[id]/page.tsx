import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteYardBookItemButton } from "./delete-button";
import { ToggleCompleteButton } from "./toggle-complete-button";
import {
  Pencil,
  Calendar,
  Clock,
  Repeat,
  Bell,
  PawPrint,
  MapPin,
  FileText,
  Wrench,
  DollarSign,
  Home,
  User,
  type LucideIcon,
} from "lucide-react";
import type { YardBookCategory } from "@/lib/types/models";

export const metadata = { title: "Yard Book Item" };

const CATEGORY_CONFIG: Record<
  YardBookCategory,
  { icon: LucideIcon; bg: string; text: string; label: string }
> = {
  Livestock: { icon: PawPrint, bg: "bg-orange-500/15", text: "text-orange-400", label: "Livestock" },
  Operations: { icon: Wrench, bg: "bg-amber-700/15", text: "text-amber-600", label: "Operations" },
  Finance: { icon: DollarSign, bg: "bg-blue-500/15", text: "text-blue-400", label: "Finance" },
  Family: { icon: Home, bg: "bg-purple-500/15", text: "text-purple-400", label: "Family" },
  Me: { icon: User, bg: "bg-green-500/15", text: "text-green-400", label: "Me" },
};

const REMINDER_LABELS: Record<number, string> = {
  0: "On the day",
  1: "1 day before",
  3: "3 days before",
  7: "1 week before",
  14: "2 weeks before",
  21: "3 weeks before",
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-3 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-text-muted" />
      <span className="text-text-muted">{label}</span>
      <span className="ml-auto font-medium text-text-primary">{value}</span>
    </div>
  );
}

function SectionIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${className ?? "bg-lime-500/15"}`}>
      <Icon className={`h-3.5 w-3.5 ${className ? "" : "text-lime-400"}`} />
    </div>
  );
}

function formatDateAU(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(dateStr + "T00:00:00");
  return Math.floor(
    (event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function recurrenceLabel(rule: string, interval?: number | null): string {
  const prefix = interval && interval > 1 ? `Every ${interval} ` : "Every ";
  switch (rule) {
    case "Weekly":
      return interval && interval > 1 ? `${prefix}weeks` : "Weekly";
    case "Fortnightly":
      return "Fortnightly";
    case "Monthly":
      return interval && interval > 1 ? `${prefix}months` : "Monthly";
    case "Annual":
      return interval && interval > 1 ? `${prefix}years` : "Annually";
    default:
      return rule;
  }
}

export default async function YardBookItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: item } = await supabase
    .from("yard_book_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .single();

  if (!item) notFound();

  // Resolve linked herds
  let linkedHerds: { id: string; name: string; head_count: number }[] = [];
  if (item.linked_herd_ids && item.linked_herd_ids.length > 0) {
    const { data } = await supabase
      .from("herd_groups")
      .select("id, name, head_count")
      .in("id", item.linked_herd_ids)
      .eq("is_deleted", false);
    linkedHerds = data ?? [];
  }

  // Resolve property
  let propertyName: string | null = null;
  if (item.property_id) {
    const { data } = await supabase
      .from("properties")
      .select("property_name")
      .eq("id", item.property_id)
      .single();
    propertyName = data?.property_name ?? null;
  }

  const catConfig =
    CATEGORY_CONFIG[item.category_raw as YardBookCategory] ??
    CATEGORY_CONFIG.Livestock;
  const CatIcon = catConfig.icon;
  const days = daysUntil(item.event_date);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={item.title}
        subtitle={catConfig.label}
        actions={
          <div className="flex items-center gap-2">
            <ToggleCompleteButton id={id} isCompleted={item.is_completed} />
            <Link href={`/dashboard/tools/yard-book/${id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            </Link>
            <DeleteYardBookItemButton id={id} title={item.title} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${catConfig.bg}`}
              >
                <CatIcon className={`h-3.5 w-3.5 ${catConfig.text}`} />
              </div>
              <CardTitle>Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-text-muted">Category</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${catConfig.bg} ${catConfig.text}`}
              >
                <CatIcon className="h-3 w-3" />
                {catConfig.label}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-text-muted">Status</span>
              {item.is_completed ? (
                <Badge variant="success">Completed</Badge>
              ) : days < 0 ? (
                <Badge variant="danger">{Math.abs(days)}d overdue</Badge>
              ) : days === 0 ? (
                <Badge variant="success">Today</Badge>
              ) : days <= 7 ? (
                <Badge variant="warning">{days}d away</Badge>
              ) : (
                <Badge variant="default">{days}d away</Badge>
              )}
            </div>
            {item.is_completed && item.completed_date && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-text-muted">Completed</span>
                <span className="font-medium text-text-primary">
                  {formatDateAU(item.completed_date.split("T")[0])}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Calendar} />
              <CardTitle>Event</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
            <InfoRow
              icon={Calendar}
              label="Date"
              value={formatDateAU(item.event_date)}
            />
            {!item.is_all_day && item.event_time && (
              <InfoRow
                icon={Clock}
                label="Time"
                value={formatTime(item.event_time)}
              />
            )}
            {item.is_all_day && (
              <div className="flex items-center gap-3 py-3 text-sm">
                <Clock className="h-4 w-4 shrink-0 text-text-muted" />
                <span className="text-text-muted">Time</span>
                <span className="ml-auto text-text-muted">All day</span>
              </div>
            )}
            {item.is_recurring && item.recurrence_rule && (
              <InfoRow
                icon={Repeat}
                label="Repeats"
                value={recurrenceLabel(
                  item.recurrence_rule,
                  item.recurrence_interval
                )}
              />
            )}
            {propertyName && (
              <InfoRow icon={MapPin} label="Property" value={propertyName} />
            )}
          </CardContent>
        </Card>

        {/* Reminders */}
        {item.reminder_offsets && item.reminder_offsets.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={Bell} />
                <CardTitle>Reminders</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex flex-wrap gap-2">
                {[...item.reminder_offsets]
                  .sort((a, b) => b - a)
                  .map((offset) => (
                    <span
                      key={offset}
                      className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-xs font-medium text-text-secondary"
                    >
                      <Bell className="h-3 w-3" />
                      {REMINDER_LABELS[offset] ?? `${offset} days before`}
                    </span>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Linked Herds */}
        {linkedHerds.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={PawPrint} />
                <CardTitle>Linked Herds</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
              {linkedHerds.map((herd) => (
                <div
                  key={herd.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <Link
                    href={`/dashboard/herds/${herd.id}`}
                    className="font-medium text-lime-400 hover:underline"
                  >
                    {herd.name}
                  </Link>
                  <span className="text-text-muted">
                    {herd.head_count.toLocaleString()} head
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {item.notes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={FileText} />
                <CardTitle>Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                {item.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
