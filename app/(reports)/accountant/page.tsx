import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { generateAccountantData } from "@/lib/services/report-service";
import { AccountantReportTemplate } from "./report-template";

export const revalidate = 0;
export const metadata = { title: "Accountant Report - Stockman's Wallet" };

// Map FY short code (FY2026) to the Australian financial year date range
// (1 Jul YYYY-1  to  30 Jun YYYY). Matches the options in the dashboard.
function fyRange(fy: string | null): {
  start: string;
  end: string;
  label: string;
  short: string;
} | null {
  if (!fy) return null;
  const matched = fy.match(/^FY(\d{4})$/);
  if (!matched) return null;
  const endYear = parseInt(matched[1], 10);
  const startYear = endYear - 1;
  return {
    start: `${startYear}-07-01`,
    end: `${endYear}-06-30`,
    label: `FY${endYear} (1 Jul ${startYear} - 30 Jun ${endYear})`,
    short: `FY${endYear}`,
  };
}

export default async function AccountantReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Two auth modes (mirrors /asset-register + /lender-report):
  //   1. Cookie auth for real browser users.
  //   2. x-pdf-token HTTP header for the server-side PDF generator.
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

  // Resolve FY -> date range. Default to current Australian FY if missing.
  const fyCode = typeof params.fy === "string" ? params.fy : null;
  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentFY = today.getUTCMonth() >= 6 ? `FY${currentYear + 1}` : `FY${currentYear}`;
  const fy = fyRange(fyCode) ?? fyRange(currentFY)!;

  const openingBookValue = (() => {
    const raw = typeof params.openingBook === "string" ? params.openingBook : null;
    if (!raw) return 0;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();

  const reportData = await generateAccountantData(
    supabase,
    userId,
    {
      reportType: "accountant",
      startDate: fy.start,
      endDate: fy.end,
      selectedPropertyIds: [],
    },
    openingBookValue,
    fy.label,
    fy.short,
  );

  return <AccountantReportTemplate data={reportData} />;
}
