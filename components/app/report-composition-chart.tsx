"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { HerdCompositionItem } from "@/lib/types/reports";

const COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#a855f7",
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

export function ReportCompositionChart({ data }: { data: HerdCompositionItem[] }) {
  if (data.length === 0) return null;

  return (
    <div className="flex items-center gap-5">
      <div className="h-28 w-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={50}
              dataKey="value"
              nameKey="assetClass"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
              contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
              labelStyle={{ color: "#fff" }}
              itemStyle={{ color: "#d4d4d4" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        {data.map((item, i) => (
          <div key={item.assetClass} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="min-w-0 flex-1 text-text-secondary">{item.assetClass}</span>
            <span className="tabular-nums text-text-muted">{item.headCount} head</span>
            <span className="w-12 text-right tabular-nums font-semibold text-text-primary">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
