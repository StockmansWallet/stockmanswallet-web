import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, ArrowRight } from "lucide-react";
import {
  resolveSlug,
  getSaleyardSeries,
  slugify,
  formatAUDate,
  daysAgo,
  MLA_CATEGORIES,
  type WeeklyPoint,
} from "../../_data";
import { CategoryChart } from "../../_components/category-chart";
import { ChangeChip } from "../../_components/change-chip";
import { Sparkline } from "../../_components/sparkline";
import { CsvExportButton } from "../../_components/csv-export-button";
import { BackLink } from "../../_components/back-link";
import { AskBrangusButton } from "../../_components/ask-brangus-button";

export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const saleyard = await resolveSlug("saleyard", slug);
  return { title: saleyard ? `${saleyard} - Market` : "Saleyard" };
}

export default async function SaleyardDetailPage({ params }: Props) {
  const { slug } = await params;
  const saleyard = await resolveSlug("saleyard", slug);
  if (!saleyard) notFound();

  const { all, byCategory } = await getSaleyardSeries({ saleyard });

  const categoriesPresent = MLA_CATEGORIES.filter((c) => (byCategory[c]?.length ?? 0) > 0);

  const latest = all[all.length - 1] ?? null;
  const state = await (async () => {
    // Look up state from _data helper list by matching saleyard name
    const mod = await import("../../_data");
    const yards = await mod.getSaleyardsForState();
    return yards.find((y) => y.saleyard === saleyard)?.state ?? "";
  })();

  const pickPct = (series: WeeklyPoint[], weeksBack: number): number | null => {
    if (series.length <= weeksBack) return null;
    const latestP = series[series.length - 1];
    const target = series[series.length - 1 - weeksBack];
    if (!target || target.avg_price === 0) return null;
    return ((latestP.avg_price - target.avg_price) / target.avg_price) * 100;
  };

  const summary4wPct = pickPct(all, 4);

  const categoryRows = categoriesPresent
    .map((cat) => {
      const series = byCategory[cat];
      const latestP = series[series.length - 1];
      return {
        category: cat,
        latest_price: latestP.avg_price,
        latest_date: latestP.week_date,
        change_1w_pct: pickPct(series, 1),
        change_4w_pct: pickPct(series, 4),
        sparkline: series.slice(-12),
      };
    })
    .sort((a, b) => b.latest_price - a.latest_price);

  // Build a natural-language prefill for the Ask Brangus button.
  const brangusPrefill = (() => {
    if (!latest) return null;
    const parts: string[] = [];
    const where = state ? `${saleyard} (${state})` : saleyard;
    parts.push(`Mate, ${where} is averaging $${latest.avg_price.toFixed(2)}/kg as of ${formatAUDate(latest.week_date)}.`);

    if (summary4wPct !== null) {
      parts.push(`Overall it's ${summary4wPct >= 0 ? "up" : "down"} ${Math.abs(summary4wPct).toFixed(1)}% over the past 4 weeks.`);
    }

    const topCats = categoryRows.slice(0, 3);
    if (topCats.length > 0) {
      const list = topCats
        .map((r) => `${r.category} at $${r.latest_price.toFixed(2)}/kg`)
        .join(", ");
      parts.push(`The strongest categories right now are ${list}.`);
    }

    parts.push(`Categories traded here in the past 2 years: ${categoriesPresent.length}.`);
    parts.push("What's this yard telling us? Is it a good option to send stock to, and which classes are performing best?");
    return parts.join(" ");
  })();

  // CSV: all weekly rows per category
  const csvRows: Array<Record<string, string | number>> = [];
  for (const cat of categoriesPresent) {
    for (const p of byCategory[cat]) {
      csvRows.push({
        saleyard,
        state,
        category: cat,
        week_date: p.week_date,
        avg_price_per_kg: p.avg_price.toFixed(2),
        sales: p.sales,
      });
    }
  }

  return (
    <div className="max-w-4xl">
      <BackLink href="/dashboard/market/pulse" label="All saleyards" />
      <PageHeader
        title={saleyard}
        subtitle={state ? `${state} - weekly history by category` : "Weekly history by category"}
        actions={
          <div className="flex items-center gap-2">
            {brangusPrefill && <AskBrangusButton prefill={brangusPrefill} />}
            <CsvExportButton rows={csvRows} filename={`saleyard-${slug}.csv`} />
          </div>
        }
      />

      {all.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-text-muted">
            No data available for this saleyard.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Overall stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-surface-lowest p-4">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">Latest</p>
              {latest && (
                <>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">
                    ${latest.avg_price.toFixed(2)}<span className="ml-1 text-sm font-normal text-text-muted">/kg</span>
                  </p>
                  <p className="text-[11px] text-text-muted">{formatAUDate(latest.week_date)}</p>
                </>
              )}
            </div>
            <div className="rounded-2xl bg-surface-lowest p-4">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">4-week change</p>
              <div className="mt-1.5">
                <ChangeChip value={summary4wPct} size="sm" />
              </div>
              <p className="mt-1 text-[11px] text-text-muted">All categories weighted</p>
            </div>
            <div className="col-span-2 rounded-2xl bg-surface-lowest p-4 md:col-span-1">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">Categories traded</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">
                {categoriesPresent.length}
              </p>
              <p className="text-[11px] text-text-muted">Past 2 years</p>
            </div>
          </div>

          {/* Overall chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                  <TrendingUp className="h-3.5 w-3.5 text-brand" />
                </div>
                <CardTitle>Overall trend</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CategoryChart
                series={all}
                historicalSeries={all.filter((p) => p.week_date >= daysAgo(365 * 6))}
                showSeasonalBand
                defaultRange={{ key: "1Y" }}
              />
            </CardContent>
          </Card>

          {/* Per-category rows */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                  <Activity className="h-3.5 w-3.5 text-brand" />
                </div>
                <CardTitle>By category</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="divide-y divide-white/[0.04]">
                {categoryRows.map((row) => (
                  <Link
                    key={row.category}
                    href={`/dashboard/market/category/${slugify(row.category)}`}
                    className="group grid grid-cols-[1.3fr_0.9fr_1fr_1.2fr_auto] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                  >
                    <p className="truncate text-sm font-medium text-text-primary">{row.category}</p>
                    <p className="text-right text-sm font-semibold tabular-nums text-text-primary">
                      ${row.latest_price.toFixed(2)}
                      <span className="ml-1 text-xs font-normal text-text-muted">/kg</span>
                    </p>
                    <Sparkline points={row.sparkline} width={110} height={28} positive={(row.change_4w_pct ?? 0) >= 0} />
                    <div className="flex flex-wrap gap-1.5">
                      <ChangeChip label="1w" value={row.change_1w_pct} />
                      <ChangeChip label="4w" value={row.change_4w_pct} />
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
