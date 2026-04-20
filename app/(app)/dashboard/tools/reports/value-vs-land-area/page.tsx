import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportFilters } from "@/components/app/report-filters";
import { ReportExportButton } from "@/components/app/report-export-button";
import { parseReportConfig } from "@/lib/utils/report-config";
import { generateLandValueData } from "@/lib/services/report-service";
import { LazyChart } from "./lazy-chart";

export const revalidate = 0;
export const metadata = { title: "Value vs Land Area" };

function fmtValue(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

function fmtAcres(v: number) {
  return `${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(v)} ac`;
}

export default async function ValueVsLandAreaPage({
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
    generateLandValueData(supabase, user!.id, {
      reportType: "value-vs-land-area",
      startDate: config.startDate,
      endDate: config.endDate,
      selectedPropertyIds: config.selectedPropertyIds,
    }),
  ]);

  const { landValueAnalysis: analysis } = reportData;
  const isEmpty = analysis.length === 0;

  const totalAcreage = analysis.reduce((s, a) => s + a.acreage, 0);
  const totalValue = analysis.reduce((s, a) => s + a.livestockValue, 0);
  const totalHead = analysis.reduce((s, a) => s + a.totalHeadCount, 0);
  const avgPerAcre = totalAcreage > 0 ? totalValue / totalAcreage : 0;

  const chartData = analysis.map((a) => ({
    name: a.propertyName,
    valuePerAcre: Math.round(a.valuePerAcre),
  }));

  const best = analysis[0] ?? null;

  return (
    <div className="max-w-5xl">
      <PageHeader
        feature="reports"
        title="Value vs Land Area"
        titleClassName="text-4xl font-bold text-reports"
        subtitle="Livestock value density per acre across your properties."
      />

      {/* Toolbar */}
      <div className="relative z-20 mb-6 flex items-center justify-between rounded-full bg-surface-lowest px-2 py-2 backdrop-blur-md">
        <Suspense>
          <ReportFilters properties={properties ?? []} />
        </Suspense>
        {!isEmpty && <ReportExportButton label="Value vs Land Area" reportType="value-vs-land-area" />}
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-text-muted">
              No properties with acreage and livestock to analyse. Add acreage to your properties and at least one herd to see this report.
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
                <p className="mt-0.5 text-xs text-text-muted">{totalHead.toLocaleString()} head</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Total Acreage</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{fmtAcres(totalAcreage)}</p>
                <p className="mt-0.5 text-xs text-text-muted">{analysis.length} {analysis.length === 1 ? "property" : "properties"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Avg $/Acre</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{fmtValue(avgPerAcre)}</p>
                <p className="mt-0.5 text-xs text-text-muted">across all properties</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Best Density</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{best ? fmtValue(best.valuePerAcre) : "-"}</p>
                <p className="mt-0.5 truncate text-xs text-text-secondary">{best?.propertyName ?? ""}</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Value per Acre</CardTitle>
                  <p className="mt-0.5 text-xs text-text-muted">Livestock value divided by property area, sorted best first.</p>
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
                <span className="text-xs text-text-muted">ranked by $/acre</span>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-text-muted">
                      <th className="px-5 pb-2 font-medium">#</th>
                      <th className="px-3 pb-2 font-medium">Property</th>
                      <th className="px-3 pb-2 text-right font-medium">Acreage</th>
                      <th className="px-3 pb-2 text-right font-medium">Head</th>
                      <th className="px-3 pb-2 text-right font-medium">Livestock Value</th>
                      <th className="px-5 pb-2 text-right font-medium">$/Acre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {analysis.map((a, i) => {
                      const isFirst = i === 0;
                      return (
                        <tr key={a.propertyName} className="transition-colors hover:bg-white/[0.02]">
                          <td className={`px-5 py-2.5 tabular-nums ${isFirst ? "font-semibold text-reports" : "text-text-muted"}`}>{i + 1}</td>
                          <td className="px-3 py-2.5">
                            <p className={`${isFirst ? "font-semibold text-text-primary" : "text-text-primary"}`}>{a.propertyName}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtAcres(a.acreage)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{a.totalHeadCount.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtValue(a.livestockValue)}</td>
                          <td className={`px-5 py-2.5 text-right tabular-nums ${isFirst ? "font-semibold text-reports" : "text-text-primary"}`}>{fmtValue(a.valuePerAcre)}</td>
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
