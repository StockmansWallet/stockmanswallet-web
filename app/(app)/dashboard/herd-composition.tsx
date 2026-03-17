// Category → colour mapping (warm earth tones for 5 master categories)
export const categoryColours: Record<string, string> = {
  "Steer": "#F87171",
  "Heifer": "#7CA749",
  "Breeder": "#D9762F",
  "Dry Cow": "#8B5E3C",
  "Bull": "#60A5FA",
};

export const fallbackColour = "#6B7280";

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

  return (
    <div>
      {/* Stacked bar */}
      <div className="mb-5 flex h-3 overflow-hidden rounded-full">
        {entries.map(([cat, count]) => (
          <div
            key={cat}
            className="transition-all"
            style={{
              width: `${(count / total) * 100}%`,
              backgroundColor: categoryColours[cat] ?? fallbackColour,
            }}
          />
        ))}
      </div>

      {/* Category list */}
      <div className="space-y-2.5">
        {entries.map(([cat, count]) => {
          const pct = ((count / total) * 100).toFixed(1);
          const colour = categoryColours[cat] ?? fallbackColour;
          return (
            <div key={cat} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
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
