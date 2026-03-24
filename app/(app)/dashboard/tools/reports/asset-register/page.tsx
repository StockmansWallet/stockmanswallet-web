import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters, parseReportConfig } from "@/components/app/report-filters";
import { ReportExportButton } from "@/components/app/report-export-button";
import { ReportCompositionChart } from "@/components/app/report-composition-chart";
import { generateAssetRegisterData } from "@/lib/services/report-service";

export const revalidate = 0;
export const metadata = { title: "Asset Register" };

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

function fmtKg(v: number) {
  return `${v.toFixed(0)} kg`;
}

function fmtPrice(v: number) {
  return `$${v.toFixed(2)}/kg`;
}

export default async function AssetRegisterPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const config = parseReportConfig(params);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch properties for filter component
  const { data: properties } = await supabase
    .from("properties")
    .select("id, property_name")
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("property_name");

  const reportData = await generateAssetRegisterData(supabase, user!.id, {
    reportType: "asset-register",
    startDate: config.startDate,
    endDate: config.endDate,
    selectedPropertyIds: config.selectedPropertyIds,
  });

  const { executiveSummary, herdData, herdComposition } = reportData;
  const isEmpty = herdData.length === 0;

  // Group herds by property
  const grouped = new Map<string, typeof herdData>();
  for (const h of herdData) {
    const key = h.propertyName ?? "Unassigned";
    const arr = grouped.get(key) ?? [];
    arr.push(h);
    grouped.set(key, arr);
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Asset Register"
        subtitle="Complete herd listing with current valuations."
        actions={!isEmpty ? <ReportExportButton reportData={reportData} reportType="asset-register" title="Asset Register" /> : undefined}
      />

      <div className="mb-4">
        <Suspense>
          <ReportFilters properties={properties ?? []} />
        </Suspense>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-text-muted">No active herds found. Add herds to generate your asset register.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Executive Summary */}
          {executiveSummary && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="px-5 py-4">
                  <p className="text-xs text-text-muted">Total Portfolio Value</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-amber-400">{fmt(executiveSummary.totalPortfolioValue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="px-5 py-4">
                  <p className="text-xs text-text-muted">Total Head Count</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{executiveSummary.totalHeadCount.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="px-5 py-4">
                  <p className="text-xs text-text-muted">Avg Value Per Head</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{fmt(executiveSummary.averageValuePerHead)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Herd Composition Chart */}
          {herdComposition.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Herd Composition</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportCompositionChart data={herdComposition} />
              </CardContent>
            </Card>
          )}

          {/* Herd Table — grouped by property */}
          {[...grouped.entries()].map(([propertyName, herds]) => (
            <Card key={propertyName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{propertyName}</CardTitle>
                  <span className="text-xs tabular-nums text-text-muted">
                    {herds.reduce((s, h) => s + h.headCount, 0).toLocaleString()} head &middot; {fmt(herds.reduce((s, h) => s + h.netValue, 0))}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-text-muted">
                        <th className="px-5 pb-2 font-medium">Herd</th>
                        <th className="px-3 pb-2 font-medium">Category</th>
                        <th className="px-3 pb-2 text-right font-medium">Head</th>
                        <th className="px-3 pb-2 text-right font-medium">Weight</th>
                        <th className="px-3 pb-2 text-right font-medium">Price/kg</th>
                        <th className="px-3 pb-2 text-right font-medium">Net Value</th>
                        <th className="px-5 pb-2 text-right font-medium">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {herds.map((h) => (
                        <tr key={h.id} className="transition-colors hover:bg-white/[0.02]">
                          <td className="px-5 py-2.5 font-medium text-text-primary">{h.name}</td>
                          <td className="px-3 py-2.5 text-text-secondary">{h.category}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{h.headCount.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtKg(h.weight)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{fmtPrice(h.pricePerKg)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-medium text-text-primary">{fmt(h.netValue)}</td>
                          <td className="px-5 py-2.5 text-right">
                            <Badge variant={h.priceSource === "saleyard" ? "success" : h.priceSource === "national" ? "info" : "warning"} className="text-[10px]">
                              {h.priceSource}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
