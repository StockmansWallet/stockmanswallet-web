"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { YearOverlaySeries } from "../_constants";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Approximate week number of the first day of each month (non-leap year).
const MONTH_START_WEEKS = [1, 5, 9, 14, 18, 22, 27, 31, 35, 40, 44, 48];

// Colour ramp: older years fade back, the current year pops.
// Matches Luke's sketch (grey / red / green) while staying readable on a dark surface.
const YEAR_COLOURS = ["rgba(148, 163, 184, 0.85)", "#EF4444", "#22C55E"];

type Row = {
  week: number;
} & Record<string, number | string | null>;

interface Props {
  series: YearOverlaySeries[];
  height?: number;
}

function weekToMonthLabel(week: number): string {
  // Find the month this week falls into (month whose start week is <= this week).
  let idx = 0;
  for (let i = 0; i < MONTH_START_WEEKS.length; i++) {
    if (MONTH_START_WEEKS[i] <= week) idx = i;
    else break;
  }
  return `${MONTH_NAMES[idx]} (wk ${week})`;
}

function Tip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number | null; name: string; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg bg-[#1A1A1A] px-3 py-2 text-xs shadow-lg ring-1 ring-white/10">
      <p className="text-text-muted">{typeof label === "number" ? weekToMonthLabel(label) : ""}</p>
      {rows.map((p, i) => (
        <p key={i} className="mt-0.5 font-semibold tabular-nums" style={{ color: p.color }}>
          {p.name}: ${(p.value as number).toFixed(2)}/kg
        </p>
      ))}
    </div>
  );
}

export function YearOverlayChart({ series, height = 240 }: Props) {
  const { chartData, yearKeys } = useMemo(() => {
    const rows: Row[] = Array.from({ length: 53 }, (_, i) => ({ week: i + 1 }));
    const keys: number[] = [];
    for (const s of series) {
      keys.push(s.year);
      const key = String(s.year);
      for (const p of s.points) {
        if (p.week >= 1 && p.week <= 53) {
          rows[p.week - 1][key] = p.avg_price;
        }
      }
    }
    return { chartData: rows, yearKeys: keys };
  }, [series]);

  const hasAnyData = useMemo(
    () => chartData.some((r) => yearKeys.some((k) => r[String(k)] != null)),
    [chartData, yearKeys]
  );

  if (!hasAnyData) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-text-muted">
        Not enough history to draw a year-on-year comparison yet.
      </div>
    );
  }

  // Oldest year first (greys), current year last (green) so it paints on top.
  const orderedYears = [...yearKeys].sort((a, b) => a - b);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="week"
          type="number"
          domain={[1, 53]}
          ticks={MONTH_START_WEEKS}
          tickFormatter={(w: number) => {
            const idx = MONTH_START_WEEKS.indexOf(w);
            return idx >= 0 ? MONTH_NAMES[idx] : "";
          }}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 11 }}
          width={56}
          domain={["auto", "auto"]}
        />
        <Tooltip content={<Tip />} />
        <Legend
          verticalAlign="top"
          align="right"
          height={28}
          iconType="plainline"
          wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
        />
        {orderedYears.map((year, idx) => {
          const isCurrent = idx === orderedYears.length - 1;
          const colour = YEAR_COLOURS[idx] ?? "#FF8000";
          return (
            <Line
              key={year}
              type="monotone"
              dataKey={String(year)}
              name={String(year)}
              stroke={colour}
              strokeWidth={isCurrent ? 2.5 : 1.75}
              dot={false}
              activeDot={{ r: 4, fill: colour, strokeWidth: 0 }}
              connectNulls
              isAnimationActive
              animationDuration={700}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
