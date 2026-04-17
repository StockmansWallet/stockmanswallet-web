import { Card, CardContent } from "@/components/ui/card";
import type { ExecutiveSummary } from "@/lib/types/reports";
import { fmt, fmtDate } from "./format";

export function ExecutiveSummaryCard({
  summary,
  periodStart,
  periodEnd,
}: {
  summary: ExecutiveSummary;
  periodStart: string;
  periodEnd: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl">
      <div className="bg-white/[0.06] px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Executive Summary</p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-[#FFAA00]">
          {fmt(summary.totalPortfolioValue)}
        </p>
      </div>
      <Card className="rounded-t-none border-t-0">
        <CardContent className="px-5 py-3">
          <div className="grid grid-cols-4 gap-x-4">
            <SummaryStat label="Head Count" value={summary.totalHeadCount.toLocaleString()} />
            <SummaryStat label="Avg per Head" value={fmt(summary.averageValuePerHead)} />
            <SummaryStat label="Valuation Date" value={fmtDate(summary.valuationDate)} small />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Report Period</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums text-text-secondary">{fmtDate(periodStart)}</p>
              <p className="text-sm font-medium tabular-nums text-text-secondary">{fmtDate(periodEnd)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">{label}</p>
      <p className={`mt-0.5 tabular-nums ${small ? "text-sm font-medium text-text-secondary" : "text-lg font-semibold text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}
