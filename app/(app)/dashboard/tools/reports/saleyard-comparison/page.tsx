import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportFilters } from "@/components/app/report-filters";
import { ReportDownloadMenu } from "@/components/app/report-download-menu";
import { parseReportConfig } from "@/lib/utils/report-config";
import { generateSaleyardComparisonData } from "@/lib/services/report-service";
import { SaleyardComparisonView } from "./saleyard-comparison-view";

export const revalidate = 0;
export const metadata = { title: "Saleyard Comparison" };

export default async function SaleyardComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const config = parseReportConfig(params);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Parallel: filter-dropdown properties + the heavier report generator.
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

  return (
    <div className="max-w-5xl">
      <PageHeader
        feature="reports"
        title="Saleyard Comparison"
        titleClassName="text-4xl font-bold text-reports"
        subtitle="Compare how your portfolio values across saleyards."
      />

      {/* Toolbar: filters + export in pill row. relative + z-20 lifts
          the toolbar's stacking context above the stat cards below (which
          create their own contexts via backdrop-blur-xl), so the
          ReportFilters property dropdown renders above them. */}
      <div className="relative z-20 mb-6 flex items-center justify-between rounded-full bg-surface-lowest px-2 py-2 backdrop-blur-md">
        <Suspense>
          <ReportFilters properties={properties ?? []} />
        </Suspense>
        {!isEmpty && (
          <ReportDownloadMenu
            groups={[{ label: "Saleyard Comparison", reportType: "saleyard-comparison" }]}
          />
        )}
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-text-muted">
              No market data available for your herd categories. Add herds with valid
              categories to compare saleyards.
            </p>
            <Link href="/dashboard/herds/new">
              <Button>Add Herd</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <SaleyardComparisonView saleyardComparison={sc} />
      )}
    </div>
  );
}
