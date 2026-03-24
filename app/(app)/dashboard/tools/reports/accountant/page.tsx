import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/app/report-filters";
import { parseReportConfig } from "@/lib/utils/report-config";
import { ReportExportButton } from "@/components/app/report-export-button";
import { ReportCompositionChart } from "@/components/app/report-composition-chart";
import { generateAccountantData } from "@/lib/services/report-service";

export const revalidate = 0;
export const metadata = { title: "Accountant Report" };

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtKg(v: number) {
  return `${v.toFixed(0)} kg`;
}

export default async function AccountantReportPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
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

  const reportData = await generateAccountantData(supabase, user!.id, {
    reportType: "accountant",
    startDate: config.startDate,
    endDate: config.endDate,
    selectedPropertyIds: config.selectedPropertyIds,
  });

  const { executiveSummary, herdData, salesData, herdComposition, totalValue, totalSales, farmName } = reportData;
  const isEmpty = herdData.length === 0 && salesData.length === 0;

  const reportDateRange = `${fmtDate(config.startDate)} — ${fmtDate(config.endDate)}`;
  const totalHead = herdData.reduce((s, h) => s + h.headCount, 0);
  const totalSalesHead = salesData.reduce((s, r) => s + r.headCount, 0);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Accountant Report"
        subtitle="Professional summary for your accountant or bank manager."
        actions={!isEmpty ? <ReportExportButton reportData={reportData} reportType="accountant" title="Accountant Report" /> : undefined}
      />

      <div className="mb-4">
        <Suspense>
          <ReportFilters properties={properties ?? []} />
        </Suspense>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-text-muted">No data available for this date range. Add herds and record sales to generate your accountant report.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Report Header */}
          <Card className="border-amber-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{farmName ?? "Livestock Portfolio"}</h2>
                  <p className="mt-0.5 text-xs text-text-muted">Financial Summary &middot; {reportDateRange}</p>
                  <p className="text-xs text-text-muted">Generated {new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
                <Badge className="bg-amber-500/15 text-amber-400">Professional Report</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Financial Overview */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Portfolio Value</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-amber-400">{fmt(totalValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Active Herds</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{totalHead.toLocaleString()} hd</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Sales Revenue</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{fmt(totalSales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Head Sold</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{totalSalesHead.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Herd Composition */}
          {herdComposition.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Asset Composition</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportCompositionChart data={herdComposition} />
              </CardContent>
            </Card>
          )}

          {/* Asset Register Summary */}
          {herdData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Asset Register</CardTitle>
                  <span className="text-xs tabular-nums text-text-muted">{herdData.length} herds &middot; {fmt(totalValue)}</span>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-text-muted">
                        <th className="px-5 pb-2 font-medium">Herd</th>
                        <th className="px-3 pb-2 font-medium">Category</th>
                        <th className="px-3 pb-2 font-medium">Property</th>
                        <th className="px-3 pb-2 text-right font-medium">Head</th>
                        <th className="px-3 pb-2 text-right font-medium">Weight</th>
                        <th className="px-3 pb-2 text-right font-medium">Price/kg</th>
                        <th className="px-5 pb-2 text-right font-medium">Net Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {herdData.map((h) => (
                        <tr key={h.id} className="transition-colors hover:bg-white/[0.02]">
                          <td className="px-5 py-2 font-medium text-text-primary">{h.name}</td>
                          <td className="px-3 py-2 text-text-secondary">{h.category}</td>
                          <td className="px-3 py-2 text-text-muted">{h.propertyName ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-primary">{h.headCount}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{fmtKg(h.weight)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-secondary">${h.pricePerKg.toFixed(2)}</td>
                          <td className="px-5 py-2 text-right tabular-nums font-medium text-text-primary">{fmt(h.netValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/10 font-medium">
                        <td className="px-5 py-3 text-text-primary" colSpan={3}>Total</td>
                        <td className="px-3 py-3 text-right tabular-nums text-text-primary">{totalHead}</td>
                        <td className="px-3 py-3" />
                        <td className="px-3 py-3" />
                        <td className="px-5 py-3 text-right tabular-nums text-amber-400">{fmt(totalValue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sales Summary */}
          {salesData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Sales History</CardTitle>
                  <span className="text-xs tabular-nums text-text-muted">{salesData.length} sales &middot; {fmt(totalSales)}</span>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-text-muted">
                        <th className="px-5 pb-2 font-medium">Date</th>
                        <th className="px-3 pb-2 font-medium">Herd</th>
                        <th className="px-3 pb-2 text-right font-medium">Head</th>
                        <th className="px-3 pb-2 text-right font-medium">Avg Wt</th>
                        <th className="px-3 pb-2 font-medium">Location</th>
                        <th className="px-3 pb-2 text-right font-medium">Gross</th>
                        <th className="px-3 pb-2 text-right font-medium">Freight</th>
                        <th className="px-5 pb-2 text-right font-medium">Net Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {salesData.map((s) => (
                        <tr key={s.id} className="transition-colors hover:bg-white/[0.02]">
                          <td className="px-5 py-2 tabular-nums text-text-secondary">{fmtDate(s.date)}</td>
                          <td className="px-3 py-2 text-text-secondary">{s.herdName ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-primary">{s.headCount}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{s.avgWeight.toFixed(0)} kg</td>
                          <td className="px-3 py-2 text-text-muted">{s.saleLocation ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{fmt(s.grossValue)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-muted">{fmt(s.freightCost)}</td>
                          <td className="px-5 py-2 text-right tabular-nums font-medium text-text-primary">{fmt(s.netValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/10 font-medium">
                        <td className="px-5 py-3 text-text-primary" colSpan={2}>Total</td>
                        <td className="px-3 py-3 text-right tabular-nums text-text-primary">{totalSalesHead}</td>
                        <td className="px-3 py-3" />
                        <td className="px-3 py-3" />
                        <td className="px-3 py-3 text-right tabular-nums text-text-primary">{fmt(salesData.reduce((s, r) => s + r.grossValue, 0))}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-text-primary">{fmt(salesData.reduce((s, r) => s + r.freightCost, 0))}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-amber-400">{fmt(totalSales)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
