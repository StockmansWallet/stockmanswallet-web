"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";

function fmtValue(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

export function SaleyardComparisonChart({ data }: { data: { name: string; portfolioValue: number }[] }) {
  // Zoom into the range where differences are visible
  const values = data.map((d) => d.portfolioValue);
  const minVal = Math.min(...values);
  const range = Math.max(...values) - minVal;
  const domainMin = Math.max(0, Math.floor((minVal - range * 0.5) / 10000) * 10000);

  // Graduated opacity: 1.0 for #1, tapering to 0.35 for #10
  const opacityFor = (i: number) => i === 0 ? 1 : Math.max(0.35, 0.7 - (i - 1) * 0.04);

  // Add formatted value and per-row text colours
  const displayData = data.map((d, i) => ({
    ...d,
    valueLabel: fmtValue(d.portfolioValue),
    nameColor: i === 0 ? "#271F16" : "#fff",
    valueColor: i === 0 ? "rgba(39,31,22,0.7)" : "rgba(255,255,255,0.85)",
  }));

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <YAxis type="category" dataKey="name" hide />
          <XAxis
            type="number"
            domain={[domainMin, "auto"]}
            tick={{ fontSize: 10, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Bar
            dataKey="portfolioValue"
            radius={[999, 999, 999, 999]}
            barSize={22}
            name="Portfolio Value"
            activeBar={{ fill: "#FFAA00", fillOpacity: 1 }}
          >
            {displayData.map((_, i) => (
              <Cell key={i} fill="#FFAA00" fillOpacity={opacityFor(i)} />
            ))}
            <LabelList
              dataKey="name"
              position="insideLeft"
              offset={24}
              content={({ x, y, width: _w, height, value, index }) => {
                const color = displayData[index ?? 0]?.nameColor ?? "#fff";
                return (
                  <text x={(x as number) + 24} y={(y as number) + (height as number) / 2} fill={color} fontSize={10} fontWeight={600} dominantBaseline="central">
                    {value}
                  </text>
                );
              }}
            />
            <LabelList
              dataKey="valueLabel"
              position="insideRight"
              offset={16}
              content={({ x, y, width, height, value, index }) => {
                const color = displayData[index ?? 0]?.valueColor ?? "rgba(255,255,255,0.85)";
                return (
                  <text x={(x as number) + (width as number) - 16} y={(y as number) + (height as number) / 2} fill={color} fontSize={9} fontWeight={500} dominantBaseline="central" textAnchor="end">
                    {value}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
