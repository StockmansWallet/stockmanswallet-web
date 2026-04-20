"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";

// Each herd category maps to one of the categorical chart tokens so the
// composition donut stays in sync with the wider palette.
export const categoryColours: Record<string, string> = {
  Steer: "var(--color-chart-7)",
  Heifer: "var(--color-chart-3)",
  Breeder: "var(--color-chart-1)",
  "Dry Cow": "var(--color-chart-5)",
  Bull: "var(--color-chart-2)",
};

export const fallbackColour = "var(--color-chart-neutral)";

interface HerdCompositionProps {
  herds: { category: string; head_count: number | null }[];
}

export function HerdComposition({ herds }: HerdCompositionProps) {
  const grouped = herds.reduce(
    (acc, h) => {
      const cat = h.category ?? "Other";
      acc[cat] = (acc[cat] || 0) + (h.head_count ?? 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) return null;

  const pieData = entries.map(([cat, count]) => ({
    name: cat,
    value: count,
    colour: categoryColours[cat] ?? fallbackColour,
  }));

  return (
    <div className="flex items-center gap-6">
      {/* Pie chart */}
      <div className="relative shrink-0" style={{ width: 112, height: 112 }}>
        <PieChart width={112} height={112}>
          <Pie
            data={pieData}
            cx={56}
            cy={56}
            innerRadius={36}
            outerRadius={55}
            dataKey="value"
            nameKey="name"
            stroke="none"
            isAnimationActive={false}
          >
            {pieData.map((d) => (
              <Cell key={d.name} fill={d.colour} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${Number(value).toLocaleString()} hd`, name]}
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-text-primary text-lg font-bold">{total.toLocaleString()}</span>
          <span className="text-text-muted text-[10px]">head</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        {entries.map(([cat, count]) => {
          const pct = ((count / total) * 100).toFixed(1);
          const colour = categoryColours[cat] ?? fallbackColour;
          return (
            <div key={cat} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: colour }}
                />
                <span className="text-text-secondary">{cat}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-text-primary font-medium tabular-nums">
                  {count.toLocaleString()} hd
                </span>
                <span className="text-text-muted w-12 text-right text-xs tabular-nums">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
