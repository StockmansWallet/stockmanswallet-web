import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/app/report-filters";
import { parseReportConfig } from "@/lib/utils/report-config";
import { ReportExportButton } from "@/components/app/report-export-button";
import { generateSalesSummaryData } from "@/lib/services/report-service";
import { SalesRevenueChart } from "./sales-revenue-chart";

export const revalidate = 0;
export const metadata = { title: "Sales Summary" };

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function SalesSummaryPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
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

  const reportData = await generateSalesSummaryData(supabase, user!.id, {
    reportType: "sales-summary",
    startDate: config.startDate,
    endDate: config.endDate,
    selectedPropertyIds: config.selectedPropertyIds,
  });

  const { salesData, totalSales } = reportData;
  const isEmpty = salesData.length === 0;

  const totalGross = salesData.reduce((s, r) => s + r.grossValue, 0);
  const totalFreight = salesData.reduce((s, r) => s + r.freightCost, 0);
  const totalHead = salesData.reduce((s, r) => s + r.headCount, 0);

  // Build monthly revenue data for chart
  const monthlyRevenue = new Map<string, number>();
  for (const sale of salesData) {
    const d = new Date(sale.date + "T00:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + sale.netValue);
  }
  const chartData = [...monthlyRevenue.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => {
      const [y, m] = month.split("-");
      const label = new Date(+y, +m - 1).toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
      return { month: label, value: Math.round(value) };
    });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Sales Summary"
        titleClassName="text-4xl font-bold text-warning"
        subtitle="Transaction history and performance metrics."
        actions={!isEmpty ? <ReportExportButton reportData={reportData} reportType="sales-summary" title="Sales Summary" /> : undefined}
      />

      <div className="mb-4">
        <Suspense>
          <ReportFilters properties={properties ?? []} showPropertyFilter={false} />
        </Suspense>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-text-muted">No sales records found in this date range. Record a sale to see your sales summary.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Net Sales</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-warning">{fmt(totalSales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Gross Sales</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{fmt(totalGross)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Total Freight</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{fmt(totalFreight)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Head Sold</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{totalHead.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <SalesRevenueChart data={chartData} />
              </CardContent>
            </Card>
          )}

          {/* Sales Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sales Records</CardTitle>
                <span className="text-xs tabular-nums text-text-muted">{salesData.length} records</span>
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
                      <th className="px-3 pb-2 text-right font-medium">Price</th>
                      <th className="px-3 pb-2 font-medium">Type</th>
                      <th className="px-3 pb-2 font-medium">Location</th>
                      <th className="px-3 pb-2 text-right font-medium">Freight</th>
                      <th className="px-5 pb-2 text-right font-medium">Net Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {salesData.map((s) => (
                      <tr key={s.id} className="transition-colors hover:bg-white/[0.02]">
                        <td className="px-5 py-2.5 tabular-nums text-text-secondary">{fmtDate(s.date)}</td>
                        <td className="px-3 py-2.5 text-text-secondary">{s.herdName ?? "-"}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{s.headCount}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{s.avgWeight.toFixed(0)} kg</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">
                          {s.pricingType === "per_kg" ? `$${s.pricePerKg.toFixed(2)}/kg` : `$${(s.pricePerHead ?? 0).toFixed(0)}/hd`}
                        </td>
                        <td className="px-3 py-2.5 text-text-muted">{s.saleType ?? "-"}</td>
                        <td className="px-3 py-2.5 text-text-muted">{s.saleLocation ?? "-"}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{fmt(s.freightCost)}</td>
                        <td className="px-5 py-2.5 text-right tabular-nums font-medium text-text-primary">{fmt(s.netValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 font-medium">
                      <td className="px-5 py-3 text-text-primary">Total</td>
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3 text-right tabular-nums text-text-primary">{totalHead}</td>
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3 text-right tabular-nums text-text-primary">{fmt(totalFreight)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-warning">{fmt(totalSales)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
