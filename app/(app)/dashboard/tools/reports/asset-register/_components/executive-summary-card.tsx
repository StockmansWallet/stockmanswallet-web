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
        <p className="text-text-muted text-[10px] font-semibold tracking-widest uppercase">
          Executive Summary
        </p>
        <p className="text-reports mt-1 text-3xl font-bold tracking-tight tabular-nums">
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
              <p className="text-text-muted text-[10px] font-semibold tracking-widest uppercase">
                Report Period
              </p>
              <p className="text-text-secondary mt-0.5 text-sm font-medium tabular-nums">
                {fmtDate(periodStart)}
              </p>
              <p className="text-text-secondary text-sm font-medium tabular-nums">
                {fmtDate(periodEnd)}
              </p>
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
      <p className="text-text-muted text-[10px] font-semibold tracking-widest uppercase">{label}</p>
      <p
        className={`mt-0.5 tabular-nums ${small ? "text-text-secondary text-sm font-medium" : "text-text-primary text-lg font-semibold"}`}
      >
        {value}
      </p>
    </div>
  );
}
