import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportFilters } from "@/components/app/report-filters";
import { ReportDownloadMenu } from "@/components/app/report-download-menu";
import { parseReportConfig } from "@/lib/utils/report-config";
import { generatePropertyComparisonData } from "@/lib/services/report-service";
import { LazyChart } from "./lazy-chart";

export const revalidate = 0;
export const metadata = { title: "Property vs Property" };

function fmtValue(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

function fmtPrice(v: number) {
  return `$${v.toFixed(2)}/kg`;
}

export default async function PropertyComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const config = parseReportConfig(params);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: properties }, reportData] = await Promise.all([
    supabase
      .from("properties")
      .select("id, property_name")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("property_name"),
    generatePropertyComparisonData(supabase, user!.id, {
      reportType: "property-comparison",
      startDate: config.startDate,
      endDate: config.endDate,
      selectedPropertyIds: config.selectedPropertyIds,
    }),
  ]);

  const { propertyComparison: comparison } = reportData;
  const isEmpty = comparison.length === 0;

  const totalValue = comparison.reduce((s, c) => s + c.totalValue, 0);
  const totalHead = comparison.reduce((s, c) => s + c.totalHeadCount, 0);
  const avgValuePerHead = totalHead > 0 ? totalValue / totalHead : 0;
  const best = comparison[0] ?? null;

  const chartData = comparison.map((c) => ({
    name: c.propertyName,
    totalValue: Math.round(c.totalValue),
    headCount: c.totalHeadCount,
  }));

  return (
    <div className="w-full max-w-[1680px]">
      <PageHeader
        feature="reports"
        title="Property vs Property"
        titleClassName="text-4xl font-bold text-reports"
        subtitle="Compare portfolio performance across your properties."
      />

      {/* Toolbar */}
      <div className="relative z-20 mb-6 flex items-center justify-between rounded-full bg-surface-lowest px-2 py-2 backdrop-blur-md">
        <Suspense>
          <ReportFilters properties={properties ?? []} />
        </Suspense>
        {!isEmpty && (
          <ReportDownloadMenu
            groups={[{ label: "Property Comparison", reportType: "property-comparison" }]}
          />
        )}
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-text-muted">
              No properties to compare. Add at least one property with herds to use this report.
            </p>
            <Link href="/dashboard/properties">
              <Button>Manage Properties</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Total Value</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-reports">{fmtValue(totalValue)}</p>
                <p className="mt-0.5 text-xs text-text-muted">{comparison.length} {comparison.length === 1 ? "property" : "properties"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Total Head</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{totalHead.toLocaleString()}</p>
                <p className="mt-0.5 text-xs text-text-muted">across portfolio</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Best Property</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{best ? fmtValue(best.totalValue) : "-"}</p>
                <p className="mt-0.5 truncate text-xs text-text-secondary">{best?.propertyName ?? ""}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Avg $/Head</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{fmtValue(avgValuePerHead)}</p>
                <p className="mt-0.5 text-xs text-text-muted">portfolio average</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Total Value by Property</CardTitle>
                  <p className="mt-0.5 text-xs text-text-muted">Portfolio valued at each property, ranked highest first.</p>
                </div>
              </CardHeader>
              <CardContent>
                <LazyChart data={chartData} />
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Properties</CardTitle>
                <span className="text-xs text-text-muted">ranked by total value</span>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-text-muted">
                      <th className="px-5 pb-2 font-medium">#</th>
                      <th className="px-3 pb-2 font-medium">Property</th>
                      <th className="px-3 pb-2 text-right font-medium">Head</th>
                      <th className="px-3 pb-2 text-right font-medium">Avg $/kg</th>
                      <th className="px-3 pb-2 text-right font-medium">$/Head</th>
                      <th className="px-5 pb-2 text-right font-medium">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {comparison.map((c, i) => {
                      const isFirst = i === 0;
                      return (
                        <tr key={c.propertyName} className="transition-colors hover:bg-white/[0.02]">
                          <td className={`px-5 py-2.5 tabular-nums ${isFirst ? "font-semibold text-reports" : "text-text-muted"}`}>{i + 1}</td>
                          <td className="px-3 py-2.5">
                            <p className={`${isFirst ? "font-semibold text-text-primary" : "text-text-primary"}`}>{c.propertyName}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{c.totalHeadCount.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtPrice(c.avgPricePerKg)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtValue(c.valuePerHead)}</td>
                          <td className={`px-5 py-2.5 text-right tabular-nums ${isFirst ? "font-semibold text-reports" : "text-text-primary"}`}>{fmtValue(c.totalValue)}</td>
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
