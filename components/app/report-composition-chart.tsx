"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { HerdCompositionItem } from "@/lib/types/reports";

const COLORS = [
  "var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)",
  "var(--color-chart-5)", "var(--color-chart-6)", "var(--color-chart-7)", "var(--color-chart-8)",
  "var(--color-orange-light)", "var(--color-sky-light)",
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
              contentStyle={{ background: "var(--color-chart-tooltip-bg)", border: "1px solid var(--color-chart-tooltip-border)", borderRadius: "8px", fontSize: "12px" }}
              labelStyle={{ color: "var(--color-text-primary)" }}
              itemStyle={{ color: "var(--color-text-secondary)" }}
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
