"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

export function SalesRevenueChart({ data }: { data: { month: string; value: number }[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value as number), "Revenue"]}
            contentStyle={{ background: "var(--color-chart-tooltip-bg)", border: "1px solid var(--color-chart-tooltip-border)", borderRadius: "8px", fontSize: "12px" }}
            labelStyle={{ color: "var(--color-text-primary)" }}
            itemStyle={{ color: "var(--color-reports)" }}
          />
          <Bar dataKey="value" fill="var(--color-reports)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
