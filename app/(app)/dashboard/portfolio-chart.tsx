"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  month: string;
  value: number;
}

interface ChartPoint {
  month: string;
  current: number | null;
  projected: number | null;
}

interface PortfolioChartProps {
  data: DataPoint[];
}

type DateRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "All";

const DATE_RANGES: DateRange[] = ["1W", "1M", "3M", "6M", "1Y", "All"];

function rangeToPoints(range: DateRange, total: number): number {
  // Map ranges to approximate data points (out of 13 monthly projection points)
  switch (range) {
    case "1W": return Math.min(2, total);
    case "1M": return Math.min(2, total);
    case "3M": return Math.min(4, total);
    case "6M": return Math.min(7, total);
    case "1Y": return Math.min(13, total);
    case "All": return total;
  }
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number | null }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  // Find the non-null value from either series
  const currentEntry = payload.find((p) => p.dataKey === "current" && p.value != null);
  const projectedEntry = payload.find((p) => p.dataKey === "projected" && p.value != null);
  const entry = currentEntry ?? projectedEntry;
  if (!entry || entry.value == null) return null;
  const isProjected = !currentEntry || (currentEntry && projectedEntry);

  return (
    <div className="rounded-lg bg-[#1A1A1A] px-3 py-2 text-xs shadow-lg ring-1 ring-white/10">
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">{label}</span>
        {isProjected && projectedEntry ? (
          <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-medium text-text-muted">
            Projected
          </span>
        ) : (
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

export function PortfolioChart({ data }: PortfolioChartProps) {
  const [range, setRange] = useState<DateRange>("1Y");

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data.length) return [];
    const count = rangeToPoints(range, data.length);
    const sliced = data.slice(0, count);
    // Point 0 = current value (appears in both series so lines connect)
    // Points 1+ = projected only
    return sliced.map((d, i) => ({
      month: d.month,
      current: i === 0 ? d.value : null,
      projected: i >= 0 ? d.value : null,
    }));
  }, [data, range]);

  if (!data.length) return null;

  const todayMonth = chartData[0]?.month;
  const todayValue = chartData[0]?.projected;

  return (
    <div>
      {/* Date range selector */}
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
            <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D9762F" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#D9762F" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
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
          {/* Vertical "Today" reference line */}
          <ReferenceLine
            x={todayMonth}
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="3 3"
            label={{
              value: "Today",
              position: "insideTopRight",
              fill: "rgba(255,255,255,0.4)",
              fontSize: 10,
              offset: 4,
            }}
          />
          {/* Projected: dashed line, faint fill */}
          <Area
            type="monotone"
            dataKey="projected"
            stroke="#D9762F"
            strokeWidth={2}
            strokeDasharray="6 4"
            fill="url(#projectedGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#D9762F", strokeWidth: 0 }}
            connectNulls
          />
          {/* Today dot: solid orange marker */}
          {todayValue != null && (
            <ReferenceDot
              x={todayMonth}
              y={todayValue}
              r={6}
              fill="#D9762F"
              stroke="#1A1A1A"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
