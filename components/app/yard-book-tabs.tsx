"use client";

import { Tabs } from "@/components/ui/tabs";
import { StatCard } from "@/components/ui/stat-card";
import { YardBookRunSheet } from "@/components/app/yard-book-run-sheet";
import { YardBookNotesList } from "@/components/app/yard-book-notes-list";
import {
  CalendarClock,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";
import type { Database } from "@/lib/types/database";

type YardBookItemRow = Database["public"]["Tables"]["yard_book_items"]["Row"];

type Note = {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  updated_at: string;
};

interface YardBookTabsProps {
  items: YardBookItemRow[];
  herds: { id: string; name: string; head_count: number }[];
  notes: Note[];
  defaultTab?: "reminders" | "notes";
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = dateStr.split("T")[0];
  const event = new Date(dateOnly + "T00:00:00");
  return Math.floor((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function YardBookTabs({ items, herds, notes, defaultTab = "reminders" }: YardBookTabsProps) {
  const activeItems = items.filter((i) => !i.is_completed);
  const upcomingCount = activeItems.filter((i) => daysUntil(i.event_date) >= 0).length;
  const overdueCount = activeItems.filter((i) => daysUntil(i.event_date) < 0).length;
  const todayCount = activeItems.filter((i) => daysUntil(i.event_date) === 0).length;
  const completedCount = items.filter((i) => i.is_completed).length;

  const remindersContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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

      <YardBookRunSheet items={items} herds={herds} />
    </div>
  );

  const notesContent = <YardBookNotesList notes={notes} />;

  return (
    <Tabs
      accent="yard-book"
      defaultTab={defaultTab}
      tabs={[
        { id: "reminders", label: "Reminders", content: remindersContent },
        { id: "notes", label: "Notes", content: notesContent },
      ]}
    />
  );
}
