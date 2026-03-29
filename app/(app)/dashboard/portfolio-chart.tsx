"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;   // ISO date string (YYYY-MM-DD)
  value: number;
}

interface ChartPoint {
  label: string;
  value: number | null;
}

interface PortfolioChartProps {
  data: DataPoint[];
}

type DateRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "All";

const DATE_RANGES: DateRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "All"];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/** Format YYYY-MM-DD to "29 Mar" or "29 Mar '25" when showYear is true. */
function formatDateLabel(dateStr: string, showYear = false): string {
  const [y, m, d] = dateStr.split("-");
  const base = `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1]}`;
  return showYear ? `${base} '${y.slice(2)}` : base;
}

/** Add N days to a YYYY-MM-DD string, returning a new YYYY-MM-DD string. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00"); // noon avoids DST edge cases
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Subtract N days from a YYYY-MM-DD string. */
function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number | null }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry || entry.value == null) return null;

  const isToday = label === "Today";

  return (
    <div className="rounded-lg bg-[#1A1A1A] px-3 py-2 text-xs shadow-lg ring-1 ring-white/10">
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">{label}</span>
        {isToday && (
          <span className="rounded bg-brand/20 px-1 py-0.5 text-[9px] font-medium text-brand">
            Today
          </span>
        )}
      </div>
      <p className="mt-0.5 font-semibold tabular-nums text-white">
        ${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

/** Range config: days to look back and step between ticks. */
function rangeConfig(range: DateRange): { days: number | null; stepDays: number } {
  switch (range) {
    case "1D":  return { days: 1,   stepDays: 1 };
    case "1W":  return { days: 7,   stepDays: 1 };
    case "1M":  return { days: 30,  stepDays: 3 };
    case "3M":  return { days: 90,  stepDays: 8 };
    case "6M":  return { days: 180, stepDays: 15 };
    case "1Y":  return { days: 365, stepDays: 30 };
    case "All": return { days: null, stepDays: 7 };
  }
}

/**
 * Build a time axis by stepping through dates from start to end.
 * Each tick gets the value from the nearest data point (if within range),
 * otherwise null. Uses pure string date math to avoid timezone issues.
 */
function buildTimeAxis(
  data: DataPoint[],
  startDateStr: string,
  todayStr: string,
  stepDays: number,
  showYear: boolean,
): ChartPoint[] {
  // Build value lookup
  const valueMap = new Map<string, number>();
  for (const d of data) {
    valueMap.set(d.date, d.value);
  }

  const result: ChartPoint[] = [];
  let cursor = startDateStr;

  while (cursor <= todayStr) {
    const isToday = cursor === todayStr;

    // Look for exact match or nearest within step range
    let value: number | null = valueMap.get(cursor) ?? null;
    if (value === null) {
      // Check nearby dates within half the step
      const halfStep = Math.max(Math.floor(stepDays / 2), 1);
      for (let offset = 1; offset <= halfStep; offset++) {
        const before = subtractDays(cursor, offset);
        const after = addDays(cursor, offset);
        if (valueMap.has(before)) { value = valueMap.get(before)!; break; }
        if (valueMap.has(after) && after <= todayStr) { value = valueMap.get(after)!; break; }
      }
    }

    result.push({
      label: isToday ? "Today" : formatDateLabel(cursor, showYear),
      value,
    });

    cursor = addDays(cursor, stepDays);
  }

  // Ensure "Today" is always the last point
  if (result.length === 0 || result[result.length - 1].label !== "Today") {
    result.push({
      label: "Today",
      value: valueMap.get(todayStr) ?? null,
    });
  }

  return result;
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  const [range, setRange] = useState<DateRange>("All");

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data.length) return [];

    const todayStr = data[data.length - 1].date;
    const { days, stepDays } = rangeConfig(range);

    let startStr: string;
    if (days === null) {
      startStr = data[0].date;
    } else {
      startStr = subtractDays(todayStr, days);
    }

    // For "All", calculate step based on total span
    let actualStep = stepDays;
    const startMs = new Date(startStr + "T12:00:00").getTime();
    const endMs = new Date(todayStr + "T12:00:00").getTime();
    const totalDays = Math.round((endMs - startMs) / 86_400_000);
    if (days === null) {
      actualStep = Math.max(Math.round(totalDays / 12), 1);
    }

    // Show year suffix on labels when the range crosses a year boundary
    const showYear = startStr.slice(0, 4) !== todayStr.slice(0, 4);

    return buildTimeAxis(data, startStr, todayStr, actualStep, showYear);
  }, [data, range]);

  if (!data.length) return null;

  return (
    <div>
      {/* Range selector */}
      <div className="mb-3 flex items-center gap-1">
        {DATE_RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              range === r
                ? "bg-brand text-white"
                : "text-text-muted hover:bg-white/5 hover:text-text-primary"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <ResponsiveContainer key={range} width="100%" height={240}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D9762F" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#D9762F" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 11 }}
            interval={Math.max(Math.ceil(chartData.length / 6) - 1, 0)}
          />
          <YAxis
            tickFormatter={formatCurrency}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 11 }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#D9762F"
            strokeWidth={2.5}
            fill="url(#valueGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#D9762F", strokeWidth: 0 }}
            connectNulls
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
