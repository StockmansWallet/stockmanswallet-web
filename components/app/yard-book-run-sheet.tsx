"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Wrench,
  DollarSign,
  Home,
  User,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";
import type { Database } from "@/lib/types/database";
import type { YardBookCategory } from "@/lib/types/models";

type YardBookItemRow = Database["public"]["Tables"]["yard_book_items"]["Row"];

interface YardBookRunSheetProps {
  items: YardBookItemRow[];
  herds: { id: string; name: string; head_count: number }[];
}

type IconComponent = React.ComponentType<{ className?: string }>;

const CATEGORY_CONFIG: Record<
  YardBookCategory,
  { label: string; icon: IconComponent; bg: string; text: string; iconBg: string }
> = {
  Livestock: {
    label: "Livestock",
    icon: IconCattleTags,
    bg: "bg-yard-book/15",
    text: "text-yard-book-light",
    iconBg: "bg-yard-book/20",
  },
  Operations: {
    label: "Operations",
    icon: Wrench,
    bg: "bg-amber-700/15",
    text: "text-warning",
    iconBg: "bg-amber-700/20",
  },
  Finance: {
    label: "Finance",
    icon: DollarSign,
    bg: "bg-info/15",
    text: "text-info",
    iconBg: "bg-info/20",
  },
  Family: {
    label: "Family",
    icon: Home,
    bg: "bg-violet/15",
    text: "text-violet",
    iconBg: "bg-violet/20",
  },
  Me: {
    label: "Personal",
    icon: User,
    bg: "bg-success/15",
    text: "text-success",
    iconBg: "bg-success/20",
  },
};

type HorizonKey = "overdue" | "today" | "next7" | "next30" | "next90" | "later";

const HORIZON_CONFIG: {
  key: HorizonKey;
  title: string;
  textClass: string;
}[] = [
  { key: "overdue", title: "Overdue", textClass: "text-error" },
  { key: "today", title: "Today", textClass: "text-success" },
  { key: "next7", title: "Next 7 Days", textClass: "text-text-primary" },
  { key: "next30", title: "Next 30 Days", textClass: "text-text-primary" },
  { key: "next90", title: "Next 90 Days", textClass: "text-text-primary" },
  { key: "later", title: "Later", textClass: "text-text-muted" },
];

function daysUntilEvent(eventDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = eventDateStr.split("T")[0];
  const [y, m, d] = dateOnly.split("-").map(Number);
  const event = new Date(y, m - 1, d);
  return Math.floor((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getHorizon(days: number): HorizonKey {
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "next7";
  if (days <= 30) return "next30";
  if (days <= 90) return "next90";
  return "later";
}

function countdownText(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days <= 7) return `${days}d`;
  if (days <= 30) return `${Math.ceil(days / 7)}w`;
  if (days <= 365) return `${Math.ceil(days / 30)}mo`;
  return `${Math.ceil(days / 365)}y`;
}

function countdownColor(days: number): string {
  if (days < 0) return "bg-error/15 text-error";
  if (days === 0) return "bg-success/15 text-success";
  if (days <= 7) return "bg-warning/15 text-warning";
  return "bg-white/8 text-text-muted";
}

function formatDateAU(dateStr: string): string {
  const dateOnly = dateStr.split("T")[0];
  const [y, m, d] = dateOnly.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function YardBookRunSheet({ items, herds }: YardBookRunSheetProps) {
  const [filterCategory, setFilterCategory] = useState<YardBookCategory | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const herdMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of herds) {
      map.set(h.id, h.name);
    }
    return map;
  }, [herds]);

  const completedCount = useMemo(
    () => items.filter((i) => i.is_completed).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!showCompleted && item.is_completed) return false;
      if (filterCategory && item.category_raw !== filterCategory) return false;
      return true;
    });
  }, [items, filterCategory, showCompleted]);

  const horizonGroups = useMemo(() => {
    const groups: Record<HorizonKey, YardBookItemRow[]> = {
      overdue: [],
      today: [],
      next7: [],
      next30: [],
      next90: [],
      later: [],
    };

    for (const item of filteredItems) {
      if (item.is_completed) {
        // Completed items go into a pseudo "later" bucket
        groups.later.push(item);
        continue;
      }
      const days = daysUntilEvent(item.event_date);
      const horizon = getHorizon(days);
      groups[horizon].push(item);
    }

    // Sort each group by event_date ascending
    for (const key of Object.keys(groups) as HorizonKey[]) {
      groups[key].sort((a, b) => {
        const [ay, am, ad] = a.event_date.split("T")[0].split("-").map(Number);
        const [by, bm, bd] = b.event_date.split("T")[0].split("-").map(Number);
        return new Date(ay, am - 1, ad).getTime() - new Date(by, bm - 1, bd).getTime();
      });
    }

    return HORIZON_CONFIG.filter((h) => groups[h.key].length > 0).map((h) => ({
      ...h,
      items: groups[h.key],
    }));
  }, [filteredItems]);

  return (
    <div>
      {/* Toolbar: category pills + add item */}
      <div className="mb-4 flex flex-col gap-3 rounded-full bg-surface-lowest px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: category filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterCategory(null)}
            className={`inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-xs font-medium transition-all ${
              filterCategory === null
                ? "bg-emerald/15 text-emerald"
                : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text-secondary"
            }`}
          >
            All
          </button>
          {(Object.keys(CATEGORY_CONFIG) as YardBookCategory[]).map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const isActive = filterCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(isActive ? null : cat)}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-all ${
                  isActive
                    ? `${config.bg} ${config.text}`
                    : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text-secondary"
                }`}
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Right: add item */}
        <div className="flex items-center gap-1.5">
          <Link href="/dashboard/tools/yard-book/new">
            <Button size="sm" variant="lime">
              Add Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Show/hide completed toggle */}
      {completedCount > 0 && (
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-secondary"
        >
          {showCompleted ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {showCompleted ? "Hide" : "Show"} completed ({completedCount})
        </button>
      )}

      {/* Horizon sections */}
      {horizonGroups.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] p-12 text-center">
          <p className="text-sm text-text-muted">
            {filterCategory
              ? `No ${filterCategory.toLowerCase()} items to show.`
              : "No items to show."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {horizonGroups.map((group) => (
            <div key={group.key}>
              {/* Section header */}
              <div className="mb-2 flex items-center gap-2">
                <h3
                  className={`text-xs font-semibold uppercase tracking-wider ${group.textClass}`}
                >
                  {group.title}
                </h3>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald/15 px-1.5 text-[10px] font-semibold tabular-nums text-emerald">
                  {group.items.length}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const days = daysUntilEvent(item.event_date);
                  const catConfig = CATEGORY_CONFIG[item.category_raw as YardBookCategory] ?? CATEGORY_CONFIG.Livestock;
                  const CatIcon = catConfig.icon;
                  const linkedHerds = (item.linked_herd_ids ?? [])
                    .map((id) => herdMap.get(id))
                    .filter(Boolean);

                  return (
                    <Link
                      key={item.id}
                      href={`/dashboard/tools/yard-book/${item.id}`}
                      className="group flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-3 transition-all hover:bg-white/[0.06]"
                    >
                      {/* Category icon */}
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${catConfig.iconBg}`}
                      >
                        <CatIcon className={`h-4 w-4 ${catConfig.text}`} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            item.is_completed
                              ? "text-text-muted line-through"
                              : "text-text-primary"
                          }`}
                        >
                          {item.title}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          <span>{formatDateAU(item.event_date)}</span>
                          {!item.is_all_day && item.event_time && (
                            <span>{formatTime(item.event_time)}</span>
                          )}
                          {linkedHerds.length > 0 && (
                            <div className="flex items-center gap-1">
                              {linkedHerds.slice(0, 2).map((name, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-0.5 rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary"
                                >
                                  <IconCattleTags className="h-2.5 w-2.5" />
                                  {name}
                                </span>
                              ))}
                              {linkedHerds.length > 2 && (
                                <span className="text-[10px] text-text-muted">
                                  +{linkedHerds.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Countdown or completed badge */}
                      <div className="shrink-0">
                        {item.is_completed ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${countdownColor(days)}`}
                          >
                            {countdownText(days)}
                          </span>
                        )}
                      </div>

                      {/* Chevron */}
                      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
