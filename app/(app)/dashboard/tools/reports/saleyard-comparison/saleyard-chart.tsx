"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";

function fmtValue(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

export function SaleyardComparisonChart({
  data,
}: {
  data: { name: string; portfolioValue: number; distanceKm: number | null }[];
}) {
  // Zoom into the range where differences are visible
  const values = data.map((d) => d.portfolioValue);
  const minVal = Math.min(...values);
  const range = Math.max(...values) - minVal;
  const domainMin = Math.max(0, Math.floor((minVal - range * 0.5) / 10000) * 10000);

  // Graduated opacity: 1.0 for #1, tapering to 0.35 for #10
  // Min opacity 0.5 so dark text stays readable on all bars
  const opacityFor = (i: number) => i === 0 ? 1 : Math.max(0.5, 0.75 - (i - 1) * 0.03);

  // Add formatted value (with km suffix when available) and per-row text colours
  const displayData = data.map((d) => ({
    ...d,
    valueLabel: d.distanceKm != null
      ? `${fmtValue(d.portfolioValue)} \u00b7 ${d.distanceKm.toLocaleString("en-AU")} km`
      : fmtValue(d.portfolioValue),
    nameColor: "#271F16",
    valueColor: "#271F16",
  }));

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <YAxis type="category" dataKey="name" hide />
          <XAxis type="number" domain={[domainMin, "auto"]} hide />
          <Bar
            dataKey="portfolioValue"
            radius={[999, 999, 999, 999]}
            barSize={22}
            name="Portfolio Value"
            activeBar={{ fill: "var(--color-reports)", fillOpacity: 1 }}
          >
            {displayData.map((_, i) => (
              <Cell key={i} fill="var(--color-reports)" fillOpacity={opacityFor(i)} />
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
                  <text x={(x as number) + (width as number) - 16} y={(y as number) + (height as number) / 2} fill={color} fontSize={9} fontWeight={600} dominantBaseline="central" textAnchor="end">
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
