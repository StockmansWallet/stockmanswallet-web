import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

  // Two auth modes:
  // 1. Cookie auth for real browser users.
  // 2. x-pdf-token HTTP header for the server-side PDF generator (Puppeteer).
  //    The header never leaks into Vercel logs / CDN access logs / Referer the
  //    way a ?token= query string would.
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

  // Fetch report data and movement data in parallel.
  // Movement window matches the top filter's date range (config.startDate to config.endDate)
  // so the PDF reflects whatever the user selected in the UI.
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

  return <AssetRegisterTemplate data={reportData} movementSummary={movementData} />;
}
