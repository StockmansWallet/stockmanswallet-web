import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { Mover } from "../_constants";

interface MoversStripProps {
  gainers: Mover[];
  losers: Mover[];
  windowLabel: string;
}

function Row({ mover }: { mover: Mover }) {
  const positive = mover.change_pct >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <Link
      href={mover.href}
      className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5 transition-colors hover:bg-surface-raised"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{mover.name}</p>
        <p className="text-[11px] text-text-muted">
          {mover.subtitle ? `${mover.subtitle} - ` : ""}${mover.latest_price.toFixed(2)}/kg
        </p>
      </div>
      <div className={`inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold tabular-nums ${positive ? "text-success" : "text-error"}`}>
        <Icon className="h-3.5 w-3.5" />
        {positive ? "+" : ""}{mover.change_pct.toFixed(1)}%
      </div>
    </Link>
  );
}

export function MoversStrip({ gainers, losers, windowLabel }: MoversStripProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-success/90">Top gainers</h3>
          <span className="text-[11px] text-text-muted">{windowLabel}</span>
        </div>
        <div className="space-y-1.5">
          {gainers.length === 0 ? (
            <p className="rounded-xl bg-surface px-3 py-4 text-center text-xs text-text-muted">
              Not enough data.
            </p>
          ) : (
            gainers.map((m, i) => <Row key={`${m.kind}-${m.slug}-${i}`} mover={m} />)
          )}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-error/90">Top losers</h3>
          <span className="text-[11px] text-text-muted">{windowLabel}</span>
        </div>
        <div className="space-y-1.5">
          {losers.length === 0 ? (
            <p className="rounded-xl bg-surface px-3 py-4 text-center text-xs text-text-muted">
              Not enough data.
            </p>
          ) : (
            losers.map((m, i) => <Row key={`${m.kind}-${m.slug}-${i}`} mover={m} />)
          )}
        </div>
      </div>
    </div>
  );
}
