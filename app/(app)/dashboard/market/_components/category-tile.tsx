import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CategorySummary, HerdExposure } from "../_constants";
import { Sparkline } from "./sparkline";
import { ChangeChip } from "./change-chip";

interface CategoryTileProps {
  summary: CategorySummary;
  exposure?: HerdExposure;
}

export function CategoryTile({ summary, exposure }: CategoryTileProps) {
  const positive = (summary.change_4w_pct ?? 0) >= 0;
  return (
    <Link
      href={`/dashboard/market/category/${summary.slug}`}
      className="group bg-surface-lowest hover:bg-surface block rounded-2xl p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-text-primary truncate text-sm font-semibold">{summary.category}</p>
          <p className="text-text-muted text-[11px]">
            {summary.saleyard_count} saleyards
            {exposure ? ` - ${exposure.head_count} hd in portfolio` : ""}
          </p>
        </div>
        <ArrowRight className="text-text-muted h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-text-primary text-2xl font-semibold tabular-nums">
            ${summary.latest_price.toFixed(2)}
            <span className="text-text-muted ml-1 text-sm font-normal">/kg</span>
          </p>
        </div>
        <Sparkline points={summary.sparkline} positive={positive} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <ChangeChip label="1w" value={summary.change_1w_pct} />
        <ChangeChip label="4w" value={summary.change_4w_pct} />
        <ChangeChip label="12w" value={summary.change_12w_pct} />
        <ChangeChip label="1y" value={summary.change_52w_pct} />
      </div>
    </Link>
  );
}
