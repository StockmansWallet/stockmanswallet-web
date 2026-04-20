import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportFilters } from "@/components/app/report-filters";
import { ReportPreviewButton } from "@/components/app/report-preview-button";
import { parseReportConfig } from "@/lib/utils/report-config";
import { generateSaleyardComparisonData } from "@/lib/services/report-service";
import { shortSaleyardName } from "@/lib/data/reference-data";
import { LazyChart } from "./lazy-chart";

export const revalidate = 0;
export const metadata = { title: "Saleyard Comparison" };

function fmtPrice(v: number) {
  return `$${v.toFixed(2)}/kg`;
}

function fmtValue(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

export default async function SaleyardComparisonPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const config = parseReportConfig(params);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Parallel: filter-dropdown properties + the heavier report generator.
  // Sequential await was an unnecessary round-trip since neither depends
  // on the other beyond the auth user.
  const [{ data: properties }, reportData] = await Promise.all([
    supabase
      .from("properties")
      .select("id, property_name")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("property_name"),
    generateSaleyardComparisonData(supabase, user!.id, {
      reportType: "saleyard-comparison",
      startDate: config.startDate,
      endDate: config.endDate,
      selectedPropertyIds: config.selectedPropertyIds,
    }),
  ]);

  const { saleyardComparison: sc } = reportData;
  const isEmpty = sc.length === 0;

  // Top 10 for chart (by portfolio value, short names).
  // distanceKm is the haversine distance from the user's origin property
  // (filtered selection if any, else default). Null when either the origin
  // property or the saleyard is missing coordinates.
  const chartData = sc.slice(0, 10).map((s) => ({
    name: shortSaleyardName(s.saleyardName),
    portfolioValue: Math.round(s.totalPortfolioValue),
    distanceKm: s.distanceKm,
  }));

  const best = sc[0] ?? null;
  const worst = sc[sc.length - 1] ?? null;
  const bestByPrice = best ? [...sc].sort((a, b) => b.avgPrice - a.avgPrice)[0] : null;

  return (
    <div className="max-w-5xl">
      <PageHeader feature="reports"
        title="Saleyard Comparison"
        titleClassName="text-4xl font-bold text-reports"
        subtitle="Compare how your portfolio values across saleyards."
      />

      {/* Toolbar: filters + export in pill row */}
      <div className="mb-6 flex items-center justify-between rounded-full bg-surface-lowest px-2 py-2 backdrop-blur-md">
        <Suspense>
          <ReportFilters properties={properties ?? []} />
        </Suspense>
        {!isEmpty && <ReportPreviewButton reportPath="/saleyard-comparison" />}
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-text-muted">No market data available for your herd categories. Add herds with valid categories to compare saleyards.</p>
            <Link href="/dashboard/herds/new">
              <Button>Add Herd</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Best Saleyard</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-reports">{fmtValue(best!.totalPortfolioValue)}</p>
                <p className="mt-0.5 truncate text-xs text-text-secondary">{shortSaleyardName(best!.saleyardName)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Best Avg $/kg</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{fmtPrice(bestByPrice!.avgPrice)}</p>
                <p className="mt-0.5 truncate text-xs text-text-secondary">{shortSaleyardName(bestByPrice!.saleyardName)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Saleyards Compared</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{sc.length}</p>
                <p className="mt-0.5 text-xs text-text-muted">{best!.totalHeadCount.toLocaleString()} head in portfolio</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Best vs Worst</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{fmtValue(best!.totalPortfolioValue - worst!.totalPortfolioValue)}</p>
                <p className="mt-0.5 text-xs text-text-muted">portfolio value spread</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart (lazy loaded) */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Top 10 Saleyards by Portfolio Value</CardTitle>
                  <p className="mt-0.5 text-xs text-text-muted">Your portfolio valued using each saleyard&apos;s latest MLA category prices.</p>
                </div>
              </CardHeader>
              <CardContent>
                <LazyChart data={chartData} />
              </CardContent>
            </Card>
          )}

          {/* Full Comparison Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Saleyards</CardTitle>
                <span className="text-xs text-text-muted">ranked by portfolio value</span>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-text-muted">
                      <th className="px-5 pb-2 font-medium">#</th>
                      <th className="px-3 pb-2 font-medium">Saleyard</th>
                      <th className="px-3 pb-2 text-right font-medium">Portfolio Value</th>
                      <th className="px-3 pb-2 text-right font-medium">Avg $/kg</th>
                      <th className="px-3 pb-2 text-right font-medium">Avg $/hd</th>
                      <th className="hidden px-3 pb-2 text-right font-medium sm:table-cell">Spread</th>
                      <th className="hidden px-3 pb-2 text-right font-medium sm:table-cell">Diff ($)</th>
                      <th className="hidden px-3 pb-2 text-right font-medium sm:table-cell">Diff (%)</th>
                      <th className="px-5 pb-2 font-medium">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sc.map((s) => {
                      const isFirst = s.rank === 1;
                      const short = shortSaleyardName(s.saleyardName);
                      const showFull = short !== s.saleyardName;
                      return (
                        <tr key={s.saleyardName} className="transition-colors hover:bg-white/[0.02]">
                          <td className={`px-5 py-2.5 tabular-nums ${isFirst ? "font-semibold text-reports" : "text-text-muted"}`}>{s.rank}</td>
                          <td className="px-3 py-2.5">
                            <p className={`${isFirst ? "font-semibold text-text-primary" : "text-text-primary"}`}>{short}</p>
                            {showFull && <p className="text-[10px] text-text-muted">{s.saleyardName}</p>}
                          </td>
                          <td className={`px-3 py-2.5 text-right tabular-nums ${isFirst ? "font-semibold text-reports" : "text-text-primary"}`}>{fmtValue(s.totalPortfolioValue)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtPrice(s.avgPrice)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtValue(s.avgPerHead)}</td>
                          <td className="hidden px-3 py-2.5 text-right tabular-nums text-text-muted sm:table-cell">{fmtPrice(s.spread)}</td>
                          <td className="hidden px-3 py-2.5 text-right tabular-nums text-text-muted sm:table-cell">
                            {s.diffToBestDollars > 0 ? `-${fmtValue(s.diffToBestDollars)}` : "-"}
                          </td>
                          <td className="hidden px-3 py-2.5 text-right tabular-nums text-text-muted sm:table-cell">
                            {s.diffToBestPercent > 0 ? `-${s.diffToBestPercent.toFixed(1)}%` : "-"}
                          </td>
                          <td className="px-5 py-2.5 text-text-muted">{s.state ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
