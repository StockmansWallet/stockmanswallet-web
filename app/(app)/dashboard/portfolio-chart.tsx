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

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
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

/** Number of days to look back for each range option. */
function rangeToDays(range: DateRange): number | null {
  switch (range) {
    case "1D": return 1;
    case "1W": return 7;
    case "1M": return 30;
    case "3M": return 90;
    case "6M": return 180;
    case "1Y": return 365;
    case "All": return null;
  }
}

/**
 * Build a time axis from startDate to endDate, picking evenly spaced tick
 * labels, and map actual data points onto matching dates.
 */
function buildTimeAxis(
  data: DataPoint[],
  startDate: Date,
  endDate: Date,
  maxTicks: number,
): ChartPoint[] {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const spanMs = endMs - startMs;

  // Build a lookup: date string -> value
  const valueMap = new Map<string, number>();
  for (const d of data) {
    valueMap.set(d.date, d.value);
  }

  // Filter data points within the range
  const pointsInRange = data.filter((d) => {
    const ms = new Date(d.date + "T00:00:00").getTime();
    return ms >= startMs && ms <= endMs;
  });

  // Generate evenly spaced ticks across the full time span
  const result: ChartPoint[] = [];
  const step = spanMs / (maxTicks - 1);

  for (let i = 0; i < maxTicks; i++) {
    const tickMs = startMs + step * i;
    const tickDate = new Date(tickMs);
    const tickStr = tickDate.toISOString().slice(0, 10);
    const isLast = i === maxTicks - 1;

    // Find the closest data point within half a step
    let closest: DataPoint | null = null;
    let closestDist = Infinity;
    for (const d of pointsInRange) {
      const dMs = new Date(d.date + "T00:00:00").getTime();
      const dist = Math.abs(dMs - tickMs);
      if (dist < closestDist && dist <= step / 2) {
        closest = d;
        closestDist = dist;
      }
    }

    result.push({
      label: isLast ? "Today" : formatDateLabel(tickStr),
      value: closest?.value ?? null,
    });
  }

  return result;
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  const [range, setRange] = useState<DateRange>("All");

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data.length) return [];

    const todayStr = data[data.length - 1].date;
    const today = new Date(todayStr + "T00:00:00");
    const days = rangeToDays(range);

    let startDate: Date;
    if (days === null) {
      // "All": start from the earliest data point
      startDate = new Date(data[0].date + "T00:00:00");
    } else {
      startDate = new Date(today.getTime() - days * 86_400_000);
    }

    // Ensure start isn't after today
    if (startDate.getTime() >= today.getTime()) {
      startDate = new Date(today.getTime() - 86_400_000);
    }

    return buildTimeAxis(data, startDate, today, 12);
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

      <ResponsiveContainer width="100%" height={240}>
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
            interval="preserveStartEnd"
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
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
