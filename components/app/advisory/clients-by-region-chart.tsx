"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "var(--color-chart-4)", "var(--color-chart-3)", "var(--color-chart-2)", "var(--color-chart-5)",
  "var(--color-chart-7)", "var(--color-chart-6)", "var(--color-chart-1)", "var(--color-chart-8)",
  "var(--color-teal-light)", "var(--color-violet-light)",
];

interface RegionData {
  name: string;
  count: number;
  percentage: number;
}

export function ClientsByRegionChart({ data }: { data: RegionData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-text-muted">
          No client region data available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="mx-auto h-44 w-44 shrink-0 sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={78}
              dataKey="count"
              nameKey="name"
              stroke="none"
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value} client${value === 1 ? "" : "s"}`, ""]}
              contentStyle={{
                background: "var(--color-chart-tooltip-bg)",
                border: "1px solid var(--color-chart-tooltip-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "var(--color-text-primary)" }}
              itemStyle={{ color: "var(--color-text-secondary)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-2.5 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-text-secondary">
              {item.name}
            </span>
            <span className="tabular-nums text-text-muted">
              {item.count} client{item.count === 1 ? "" : "s"}
            </span>
            <span className="w-10 text-right tabular-nums font-medium text-text-primary">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
