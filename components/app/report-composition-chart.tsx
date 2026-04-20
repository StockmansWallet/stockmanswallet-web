"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import type { HerdCompositionItem } from "@/lib/types/reports";

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
  "var(--color-chart-7)",
  "var(--color-chart-8)",
  "var(--color-orange-light)",
  "var(--color-sky-light)",
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(v);
}

export function ReportCompositionChart({ data }: { data: HerdCompositionItem[] }) {
  if (data.length === 0) return null;

  return (
    <div className="flex items-center gap-5">
      <div className="shrink-0">
        <PieChart width={112} height={112}>
          <Pie
            data={data}
            cx={56}
            cy={56}
            innerRadius={28}
            outerRadius={50}
            dataKey="value"
            nameKey="assetClass"
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(value as number)}
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
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        {data.map((item, i) => (
          <div key={item.assetClass} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-text-secondary min-w-0 flex-1">{item.assetClass}</span>
            <span className="text-text-muted tabular-nums">{item.headCount} head</span>
            <span className="text-text-primary w-12 text-right font-semibold tabular-nums">
              {item.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
