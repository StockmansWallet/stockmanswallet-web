import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseReportConfig } from "@/lib/utils/report-config";
import { generateSaleyardComparisonData } from "@/lib/services/report-service";
import { SaleyardComparisonTemplate } from "./report-template";

export const revalidate = 0;
export const metadata = { title: "Saleyard Comparison - Stockman's Wallet" };

export default async function SaleyardComparisonReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const config = parseReportConfig(params);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const reportData = await generateSaleyardComparisonData(supabase, user.id, {
    reportType: "saleyard-comparison",
    startDate: config.startDate,
    endDate: config.endDate,
    selectedPropertyIds: config.selectedPropertyIds,
  });

  return <SaleyardComparisonTemplate data={reportData} />;
}
