"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

function fmtValue(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

export function SaleyardComparisonChart({ data }: { data: { name: string; portfolioValue: number }[] }) {
  // Calculate domain to zoom into the range where differences are visible
  const values = data.map((d) => d.portfolioValue);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;
  // Start axis at 80% of the minimum value (or min - 2x the range) to amplify differences
  const domainMin = Math.max(0, Math.floor((minVal - range * 0.5) / 10000) * 10000);

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <YAxis type="category" dataKey="name" hide />
          <XAxis
            type="number"
            domain={[domainMin, "auto"]}
            tick={{ fontSize: 10, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value) => [fmtValue(value as number), "Portfolio Value"]}
            contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
            labelStyle={{ color: "#fff" }}
          />
          <Bar dataKey="portfolioValue" radius={[999, 999, 999, 999]} barSize={22} name="Portfolio Value">
            {data.map((_, i) => (
              <Cell key={i} fill="#FFAA00" fillOpacity={i === 0 ? 1 : 0.4} />
            ))}
            <LabelList
              dataKey="name"
              position="insideLeft"
              offset={24}
              style={{ fontSize: 10, fontWeight: 600, fill: "#fff" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
