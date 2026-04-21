import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportFilters } from "@/components/app/report-filters";
import { parseReportConfig } from "@/lib/utils/report-config";
import { ReportDownloadMenu } from "@/components/app/report-download-menu";
import { generateSalesSummaryData } from "@/lib/services/report-service";
import { SalesRevenueChart } from "./sales-revenue-chart";
import { SalesRecordsSection } from "./_components/sales-records-section";

export const revalidate = 0;
export const metadata = { title: "Sales Summary" };

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

export default async function SalesSummaryPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const config = parseReportConfig(params);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Run the filter-dropdown properties query in parallel with the report
  // generator. Each needs the auth user but neither depends on the other,
  // so a sequential await costs an unnecessary round-trip.
  const [{ data: properties }, reportData] = await Promise.all([
    supabase
      .from("properties")
      .select("id, property_name")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("property_name"),
    generateSalesSummaryData(supabase, user!.id, {
      reportType: "sales-summary",
      startDate: config.startDate,
      endDate: config.endDate,
      selectedPropertyIds: config.selectedPropertyIds,
    }),
  ]);

  const { salesData, totalSales } = reportData;
  const isEmpty = salesData.length === 0;

  const totalGross = salesData.reduce((s, r) => s + r.grossValue, 0);
  const totalFreight = salesData.reduce((s, r) => s + r.freightCost, 0);
  const totalHead = salesData.reduce((s, r) => s + r.headCount, 0);

  // Build monthly revenue data for chart. sale.date is TIMESTAMPTZ from
  // Supabase, so only append local midnight for date-only strings.
  const monthlyRevenue = new Map<string, number>();
  for (const sale of salesData) {
    const d = new Date(sale.date.length === 10 ? sale.date + "T00:00:00" : sale.date);
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
      <PageHeader feature="reports"
        title="Sales Summary"
        titleClassName="text-4xl font-bold text-warning"
        subtitle="Transaction history and performance metrics."
      />

      {/* Toolbar. relative + z-20 lifts the toolbar's stacking context
          above the content below (which create their own contexts via
          backdrop-blur-xl), so the ReportFilters property dropdown
          renders above them. */}
      <div className="relative z-20 mb-6 flex items-center justify-between rounded-full bg-surface-lowest px-2 py-2 backdrop-blur-md">
        <Suspense>
          <ReportFilters properties={properties ?? []} showPropertyFilter={false} />
        </Suspense>
        {!isEmpty && (
          <ReportDownloadMenu
            groups={[{ label: "Sales Summary", reportType: "sales-summary" }]}
          />
        )}
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

          <SalesRecordsSection salesData={salesData} />
        </div>
      )}
    </div>
  );
}
