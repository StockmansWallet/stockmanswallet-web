import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { parseReportConfig } from "@/lib/utils/report-config";
import { generateAssetRegisterData } from "@/lib/services/report-service";
import { calculatePortfolioMovement } from "@/lib/services/movement-service";
import { createMovementPeriod } from "@/lib/types/portfolio-movement";
import { AssetRegisterTemplate } from "../asset-register/report-template";

export const revalidate = 0;
export const metadata = { title: "Lender Report - Stockman's Wallet" };

export default async function LenderReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const config = parseReportConfig(params);

  // Two auth modes (mirrors /asset-register):
  //   1. Cookie auth for real browser users.
  //   2. x-pdf-token HTTP header for the server-side PDF generator (Puppeteer).
  const pdfToken = (await headers()).get("x-pdf-token");
  let supabase;
  let userId: string;

  if (pdfToken) {
    supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${pdfToken}` } } },
    );
    const { data: { user }, error } = await supabase.auth.getUser(pdfToken);
    if (error || !user) redirect("/sign-in");
    userId = user.id;
  } else {
    supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/sign-in");
    userId = user.id;
  }

  // Lender Report = snapshot + Portfolio Movement section.
  // Movement window matches the top filter's date range so the PDF reflects
  // whatever the user selected in the UI.
  const period = createMovementPeriod("custom", config.startDate, config.endDate);
  const [reportData, movementData] = await Promise.all([
    generateAssetRegisterData(supabase, userId, {
      reportType: "asset-register",
      startDate: config.startDate,
      endDate: config.endDate,
      selectedPropertyIds: config.selectedPropertyIds,
    }),
    calculatePortfolioMovement(supabase, userId, period, config.selectedPropertyIds),
  ]);

  return <AssetRegisterTemplate data={reportData} movementSummary={movementData} variant="lender" />;
}
