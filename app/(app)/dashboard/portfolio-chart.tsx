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
  historic: number | null;
  projected: number | null;
}

interface PortfolioChartProps {
  data: DataPoint[];
  todayIndex: number;
}

type DateRange = "1M" | "3M" | "6M" | "1Y" | "All";

const DATE_RANGES: DateRange[] = ["1M", "3M", "6M", "1Y", "All"];

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
  const historicEntry = payload.find((p) => p.dataKey === "historic" && p.value != null);
  const projectedEntry = payload.find((p) => p.dataKey === "projected" && p.value != null);
  const entry = historicEntry ?? projectedEntry;
  if (!entry || entry.value == null) return null;

  // At the today point both series have values; show "Today" badge
  const isTodayPoint = historicEntry != null && projectedEntry != null;
  const isProjected = !historicEntry && projectedEntry != null;

  return (
    <div className="rounded-lg bg-[#1A1A1A] px-3 py-2 text-xs shadow-lg ring-1 ring-white/10">
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">{label}</span>
        {isTodayPoint ? (
          <span className="rounded bg-brand/20 px-1 py-0.5 text-[9px] font-medium text-brand">
            Today
          </span>
        ) : isProjected ? (
          <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-medium text-text-muted">
            Projected
          </span>
        ) : (
          <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-medium text-text-muted">
            Actual
          </span>
        )}
      </div>
      <p className="mt-0.5 font-semibold tabular-nums text-white">
        ${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

export function PortfolioChart({ data, todayIndex }: PortfolioChartProps) {
  const [range, setRange] = useState<DateRange>("1Y");

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data.length) return [];

    // Apply range filter: keep all history, trim projection length
    const projectionMonths = (() => {
      switch (range) {
        case "1M": return 2;
        case "3M": return 4;
        case "6M": return 7;
        case "1Y": return 12;
        case "All": return data.length - todayIndex;
      }
    })();
    const endIndex = Math.min(todayIndex + projectionMonths, data.length);
    const sliced = data.slice(0, endIndex);

    // Split into two series at todayIndex
    // historic: values up to and including todayIndex (null after)
    // projected: null before todayIndex, values from todayIndex onward
    // Both share the todayIndex point so lines connect
    return sliced.map((d, i) => ({
      month: d.month,
      historic: i <= todayIndex ? d.value : null,
      projected: i >= todayIndex ? d.value : null,
    }));
  }, [data, todayIndex, range]);

  if (!data.length) return null;

  const todayMonth = data[todayIndex]?.month;
  const todayValue = data[todayIndex]?.value;

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
            <linearGradient id="historicGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D9762F" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#D9762F" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D9762F" stopOpacity={0.10} />
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
          {/* Historic: solid line, full gradient */}
          <Area
            type="monotone"
            dataKey="historic"
            stroke="#D9762F"
            strokeWidth={2.5}
            fill="url(#historicGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#D9762F", strokeWidth: 0 }}
            connectNulls
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
