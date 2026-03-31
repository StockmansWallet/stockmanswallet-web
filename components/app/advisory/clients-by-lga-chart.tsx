"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLOURS = [
  "#34D399", "#60A5FA", "#F472B6", "#A78BFA", "#FBBF24",
  "#F87171", "#2DD4BF", "#818CF8", "#FB923C", "#E879F9",
];

interface LgaData {
  name: string;
  count: number;
  percentage: number;
}

export function ClientsByLgaChart({ data, total }: { data: LgaData[]; total: number }) {
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
      {/* Donut chart with total in centre */}
      <div className="relative mx-auto h-44 w-44 shrink-0 sm:mx-0">
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
                <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
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
        {/* Centre label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold tabular-nums text-text-primary">{total}</p>
          <p className="text-[10px] text-text-muted">clients</p>
        </div>
      </div>

      {/* Legend with count + percentage */}
      <div className="flex flex-1 flex-col gap-2.5">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-2.5 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLOURS[i % COLOURS.length] }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-text-secondary">{item.name}</p>
              <p className="tabular-nums text-[10px] text-text-muted">
                {item.count} client{item.count === 1 ? "" : "s"}
              </p>
            </div>
            <span className="w-10 text-right tabular-nums font-medium text-text-primary">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
