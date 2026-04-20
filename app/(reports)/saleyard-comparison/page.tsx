import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

  // Two auth modes (mirrors /asset-register + /lender-report + /accountant):
  //   1. Cookie auth for real browser users.
  //   2. x-pdf-token HTTP header for the server-side PDF generator
  //      (Puppeteer). Without this branch, Puppeteer got redirected to
  //      /sign-in and captured the login page instead of the report.
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

  const reportData = await generateSaleyardComparisonData(supabase, userId, {
    reportType: "saleyard-comparison",
    startDate: config.startDate,
    endDate: config.endDate,
    selectedPropertyIds: config.selectedPropertyIds,
  });

  return <SaleyardComparisonTemplate data={reportData} />;
}
