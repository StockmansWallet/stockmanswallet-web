// Each herd category maps to one of the categorical chart tokens so the
// composition donut stays in sync with the wider palette.
export const categoryColours: Record<string, string> = {
  "Steer": "var(--color-chart-7)",
  "Heifer": "var(--color-chart-3)",
  "Breeder": "var(--color-chart-1)",
  "Dry Cow": "var(--color-chart-5)",
  "Bull": "var(--color-chart-2)",
};

export const fallbackColour = "var(--color-chart-neutral)";

interface HerdCompositionProps {
  herds: { category: string; head_count: number | null }[];
}

export function HerdComposition({ herds }: HerdCompositionProps) {
  // Group by category and sum head counts
  const grouped = herds.reduce(
    (acc, h) => {
      const cat = h.category ?? "Other";
      acc[cat] = (acc[cat] || 0) + (h.head_count ?? 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  const entries = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1]);

  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) return null;

  // Build donut segments
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = entries.map(([cat, count]) => {
    const pct = count / total;
    const length = pct * circumference;
    const gap = entries.length > 1 ? 2 : 0;
    const seg = { cat, count, pct, offset, length: Math.max(length - gap, 0.5), colour: categoryColours[cat] ?? fallbackColour };
    offset += length;
    return seg;
  });

  return (
    <div className="flex items-center gap-6">
      {/* Donut chart */}
      <div className="relative flex-shrink-0">
        <svg width="110" height="110" viewBox="0 0 100 100">
          {segments.map((seg) => (
            <circle
              key={seg.cat}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={seg.colour}
              strokeWidth="12"
              strokeDasharray={`${seg.length} ${circumference - seg.length}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-text-primary">{total.toLocaleString()}</span>
          <span className="text-[10px] text-text-muted">head</span>
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
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colour }}
                />
                <span className="text-text-secondary">{cat}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-text-primary tabular-nums">
                  {count.toLocaleString()} hd
                </span>
                <span className="w-12 text-right text-xs text-text-muted tabular-nums">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
