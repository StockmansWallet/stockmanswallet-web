import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, ArrowRight } from "lucide-react";
import {
  getCategorySummaries,
  AU_STATES,
  formatAUDate,
} from "../_data";
import { StateFilter } from "../_components/state-filter";
import { Sparkline } from "../_components/sparkline";
import { ChangeChip } from "../_components/change-chip";
import { BackLink } from "../_components/back-link";

export const revalidate = 0;
export const metadata = { title: "National Categories" };

type Props = {
  searchParams: Promise<{ state?: string }>;
};

export default async function IndicatorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const stateFilter = AU_STATES.includes(params.state as typeof AU_STATES[number])
    ? (params.state as string)
    : undefined;

  const summaries = await getCategorySummaries(stateFilter);
  const latestDate = summaries[0]?.latest_date ?? null;

  return (
    <div className="w-full max-w-[1680px]">
      <BackLink href="/dashboard/market" />
      <PageHeader feature="markets"
        title="National Categories"
        subtitle="Weighted saleyard averages by MLA category, with change over 1, 4, 12, and 52 weeks."
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <StateFilter />
        {latestDate && (
          <p className="text-xs text-text-muted">as of {formatAUDate(latestDate)}</p>
        )}
      </div>

      {summaries.length === 0 ? (
        <Card>
          <EmptyState
            title="No category data available"
            description="Data will appear once saleyard reports have been ingested for the selected region."
          />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-markets/15">
                <TrendingUp className="h-3.5 w-3.5 text-markets" />
              </div>
              <CardTitle>Categories</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="hidden grid-cols-[1.5fr_0.9fr_1.3fr_1.6fr_auto] gap-3 px-5 pb-2 text-[11px] font-medium uppercase tracking-wider text-text-muted md:grid">
              <span>Category</span>
              <span className="text-right">Latest</span>
              <span>12w trend</span>
              <span>Change</span>
              <span />
            </div>
            <div className="divide-y divide-white/[0.04]">
              {summaries.map((s) => (
                <Link
                  key={s.slug}
                  href={`/dashboard/market/category/${s.slug}`}
                  className="group grid grid-cols-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02] md:grid-cols-[1.5fr_0.9fr_1.3fr_1.6fr_auto]"
                >
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{s.category}</p>
                    <p className="text-[11px] text-text-muted">
                      {s.saleyard_count} saleyards
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-text-primary md:text-right">
                    ${s.latest_price.toFixed(2)}
                    <span className="ml-1 text-xs font-normal text-text-muted">/kg</span>
                  </p>
                  <div>
                    <Sparkline points={s.sparkline} width={140} height={32} positive={(s.change_12w_pct ?? 0) >= 0} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <ChangeChip label="1w" value={s.change_1w_pct} />
                    <ChangeChip label="4w" value={s.change_4w_pct} />
                    <ChangeChip label="12w" value={s.change_12w_pct} />
                    <ChangeChip label="1y" value={s.change_52w_pct} />
                  </div>
                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-text-muted transition-opacity group-hover:opacity-100 md:block md:opacity-0" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
