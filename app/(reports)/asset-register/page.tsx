import { redirect } from "next/navigation";
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
  const token = typeof params.token === "string" ? params.token : undefined;

  // Debug: Support two auth modes:
  // 1. Cookie auth (browser users visiting the page normally)
  // 2. Token auth via ?token= parameter (server-side PDF generation via Puppeteer)
  let supabase;
  let userId: string;

  if (token) {
    // Token-based auth (from PDF API route's Puppeteer)
    supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) redirect("/sign-in");
    userId = user.id;
  } else {
    // Cookie-based auth (normal browser access)
    supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/sign-in");
    userId = user.id;
  }

  // Fetch report data and movement data in parallel
  const period = createMovementPeriod("1M");
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
