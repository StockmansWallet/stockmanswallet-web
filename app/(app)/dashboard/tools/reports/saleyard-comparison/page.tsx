import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportFilters } from "@/components/app/report-filters";
import { parseReportConfig } from "@/lib/utils/report-config";
import { ReportExportButton } from "@/components/app/report-export-button";
import { generateSaleyardComparisonData } from "@/lib/services/report-service";
import { SaleyardComparisonChart } from "./saleyard-chart";

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

  const { data: properties } = await supabase
    .from("properties")
    .select("id, property_name")
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("property_name");

  const reportData = await generateSaleyardComparisonData(supabase, user!.id, {
    reportType: "saleyard-comparison",
    startDate: config.startDate,
    endDate: config.endDate,
    selectedPropertyIds: config.selectedPropertyIds,
  });

  const { saleyardComparison: sc } = reportData;
  const isEmpty = sc.length === 0;

  // Top 15 for chart (by portfolio value)
  const chartData = sc.slice(0, 15).map((s) => ({
    name: s.saleyardName.replace(/ Saleyards?| Livestock.*| Regional.*| Exchange.*| Centre.*/i, ""),
    portfolioValue: Math.round(s.totalPortfolioValue),
  }));

  const best = sc[0] ?? null;
  const worst = sc[sc.length - 1] ?? null;
  const bestByPrice = best ? [...sc].sort((a, b) => b.avgPrice - a.avgPrice)[0] : null;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Saleyard Comparison"
        titleClassName="text-4xl font-bold text-amber-400"
        subtitle="Gross portfolio benchmarking across saleyards."
        actions={!isEmpty ? <ReportExportButton reportData={reportData} reportType="saleyard-comparison" title="Saleyard Comparison" /> : undefined}
      />

      <div className="mb-4">
        <Suspense>
          <ReportFilters properties={properties ?? []} />
        </Suspense>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-text-muted">No market data available for your herd categories. Add herds with valid categories to compare saleyards.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Best Saleyard</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-amber-400">{fmtValue(best!.totalPortfolioValue)}</p>
                <p className="mt-0.5 truncate text-xs text-text-secondary">{best!.saleyardName}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Best Avg $/kg</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{fmtPrice(bestByPrice!.avgPrice)}</p>
                <p className="mt-0.5 truncate text-xs text-text-secondary">{bestByPrice!.saleyardName}</p>
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

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Value by Saleyard</CardTitle>
              </CardHeader>
              <CardContent>
                <SaleyardComparisonChart data={chartData} />
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
                      <th className="px-3 pb-2 text-right font-medium">Spread</th>
                      <th className="px-3 pb-2 text-right font-medium">Diff ($)</th>
                      <th className="px-3 pb-2 text-right font-medium">Diff (%)</th>
                      <th className="px-5 pb-2 font-medium">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sc.map((s) => {
                      const isFirst = s.rank === 1;
                      return (
                        <tr key={s.saleyardName} className="transition-colors hover:bg-white/[0.02]">
                          <td className={`px-5 py-2.5 tabular-nums ${isFirst ? "font-semibold text-amber-400" : "text-text-muted"}`}>{s.rank}</td>
                          <td className={`px-3 py-2.5 ${isFirst ? "font-semibold text-text-primary" : "text-text-primary"}`}>{s.saleyardName}</td>
                          <td className={`px-3 py-2.5 text-right tabular-nums ${isFirst ? "font-semibold text-amber-400" : "text-text-primary"}`}>{fmtValue(s.totalPortfolioValue)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtPrice(s.avgPrice)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtValue(s.avgPerHead)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{fmtPrice(s.spread)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">
                            {s.diffToBestDollars > 0 ? `-${fmtValue(s.diffToBestDollars)}` : "-"}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">
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
