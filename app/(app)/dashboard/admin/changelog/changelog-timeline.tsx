"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Smartphone, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { TimelineDay, DevUpdate } from "@/lib/types/dev-docs";
import { ChangelogEntry } from "./changelog-entry";

type PlatformFilter = "all" | "ios" | "web";

export function ChangelogTimeline({ days }: { days: TimelineDay[] }) {
  const [filter, setFilter] = useState<PlatformFilter>("all");
  const [expandedDay, setExpandedDay] = useState<string | null>(
    days[0]?.dateKey ?? null
  );

  const filteredDays = days
    .map((day) => ({
      ...day,
      entries:
        filter === "all"
          ? day.entries
          : day.entries.filter((e) => e.platform === filter),
    }))
    .filter((day) => day.entries.length > 0);

  const platforms = (entries: DevUpdate[]) => {
    const has = { ios: false, web: false };
    for (const e of entries) has[e.platform] = true;
    return has;
  };

  const buildLabel = (entries: DevUpdate[]) => {
    for (const e of entries) {
      if (e.build_label) return e.build_label;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Filter pills */}
      <div className="flex gap-2">
        {(["all", "ios", "web"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
              filter === f
                ? "bg-white/12 text-text-primary"
                : "text-text-muted hover:bg-white/5 hover:text-text-secondary"
            }`}
          >
            {f === "all" ? "All" : f === "ios" ? "iOS" : "Web"}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filteredDays.length === 0 ? (
        <EmptyState
          title="No updates yet"
          description="Changelog entries will appear here as updates are made."
        />
      ) : (
        filteredDays.map((day) => {
          const isExpanded = expandedDay === day.dateKey;
          const p = platforms(day.entries);
          const iosBuild = buildLabel(day.entries);

          return (
            <Card key={day.dateKey} className="overflow-hidden">
              {/* Day header - clickable */}
              <button
                onClick={() =>
                  setExpandedDay(isExpanded ? null : day.dateKey)
                }
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="text-text-muted">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
                <span className="text-sm font-semibold text-text-primary">
                  {day.dateLabel}
                </span>
                <div className="flex items-center gap-1.5">
                  {p.ios && (
                    <Badge variant="info">
                      <Smartphone className="mr-1 h-3 w-3" />
                      {iosBuild ?? "iOS"}
                    </Badge>
                  )}
                  {p.web && (
                    <Badge variant="success">
                      <Globe className="mr-1 h-3 w-3" />
                      Web
                    </Badge>
                  )}
                </div>
                <span className="ml-auto text-xs text-text-muted">
                  {day.entries.length}{" "}
                  {day.entries.length === 1 ? "update" : "updates"}
                </span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-white/5 px-5 pb-4 pt-2">
                  {day.entries.map((entry) => (
                    <ChangelogEntry key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
