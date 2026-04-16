import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseReportConfig } from "@/lib/utils/report-config";
import { generateAssetRegisterData } from "@/lib/services/report-service";
import { calculatePortfolioMovement } from "@/lib/services/movement-service";
import { createMovementPeriod } from "@/lib/types/portfolio-movement";
import { AssetRegisterTemplate } from "./report-template";

export const revalidate = 0;
export const metadata = { title: "Asset Register - Stockman's Wallet" };

export default async function AssetRegisterReportPage({
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

  if (!user) redirect("/sign-in");

  // Fetch report data and movement data in parallel
  const period = createMovementPeriod("1M");
  const [reportData, movementData] = await Promise.all([
    generateAssetRegisterData(supabase, user.id, {
      reportType: "asset-register",
      startDate: config.startDate,
      endDate: config.endDate,
      selectedPropertyIds: config.selectedPropertyIds,
    }),
    calculatePortfolioMovement(supabase, user.id, period, config.selectedPropertyIds),
  ]);

  return <AssetRegisterTemplate data={reportData} movementSummary={movementData} />;
}
