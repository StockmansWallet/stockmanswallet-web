import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity, ArrowRight } from "lucide-react";
import { AU_STATES, getSaleyardSummaries, formatAUDate } from "../_data";
import { StateFilter } from "../_components/state-filter";
import { ChangeChip } from "../_components/change-chip";
import { BackLink } from "../_components/back-link";

export const revalidate = 0;
export const metadata = { title: "Market Pulse" };

type Props = {
  searchParams: Promise<{ state?: string }>;
};

export default async function MarketPulsePage({ searchParams }: Props) {
  const params = await searchParams;
  const stateFilter = AU_STATES.includes(params.state as typeof AU_STATES[number])
    ? (params.state as string)
    : undefined;

  const saleyards = await getSaleyardSummaries(stateFilter);
  const latestDate = saleyards[0]?.latest_date ?? null;

  // Group by state for navigation
  const byState = new Map<string, typeof saleyards>();
  for (const y of saleyards) {
    const arr = byState.get(y.state) ?? [];
    arr.push(y);
    byState.set(y.state, arr);
  }
  const states = Array.from(byState.keys()).sort();

  return (
    <div className="max-w-4xl">
      <BackLink href="/dashboard/market" />
      <PageHeader
        title="Market Pulse"
        subtitle="Physical saleyard prices with 1-week and 4-week deltas. Click a saleyard for its full history."
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <StateFilter />
        {latestDate && (
          <p className="text-xs text-text-muted">Latest sale data from {formatAUDate(latestDate)}.</p>
        )}
      </div>

      {saleyards.length === 0 ? (
        <Card>
          <EmptyState
            title="No saleyard data available"
            description="Physical saleyard prices will appear here once data is available for the selected region."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {states.map((st) => {
            const rows = byState.get(st)!;
            return (
              <Card key={st}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                        <Activity className="h-3.5 w-3.5 text-brand" />
                      </div>
                      <CardTitle>{st}</CardTitle>
                    </div>
                    <span className="text-[11px] text-text-muted">{rows.length} saleyards</span>
                  </div>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="hidden grid-cols-[2fr_0.8fr_1.4fr_auto] gap-3 px-5 pb-2 text-[11px] font-medium uppercase tracking-wider text-text-muted md:grid">
                    <span>Saleyard</span>
                    <span className="text-right">Latest</span>
                    <span>Change</span>
                    <span />
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {rows.map((row) => (
                      <Link
                        key={row.saleyard}
                        href={`/dashboard/market/saleyard/${row.slug}`}
                        className="group grid grid-cols-1 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02] md:grid-cols-[2fr_0.8fr_1.4fr_auto]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">{row.saleyard}</p>
                          <p className="text-[11px] text-text-muted tabular-nums">
                            {row.sales} sales
                          </p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums text-text-primary md:text-right">
                          ${row.latest_avg.toFixed(2)}
                          <span className="ml-1 text-xs font-normal text-text-muted">/kg</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <ChangeChip label="1w" value={row.change_1w_pct} />
                          <ChangeChip label="4w" value={row.change_4w_pct} />
                        </div>
                        <ArrowRight className="hidden h-4 w-4 shrink-0 text-text-muted transition-opacity group-hover:opacity-100 md:block md:opacity-0" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
