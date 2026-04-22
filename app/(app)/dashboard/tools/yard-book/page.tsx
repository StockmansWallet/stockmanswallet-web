import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { YardBookRunSheet } from "@/components/app/yard-book-run-sheet";
import {
  CalendarClock,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";

export const metadata = { title: "Yard Book" };

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = dateStr.split("T")[0];
  const event = new Date(dateOnly + "T00:00:00");
  return Math.floor(
    (event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default async function YardBookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const [{ data: items }, { data: herds }] = await Promise.all([
    supabase
      .from("yard_book_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("event_date"),
    supabase
      .from("herds")
      .select("id, name, head_count")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .eq("is_sold", false)
      .order("name"),
  ]);

  const allItems = items ?? [];
  const activeItems = allItems.filter((i) => !i.is_completed);
  const upcomingCount = activeItems.filter(
    (i) => daysUntil(i.event_date) >= 0
  ).length;
  const overdueCount = activeItems.filter(
    (i) => daysUntil(i.event_date) < 0
  ).length;
  const todayCount = activeItems.filter(
    (i) => daysUntil(i.event_date) === 0
  ).length;
  const completedCount = allItems.filter((i) => i.is_completed).length;

  return (
    <div className="max-w-4xl">
      <PageHeader feature="yard-book"
        title="Yard Book"
        titleClassName="text-4xl font-bold text-yard-book"
        subtitle="Top Pocket Stuff"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      {allItems.length === 0 ? (
        <Card>
          <EmptyState
            title="No yard book items"
            description="Add tasks, events, and reminders to your run sheet."
            actionLabel="Add Item"
            actionHref="/dashboard/tools/yard-book/new"
            variant="yard-book"
          />
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatCard
              icon={<CalendarClock className="h-4 w-4" />}
              label="Upcoming"
              value={String(upcomingCount)}
              accent="lime"
            />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Overdue"
              value={String(overdueCount)}
              accent="lime"
              change={
                overdueCount > 0
                  ? { value: `${overdueCount} past due`, positive: false }
                  : undefined
              }
            />
            <StatCard
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Today"
              value={String(todayCount)}
              accent="lime"
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Completed"
              value={String(completedCount)}
              accent="lime"
            />
          </div>

          {/* Run Sheet */}
          <YardBookRunSheet items={allItems} herds={herds ?? []} />
        </>
      )}
    </div>
  );
}
