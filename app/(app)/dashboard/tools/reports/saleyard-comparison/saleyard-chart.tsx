"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function SaleyardComparisonChart({ data }: { data: { name: string; avgPrice: number; minPrice: number; maxPrice: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v.toFixed(2)}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            formatter={(value, name) => [`$${(value as number).toFixed(2)}/kg`, name === "avgPrice" ? "Average" : name === "minPrice" ? "Min" : "Max"]}
            contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
            labelStyle={{ color: "#fff" }}
          />
          <Bar dataKey="avgPrice" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Average" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
