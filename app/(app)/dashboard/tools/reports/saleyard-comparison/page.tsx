import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportFilters, parseReportConfig } from "@/components/app/report-filters";
import { ReportExportButton } from "@/components/app/report-export-button";
import { generateSaleyardComparisonData } from "@/lib/services/report-service";
import { SaleyardComparisonChart } from "./saleyard-chart";

export const revalidate = 0;
export const metadata = { title: "Saleyard Comparison" };

function fmtPrice(v: number) {
  return `$${v.toFixed(2)}/kg`;
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

  const { saleyardComparison } = reportData;
  const isEmpty = saleyardComparison.length === 0;

  // Top 15 for chart
  const chartData = saleyardComparison.slice(0, 15).map((s) => ({
    name: s.saleyardName.replace(/ Saleyards?| Livestock.*| Regional.*| Exchange.*| Centre.*/i, ""),
    avgPrice: +s.avgPrice.toFixed(2),
    minPrice: +s.minPrice.toFixed(2),
    maxPrice: +s.maxPrice.toFixed(2),
  }));

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Saleyard Comparison"
        subtitle="Compare prices across saleyards for your herd categories."
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
          {/* Best price highlight */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Best Avg Price</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-400">{fmtPrice(saleyardComparison[0].avgPrice)}</p>
                <p className="mt-0.5 truncate text-xs text-text-secondary">{saleyardComparison[0].saleyardName}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Saleyards Compared</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{saleyardComparison.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Price Spread</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">
                  {fmtPrice(saleyardComparison[0].avgPrice - saleyardComparison[saleyardComparison.length - 1].avgPrice)}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">best vs worst</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Average Price by Saleyard</CardTitle>
              </CardHeader>
              <CardContent>
                <SaleyardComparisonChart data={chartData} />
              </CardContent>
            </Card>
          )}

          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Saleyards</CardTitle>
                <span className="text-xs text-text-muted">sorted by best price</span>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-text-muted">
                      <th className="px-5 pb-2 font-medium">#</th>
                      <th className="px-3 pb-2 font-medium">Saleyard</th>
                      <th className="px-3 pb-2 text-right font-medium">Avg Price</th>
                      <th className="px-3 pb-2 text-right font-medium">Min Price</th>
                      <th className="px-3 pb-2 text-right font-medium">Max Price</th>
                      <th className="px-5 pb-2 text-right font-medium">Spread</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {saleyardComparison.map((s, i) => (
                      <tr key={s.saleyardName} className="transition-colors hover:bg-white/[0.02]">
                        <td className="px-5 py-2.5 tabular-nums text-text-muted">{i + 1}</td>
                        <td className="px-3 py-2.5 text-text-primary">{s.saleyardName}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium text-amber-400">{fmtPrice(s.avgPrice)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtPrice(s.minPrice)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtPrice(s.maxPrice)}</td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-text-muted">{fmtPrice(s.maxPrice - s.minPrice)}</td>
                      </tr>
                    ))}
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
