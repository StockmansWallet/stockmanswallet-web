"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#a855f7",
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
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#fff" }}
              itemStyle={{ color: "#d4d4d4" }}
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
