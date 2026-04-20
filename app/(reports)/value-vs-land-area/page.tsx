import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { parseReportConfig } from "@/lib/utils/report-config";
import { generateLandValueData } from "@/lib/services/report-service";
import { ValueVsLandAreaTemplate } from "./report-template";

export const revalidate = 0;
export const metadata = { title: "Value vs Land Area - Stockman's Wallet" };

export default async function ValueVsLandAreaReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const config = parseReportConfig(params);

  // Two auth modes (see /saleyard-comparison): cookie for browsers,
  // x-pdf-token header for the Puppeteer PDF renderer.
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

  const reportData = await generateLandValueData(supabase, userId, {
    reportType: "value-vs-land-area",
    startDate: config.startDate,
    endDate: config.endDate,
    selectedPropertyIds: config.selectedPropertyIds,
  });

  return <ValueVsLandAreaTemplate data={reportData} />;
}
