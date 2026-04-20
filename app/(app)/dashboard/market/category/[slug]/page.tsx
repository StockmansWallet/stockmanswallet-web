import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, Calendar, MapPin, ArrowRight } from "lucide-react";
import {
  resolveSlug,
  getCategorySeries,
  getSeasonalityMatrix,
  getHerdExposure,
  AU_STATES,
  daysAgo,
  slugify,
  formatAUDate,
  type WeeklyPoint,
} from "../../_data";
import { CategoryChart } from "../../_components/category-chart";
import { SeasonalityHeatmap } from "../../_components/seasonality-heatmap";
import { ChangeChip } from "../../_components/change-chip";
import { CsvExportButton } from "../../_components/csv-export-button";
import { StateFilter } from "../../_components/state-filter";
import { BackLink } from "../../_components/back-link";
import { AskBrangusButton } from "../../_components/ask-brangus-button";

export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ state?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = await resolveSlug("category", slug);
  return { title: category ? `${category} - Market` : "Category" };
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await resolveSlug("category", slug);
  if (!category) notFound();

  const stateFilter = AU_STATES.includes(sp.state as typeof AU_STATES[number])
    ? (sp.state as string)
    : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2y of history for band, full series for display
  const [series, historical, seasonality, exposureAll, topYardsRaw] = await Promise.all([
    getCategorySeries({ category, state: stateFilter }),
    getCategorySeries({ category, state: stateFilter, startDate: daysAgo(365 * 6) }),
    getSeasonalityMatrix({ category, state: stateFilter, years: 5 }),
    user ? getHerdExposure(user.id) : Promise.resolve([]),
    (async () => {
      let q = supabase
        .from("category_prices")
        .select("saleyard, state, final_price_per_kg, data_date")
        .eq("category", category)
        .gte("data_date", daysAgo(21));
      if (stateFilter) q = q.eq("state", stateFilter);
      const { data } = await q.limit(5000);
      return data ?? [];
    })(),
  ]);

  const exposure = exposureAll.find((e) => e.category === category);

  // Top yards: latest date, averaged per yard
  type YardRow = { saleyard: string; state: string; final_price_per_kg: number; data_date: string };
  const latestDateTop = (topYardsRaw as YardRow[])
    .map((r) => r.data_date)
    .sort()
    .pop();
  const topYardsMap = new Map<string, { total: number; count: number; state: string }>();
  for (const r of topYardsRaw as YardRow[]) {
    if (r.data_date !== latestDateTop) continue;
    const g = topYardsMap.get(r.saleyard) ?? { total: 0, count: 0, state: r.state };
    g.total += r.final_price_per_kg;
    g.count += 1;
    topYardsMap.set(r.saleyard, g);
  }
  const topYards = Array.from(topYardsMap.entries())
    .map(([saleyard, g]) => ({
      saleyard,
      state: g.state,
      avg_price: g.total / g.count / 100,
      sales: g.count,
    }))
    .sort((a, b) => b.avg_price - a.avg_price)
    .slice(0, 10);

  const latest = series[series.length - 1] ?? null;
  const seriesMap = new Map(series.map((s) => [s.week_date, s]));
  const pickPct = (weeksBack: number) => {
    if (!latest) return null;
    const idx = series.length - 1 - weeksBack;
    const target = series[idx];
    if (!target || target.avg_price === 0) return null;
    return ((latest.avg_price - target.avg_price) / target.avg_price) * 100;
  };

  // All-time stats
  let allTimeHigh: WeeklyPoint | null = null;
  let allTimeLow: WeeklyPoint | null = null;
  for (const p of series) {
    if (!allTimeHigh || p.avg_price > allTimeHigh.avg_price) allTimeHigh = p;
    if (!allTimeLow || p.avg_price < allTimeLow.avg_price) allTimeLow = p;
  }

  // CSV rows
  const csvRows = series.map((p) => ({
    week_date: p.week_date,
    category,
    state: stateFilter ?? "All AU",
    avg_price_per_kg: p.avg_price.toFixed(2),
    saleyard_count: p.saleyards,
    sales: p.sales,
  }));

  // Build a natural-language prefill for the Ask Brangus button.
  // Uses the same metrics already on screen, phrased like a user's question.
  const brangusPrefill = (() => {
    if (!latest) return null;
    const scope = stateFilter ? `${category} in ${stateFilter}` : `${category} across the country`;
    const parts: string[] = [];
    parts.push(`Mate, ${scope} is sitting at $${latest.avg_price.toFixed(2)}/kg as of ${formatAUDate(latest.week_date)}.`);

    const pct4w = pickPct(4);
    const pct12w = pickPct(12);
    const pct52w = pickPct(52);
    const changeBits: string[] = [];
    if (pct4w !== null) {
      changeBits.push(`${pct4w >= 0 ? "up" : "down"} ${Math.abs(pct4w).toFixed(1)}% over the past month`);
    }
    if (pct12w !== null) {
      changeBits.push(`${pct12w >= 0 ? "up" : "down"} ${Math.abs(pct12w).toFixed(1)}% over 12 weeks`);
    }
    if (pct52w !== null) {
      changeBits.push(`${pct52w >= 0 ? "up" : "down"} ${Math.abs(pct52w).toFixed(1)}% year-on-year`);
    }
    if (changeBits.length > 0) {
      parts.push(`It's ${changeBits.join(", ")}.`);
    }

    if (allTimeHigh && allTimeLow) {
      parts.push(`All-time high was $${allTimeHigh.avg_price.toFixed(2)} back in ${formatAUDate(allTimeHigh.week_date)}, low $${allTimeLow.avg_price.toFixed(2)} on ${formatAUDate(allTimeLow.week_date)}.`);
    }

    if (exposure) {
      parts.push(`I've got ${exposure.head_count} head in this category across ${exposure.herd_count} herd${exposure.herd_count === 1 ? "" : "s"}.`);
    }

    parts.push("What's driving this? Worth selling now or is there more upside to wait for?");
    return parts.join(" ");
  })();

  return (
    <div className="max-w-4xl">
      <BackLink href="/dashboard/market" />
      <PageHeader feature="markets"
        title={category}
        subtitle={`Weighted saleyard average for ${category.toLowerCase()}${stateFilter ? ` in ${stateFilter}` : ""}.`}
        actions={
          <div className="flex items-center gap-2">
            {brangusPrefill && <AskBrangusButton prefill={brangusPrefill} />}
            <CsvExportButton rows={csvRows} filename={`market-${slug}${stateFilter ? `-${stateFilter.toLowerCase()}` : ""}.csv`} />
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <StateFilter />
      </div>

      {series.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-text-muted">
            No price data for this category{stateFilter ? ` in ${stateFilter}` : ""}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Stats strip */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBlock label="Latest" value={latest ? `$${latest.avg_price.toFixed(2)}` : "-"} sub={latest ? `/kg - ${formatAUDate(latest.week_date)}` : ""} />
            <StatBlock label="4-week change" chip={<ChangeChip value={pickPct(4)} size="sm" />} sub="vs 4 weeks ago" />
            <StatBlock label="All-time high" value={allTimeHigh ? `$${allTimeHigh.avg_price.toFixed(2)}` : "-"} sub={allTimeHigh ? formatAUDate(allTimeHigh.week_date) : ""} />
            <StatBlock label="All-time low" value={allTimeLow ? `$${allTimeLow.avg_price.toFixed(2)}` : "-"} sub={allTimeLow ? formatAUDate(allTimeLow.week_date) : ""} />
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-markets/15">
                    <TrendingUp className="h-3.5 w-3.5 text-markets" />
                  </div>
                  <CardTitle>Price history</CardTitle>
                </div>
                <span className="text-[11px] text-text-muted">
                  Grey band: 5-year seasonal range (10th-90th percentile)
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <CategoryChart
                series={series}
                historicalSeries={historical}
                showSeasonalBand
                defaultRange={{ key: "1Y" }}
              />
              {exposure && (
                <p className="mt-3 rounded-lg bg-advisor/10 px-3 py-2 text-xs text-advisor">
                  Your portfolio: {exposure.head_count} head across {exposure.herd_count} herd{exposure.herd_count === 1 ? "" : "s"} in this category
                  {exposure.avg_weight > 0 ? ` (avg ${Math.round(exposure.avg_weight)} kg/hd)` : ""}.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Seasonality */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-markets/15">
                  <Calendar className="h-3.5 w-3.5 text-markets" />
                </div>
                <CardTitle>Seasonality</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <SeasonalityHeatmap years={seasonality.years} cells={seasonality.cells} />
              <p className="mt-3 text-[11px] text-text-muted">
                Monthly averages by year. Darker = higher price.
              </p>
            </CardContent>
          </Card>

          {/* Top yards */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-markets/15">
                    <MapPin className="h-3.5 w-3.5 text-markets" />
                  </div>
                  <CardTitle>Top saleyards</CardTitle>
                </div>
                <span className="text-[11px] text-text-muted">Latest sale, ranked by avg price</span>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {topYards.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-text-muted">No saleyard data available.</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {topYards.map((y) => (
                    <Link
                      key={y.saleyard}
                      href={`/dashboard/market/saleyard/${slugify(y.saleyard)}`}
                      className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{y.saleyard}</p>
                        <p className="text-[11px] text-text-muted">{y.state}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <p className="text-sm font-semibold tabular-nums text-text-primary">
                          ${y.avg_price.toFixed(2)}<span className="ml-1 text-xs font-normal text-text-muted">/kg</span>
                        </p>
                        <ArrowRight className="h-4 w-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-[11px] text-text-muted">
            {seriesMap.size} weekly observations since {formatAUDate(series[0].week_date)}.
          </p>
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value, chip, sub }: { label: string; value?: string; chip?: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-surface-lowest p-4 backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-1">
        {value ? (
          <p className="text-xl font-semibold tabular-nums text-text-primary">{value}</p>
        ) : (
          chip
        )}
      </div>
      {sub && <p className="mt-0.5 text-[11px] text-text-muted">{sub}</p>}
    </div>
  );
}
