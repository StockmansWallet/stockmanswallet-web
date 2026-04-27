"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeaderActionsPortal } from "@/components/ui/page-header-actions-portal";
import { YardBookRunSheet } from "@/components/app/yard-book-run-sheet";
import { YardBookNotesList } from "@/components/app/yard-book-notes-list";
import {
  CalendarClock,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  NotebookPen,
  Plus,
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

type YardBookTab = "reminders" | "notes";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = dateStr.split("T")[0];
  const event = new Date(dateOnly + "T00:00:00");
  return Math.floor((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function YardBookTabs({ items, herds, notes, defaultTab = "reminders" }: YardBookTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<YardBookTab>(defaultTab);
  const activeItems = items.filter((i) => !i.is_completed);
  const upcomingCount = activeItems.filter((i) => daysUntil(i.event_date) >= 0).length;
  const overdueCount = activeItems.filter((i) => daysUntil(i.event_date) < 0).length;
  const todayCount = activeItems.filter((i) => daysUntil(i.event_date) === 0).length;
  const completedCount = items.filter((i) => i.is_completed).length;

  const handleTabChange = useCallback(
    (tab: YardBookTab) => {
      setActiveTab(tab);
      router.replace(tab === "notes" ? "/dashboard/tools/yard-book?tab=notes" : "/dashboard/tools/yard-book", {
        scroll: false,
      });
    },
    [router]
  );

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
  const actionHref =
    activeTab === "notes" ? "/dashboard/tools/yard-book/notes/new" : "/dashboard/tools/yard-book/new";
  const actionLabel = activeTab === "notes" ? "New Note" : "Add Item";
  const ActionIcon = activeTab === "notes" ? NotebookPen : Plus;

  return (
    <div>
      <PageHeaderActionsPortal>
        <div className="flex items-center gap-2">
          <YardBookModeTabs activeTab={activeTab} onChange={handleTabChange} />
          <Link
            href={actionHref}
            className="bg-yard-book hover:bg-yard-book-dark inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white transition-colors"
          >
            <ActionIcon className="h-4 w-4" aria-hidden="true" />
            {actionLabel}
          </Link>
        </div>
      </PageHeaderActionsPortal>

      <div className="mb-5 lg:hidden">
        <YardBookModeTabs activeTab={activeTab} onChange={handleTabChange} />
      </div>

      {activeTab === "reminders" ? remindersContent : notesContent}
    </div>
  );
}

function YardBookModeTabs({
  activeTab,
  onChange,
}: {
  activeTab: YardBookTab;
  onChange: (tab: YardBookTab) => void;
}) {
  return (
    <div
      className="relative flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.07] bg-clip-padding p-1 backdrop-blur-xl [backface-visibility:hidden] [transform:translateZ(0)]"
      role="tablist"
      aria-label="Yard Book sections"
    >
      {(["reminders", "notes"] as const).map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={`focus-visible:ring-yard-book/40 inline-flex h-7 min-w-24 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none ${
              active
                ? "bg-yard-book/20 text-yard-book-light"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab === "reminders" ? "Reminders" : "Notes"}
          </button>
        );
      })}
    </div>
  );
}
