import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteYardbookItemButton } from "./delete-button";
import { ToggleCompleteButton } from "./toggle-complete-button";
import {
  Pencil,
  Calendar,
  Clock,
  Repeat,
  Bell,
  MapPin,
  FileText,
  Wrench,
  DollarSign,
  Home,
  User,
} from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";
import type { YardbookCategory } from "@/lib/types/models";

export const metadata = { title: "Yardbook Item" };

type IconComponent = React.ComponentType<{ className?: string }>;

const CATEGORY_CONFIG: Record<
  YardbookCategory,
  { icon: IconComponent; bg: string; text: string; label: string }
> = {
  Livestock: {
    icon: IconCattleTags,
    bg: "bg-yardbook/15",
    text: "text-yardbook-light",
    label: "Livestock",
  },
  Operations: { icon: Wrench, bg: "bg-warning/15", text: "text-warning", label: "Operations" },
  Finance: { icon: DollarSign, bg: "bg-info/15", text: "text-info", label: "Finance" },
  Family: { icon: Home, bg: "bg-violet/15", text: "text-violet", label: "Family" },
  Me: { icon: User, bg: "bg-success/15", text: "text-success", label: "Me" },
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
  icon: IconComponent;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-3 text-sm">
      <Icon className="text-text-muted h-4 w-4 shrink-0" />
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary ml-auto font-medium">{value}</span>
    </div>
  );
}

function SectionIcon({ icon: Icon, className }: { icon: IconComponent; className?: string }) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${className ?? "bg-yardbook/15"}`}
    >
      <Icon className={`h-3.5 w-3.5 ${className ? "" : "text-yardbook"}`} />
    </div>
  );
}

function formatDateAU(dateStr: string): string {
  const dateOnly = dateStr.split("T")[0];
  const d = new Date(dateOnly + "T00:00:00");
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
  const dateOnly = dateStr.split("T")[0];
  const event = new Date(dateOnly + "T00:00:00");
  return Math.floor((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

export default async function YardbookItemPage({ params }: { params: Promise<{ id: string }> }) {
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
      .from("herds")
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

  let attachmentFiles: {
    id: string;
    title: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    kind: string | null;
  }[] = [];
  if (item.attachment_file_ids && item.attachment_file_ids.length > 0) {
    const { data } = await supabase
      .from("glovebox_files")
      .select("id, title, original_filename, mime_type, size_bytes, kind")
      .in("id", item.attachment_file_ids)
      .eq("user_id", user.id)
      .eq("is_deleted", false);
    attachmentFiles = (data ?? []).sort(
      (a, b) => item.attachment_file_ids.indexOf(a.id) - item.attachment_file_ids.indexOf(b.id)
    );
  }

  const catConfig =
    CATEGORY_CONFIG[item.category_raw as YardbookCategory] ?? CATEGORY_CONFIG.Livestock;
  const CatIcon = catConfig.icon;
  const days = daysUntil(item.event_date);

  return (
    <div className="w-full max-w-[1680px]">
      <PageHeader
        feature="yardbook"
        title={item.title}
        subtitle={catConfig.label}
        actions={
          <div className="flex items-center gap-2">
            <ToggleCompleteButton id={id} isCompleted={item.is_completed} />
            <Link href={`/dashboard/tools/yardbook/${id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            </Link>
            <DeleteYardbookItemButton id={id} title={item.title} />
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
          <CardContent className="divide-y divide-white/[0.04] px-5 pb-5">
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
                <span className="text-text-primary font-medium">
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
          <CardContent className="divide-y divide-white/[0.04] px-5 pb-5">
            <InfoRow icon={Calendar} label="Date" value={formatDateAU(item.event_date)} />
            {!item.is_all_day && item.event_time && (
              <InfoRow icon={Clock} label="Time" value={formatTime(item.event_time)} />
            )}
            {item.is_all_day && (
              <div className="flex items-center gap-3 py-3 text-sm">
                <Clock className="text-text-muted h-4 w-4 shrink-0" />
                <span className="text-text-muted">Time</span>
                <span className="text-text-muted ml-auto">All day</span>
              </div>
            )}
            {item.is_recurring && item.recurrence_rule && (
              <InfoRow
                icon={Repeat}
                label="Repeats"
                value={recurrenceLabel(item.recurrence_rule, item.recurrence_interval)}
              />
            )}
            {propertyName && <InfoRow icon={MapPin} label="Property" value={propertyName} />}
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
                      className="text-text-secondary inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-xs font-medium"
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
                <SectionIcon icon={IconCattleTags} />
                <CardTitle>Linked Herds</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-white/[0.04] px-5 pb-5">
              {linkedHerds.map((herd) => (
                <div key={herd.id} className="flex items-center justify-between py-3 text-sm">
                  <Link
                    href={`/dashboard/herds/${herd.id}`}
                    className="text-yardbook font-medium hover:underline"
                  >
                    {herd.name}
                  </Link>
                  <span className="text-text-muted">{herd.head_count.toLocaleString()} head</span>
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
              <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                {item.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {attachmentFiles.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={FileText} />
                <CardTitle>Glovebox Attachments</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {attachmentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yardbook/15">
                      <FileText className="h-4 w-4 text-yardbook-light" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {file.title}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        {file.kind ? gloveboxKindLabel(file.kind) : shortMime(file.mime_type)}
                        {" · "}
                        {formatBytes(file.size_bytes)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function gloveboxKindLabel(kind: string): string {
  return kind
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shortMime(mime: string): string {
  const value = (mime || "").toLowerCase();
  if (value === "application/pdf") return "PDF";
  if (value.startsWith("image/")) return value.split("/")[1]?.toUpperCase() ?? "IMAGE";
  if (value.includes("spreadsheet") || value.includes("excel")) return "XLSX";
  if (value.includes("csv")) return "CSV";
  if (value.includes("wordprocessingml")) return "DOCX";
  if (value.startsWith("text/")) return "TEXT";
  return "FILE";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
