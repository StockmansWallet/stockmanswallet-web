import type { SeasonalityCell } from "../_constants";

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_FULL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface SeasonalityHeatmapProps {
  years: number[];
  cells: SeasonalityCell[];
}

export function SeasonalityHeatmap({ years, cells }: SeasonalityHeatmapProps) {
  if (years.length === 0 || cells.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-text-muted">No seasonality data available.</p>
    );
  }

  const byKey = new Map<string, SeasonalityCell>();
  for (const c of cells) byKey.set(`${c.year}-${c.month}`, c);

  const values = cells.map((c) => c.avg_price).filter((v): v is number => v != null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Gradient derived from the brand orange (#FF8000). t=0 is dim warm brown,
  // t=1 is saturated orange. No-data cells fall back to the lowest surface tint.
  const colorFor = (v: number | null) => {
    if (v == null) return "var(--color-surface-lowest)";
    const t = (v - min) / range;
    const r = Math.round(255 - (1 - t) * 80);
    const g = Math.round(128 + t * 40);
    const b = Math.round(t * 40);
    const alpha = 0.15 + t * 0.7;
    return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[460px]">
        <div className="grid grid-cols-[36px_repeat(12,minmax(0,1fr))] gap-1 pb-1.5 text-[10px] text-text-muted">
          <span />
          {MONTH_LABELS.map((m, i) => (
            <span key={i} className="text-center">{m}</span>
          ))}
        </div>
        <div className="space-y-1">
          {years.slice().reverse().map((year) => (
            <div key={year} className="grid grid-cols-[36px_repeat(12,minmax(0,1fr))] items-center gap-1">
              <span className="text-[11px] tabular-nums text-text-muted">{year}</span>
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const cell = byKey.get(`${year}-${month}`);
                return (
                  <div
                    key={month}
                    className="group relative h-7 rounded-md ring-1 ring-white/[0.03]"
                    style={{ backgroundColor: colorFor(cell?.avg_price ?? null) }}
                    title={cell?.avg_price != null ? `${MONTH_FULL[i]} ${year} -- $${cell.avg_price.toFixed(2)}/kg` : `${MONTH_FULL[i]} ${year} -- no data`}
                  >
                    {cell?.avg_price != null && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-white/90">
                        {cell.avg_price >= 10 ? cell.avg_price.toFixed(1) : cell.avg_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-text-muted">
          <span>Low</span>
          <div className="flex items-center gap-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <div
                key={i}
                className="h-3 w-5 rounded-sm"
                style={{ backgroundColor: colorFor(min + range * t) }}
              />
            ))}
          </div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
