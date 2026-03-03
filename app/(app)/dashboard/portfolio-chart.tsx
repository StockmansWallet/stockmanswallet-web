"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  month: string;
  value: number;
}

interface PortfolioChartProps {
  data: DataPoint[];
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
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#1A1A1A] px-3 py-2 text-xs shadow-lg ring-1 ring-white/10">
      <p className="text-text-muted">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-white">
        ${payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D9762F" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#D9762F" stopOpacity={0.02} />
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
        <Area
          type="monotone"
          dataKey="value"
          stroke="#D9762F"
          strokeWidth={2.5}
          fill="url(#valueGrad)"
          dot={false}
          activeDot={{ r: 5, fill: "#D9762F", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
