"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CategoryValue {
  category: string;
  value: number;
  color: string;
}

interface PortfolioChartProps {
  data: CategoryValue[];
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategoryValue }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg bg-[#1A1A1A] px-3 py-2 text-xs shadow-lg ring-1 ring-white/10">
      <p className="font-medium text-white">{d.category}</p>
      <p className="mt-0.5 tabular-nums text-text-secondary">
        ${d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  if (!data.length) return null;

  const chartHeight = Math.max(200, data.length * 36 + 20);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
        barCategoryGap="20%"
      >
        <XAxis
          type="number"
          tickFormatter={formatCurrency}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="category"
          width={160}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((entry) => (
            <Cell key={entry.category} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
