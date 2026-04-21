"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";

function fmtValue(v: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(v);
}

export function PropertyComparisonChart({
  data,
}: {
  data: { name: string; totalValue: number; headCount: number }[];
}) {
  const values = data.map((d) => d.totalValue);
  const minVal = Math.min(...values);
  const range = Math.max(...values) - minVal;
  const domainMin = Math.max(0, Math.floor((minVal - range * 0.5) / 10000) * 10000);

  const opacityFor = (i: number) => (i === 0 ? 1 : Math.max(0.5, 0.75 - (i - 1) * 0.04));

  const displayData = data.map((d) => ({
    ...d,
    valueLabel: `${fmtValue(d.totalValue)} | ${d.headCount.toLocaleString("en-AU")} hd`,
  }));

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={displayData}
          layout="vertical"
          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
        >
          <YAxis type="category" dataKey="name" hide />
          <XAxis type="number" domain={[domainMin, "auto"]} hide />
          <Bar
            dataKey="totalValue"
            radius={[999, 999, 999, 999]}
            barSize={22}
            name="Total Value"
            activeBar={{ fill: "var(--color-reports)", fillOpacity: 1 }}
          >
            {displayData.map((_, i) => (
              <Cell key={i} fill="var(--color-reports)" fillOpacity={opacityFor(i)} />
            ))}
            <LabelList
              dataKey="name"
              position="insideLeft"
              offset={24}
              content={({ x, y, height, value }) => (
                <text
                  x={(x as number) + 24}
                  y={(y as number) + (height as number) / 2}
                  fill="var(--color-bg-card-1)"
                  fontSize={10}
                  fontWeight={600}
                  dominantBaseline="central"
                >
                  {value}
                </text>
              )}
            />
            <LabelList
              dataKey="valueLabel"
              position="insideRight"
              offset={16}
              content={({ x, y, width, height, value }) => (
                <text
                  x={(x as number) + (width as number) - 16}
                  y={(y as number) + (height as number) / 2}
                  fill="var(--color-bg-card-1)"
                  fontSize={9}
                  fontWeight={600}
                  dominantBaseline="central"
                  textAnchor="end"
                >
                  {value}
                </text>
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
