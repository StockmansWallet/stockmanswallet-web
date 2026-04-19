import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportFilters } from "@/components/app/report-filters";
import { parseReportConfig } from "@/lib/utils/report-config";
import { ReportPreviewButton } from "@/components/app/report-preview-button";
import { generateAssetRegisterData } from "@/lib/services/report-service";

import { ExecutiveSummaryCard } from "./_components/executive-summary-card";
import { ProducerPropertiesCard } from "./_components/producer-properties-card";
import { HerdCompositionCard } from "./_components/herd-composition-card";
import { AssetRegisterTabs } from "./_components/asset-register-tabs";

export const revalidate = 0;
export const metadata = { title: "Asset Register" };

export default async function AssetRegisterPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
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

  const reportData = await generateAssetRegisterData(supabase, user!.id, {
    reportType: "asset-register",
    startDate: config.startDate,
    endDate: config.endDate,
    selectedPropertyIds: config.selectedPropertyIds,
  });

  const { executiveSummary, herdData, herdComposition, userDetails, properties: reportProperties } = reportData;
  const isEmpty = herdData.length === 0;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Asset Register"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Complete herd listing with current valuations."
      />

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between rounded-full bg-surface-lowest px-2 py-2">
        <Suspense>
          <ReportFilters properties={properties ?? []} />
        </Suspense>
        {!isEmpty && <ReportPreviewButton reportPath="/asset-register" />}
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-text-muted">No active herds found. Add herds to generate your asset register.</p>
            <Link href="/dashboard/herds/new">
              <Button>Add Herd</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {executiveSummary && (
            <ExecutiveSummaryCard summary={executiveSummary} periodStart={config.startDate} periodEnd={config.endDate} />
          )}

          {/* Details row: Producer/Properties + Herd Composition side by side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {userDetails && (
              <ProducerPropertiesCard userDetails={userDetails} properties={reportProperties} />
            )}
            {herdComposition.length > 0 && (
              <HerdCompositionCard data={herdComposition} />
            )}
          </div>

          <AssetRegisterTabs
            herdData={herdData}
            startDate={config.startDate}
            endDate={config.endDate}
            selectedPropertyIds={config.selectedPropertyIds}
          />
        </div>
      )}
    </div>
  );
}
