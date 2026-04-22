"use client";

import { useState } from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { YearOverlayChart } from "./year-overlay-chart";
import { CategoryTimelineChart } from "./category-timeline-chart";
import type { YearOverlaySeries, CategoryTimelineRow } from "../_constants";

type Mode = "seasonal" | "by-category";

interface Props {
  yoySeries: YearOverlaySeries[];
  timelineData: CategoryTimelineRow[];
  stateFilter?: string;
}

export function MarketOverviewCard({ yoySeries, timelineData, stateFilter }: Props) {
  const [mode, setMode] = useState<Mode>("seasonal");

  const subtitle =
    mode === "seasonal"
      ? `Weekly avg $/kg${stateFilter ? ` in ${stateFilter}` : " nationally"}, last 3 years`
      : `Weekly avg $/kg by MLA category${stateFilter ? ` in ${stateFilter}` : " nationally"}`;

  const title = mode === "seasonal" ? "Year-on-year market" : "Market by category";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-markets/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
              <LineChartIcon className="text-markets h-3.5 w-3.5" />
            </div>
            <CardTitle>{title}</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-text-muted text-[11px]">{subtitle}</span>
            <div className="bg-surface inline-flex items-center gap-1 rounded-full p-1">
              <ModeButton active={mode === "seasonal"} onClick={() => setMode("seasonal")}>
                Seasonal
              </ModeButton>
              <ModeButton active={mode === "by-category"} onClick={() => setMode("by-category")}>
                By category
              </ModeButton>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "seasonal" ? (
          <YearOverlayChart series={yoySeries} />
        ) : (
          <CategoryTimelineChart data={timelineData} />
        )}
      </CardContent>
    </Card>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active ? "bg-markets text-white" : "text-text-muted hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}
