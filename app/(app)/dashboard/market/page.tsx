import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity, TrendingUp, ArrowRight, Zap } from "lucide-react";
import {
  getCategorySummaries,
  getTopMovers,
  getHerdExposure,
  getYearOverYearMonthly,
  getCategoryTimelineWeekly,
  AU_STATES,
  formatAUDate,
} from "./_data";
import { StateFilter } from "./_components/state-filter";
import { CategoryTile } from "./_components/category-tile";
import { MoversStrip } from "./_components/movers-strip";
import { WhatIfWidget } from "./_components/what-if-widget";
import { MarketOverviewCard } from "./_components/market-overview-card";

export const revalidate = 0;
export const metadata = { title: "Market" };

type Props = {
  searchParams: Promise<{ state?: string }>;
};

export default async function MarketPage({ searchParams }: Props) {
  const params = await searchParams;
  const stateFilter = AU_STATES.includes(params.state as typeof AU_STATES[number])
    ? (params.state as string)
    : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [summaries, movers7, movers30, exposure, yoySeries, timelineData] = await Promise.all([
    getCategorySummaries(stateFilter),
    getTopMovers(7, stateFilter),
    getTopMovers(30, stateFilter),
    user ? getHerdExposure(user.id) : Promise.resolve([]),
    getYearOverYearMonthly({ state: stateFilter, years: 3 }),
    getCategoryTimelineWeekly({ state: stateFilter, years: 2 }),
  ]);

  const exposureByCat = new Map(exposure.map((e) => [e.category, e]));
  const latestDate = summaries[0]?.latest_date ?? null;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Market"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Live livestock market intelligence and price indicators."
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <StateFilter />
        {latestDate && (
          <p className="text-xs text-text-muted">
            Latest sale data as of {formatAUDate(latestDate)}
          </p>
        )}
      </div>

      {summaries.length === 0 ? (
        <Card>
          <EmptyState
            title="No market data available"
            description="Market data will appear once the MLA scraper has run for the selected region."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Market overview (seasonal YoY + category timeline toggle) */}
          <MarketOverviewCard
            yoySeries={yoySeries}
            timelineData={timelineData}
            stateFilter={stateFilter}
          />

          {/* Top Movers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SectionIcon icon={Zap} />
                  <CardTitle>Top Movers</CardTitle>
                </div>
                <span className="text-[11px] text-text-muted">Categories and saleyards, biggest week-on-week change</span>
              </div>
            </CardHeader>
            <CardContent>
              <MoversStrip gainers={movers7.gainers} losers={movers7.losers} windowLabel="7 days" />
              <div className="mt-5 border-t border-white/[0.04] pt-5">
                <MoversStrip gainers={movers30.gainers} losers={movers30.losers} windowLabel="30 days" />
              </div>
            </CardContent>
          </Card>

          {/* Category tiles */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SectionIcon icon={TrendingUp} />
                  <CardTitle>Categories</CardTitle>
                </div>
                <Link href="/dashboard/market/indicators" className="text-xs font-medium text-brand hover:underline">
                  Detailed view <ArrowRight className="ml-0.5 inline h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {summaries.map((s) => (
                <CategoryTile key={s.slug} summary={s} exposure={exposureByCat.get(s.category)} />
              ))}
            </CardContent>
          </Card>

          {/* What-if */}
          <WhatIfWidget summaries={summaries} />

          {/* Saleyards shortcut */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SectionIcon icon={Activity} />
                  <CardTitle>Market Pulse</CardTitle>
                </div>
                <Link href="/dashboard/market/pulse" className="text-xs font-medium text-brand hover:underline">
                  Browse saleyards <ArrowRight className="ml-0.5 inline h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">
                Drill into physical saleyard prices with per-category history, top yards, and exportable data.
              </p>
            </CardContent>
          </Card>

          {/* Your exposure */}
          {exposure.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your portfolio exposure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {exposure.map((e) => (
                    <Link
                      key={e.category}
                      href={`/dashboard/market/category/${e.slug}`}
                      className="inline-flex items-center gap-2 rounded-full bg-advisor/10 px-3 py-1.5 text-xs text-advisor ring-1 ring-advisor/20 transition-colors hover:bg-advisor/15"
                    >
                      <span className="font-medium">{e.category}</span>
                      <span className="text-advisor/70 tabular-nums">
                        {e.head_count} hd - {e.herd_count} herd{e.herd_count === 1 ? "" : "s"}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
      <Icon className="h-3.5 w-3.5 text-brand" />
    </div>
  );
}
