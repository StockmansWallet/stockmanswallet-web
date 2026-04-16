// API route: returns a finished PDF binary of the Asset Register report.
// Uses puppeteer-core + @sparticuz/chromium to render HTML server-side,
// producing identical output to the web app's "Save as PDF".
// iOS calls this endpoint and receives a ready-to-display PDF.

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { generateAssetRegisterData } from "@/lib/services/report-service";
import { calculatePortfolioMovement } from "@/lib/services/movement-service";
import { createMovementPeriod } from "@/lib/types/portfolio-movement";
import { buildReportHTML } from "@/lib/services/report-html-builder";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // 1. Auth
  const queryToken = request.nextUrl.searchParams.get("token");
  const authHeader = request.headers.get("authorization");
  const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken;
  if (!jwt) {
    return NextResponse.json({ error: "Missing authentication token" }, { status: 401 });
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. Generate report data
  const sp = request.nextUrl.searchParams;
  const startDate = sp.get("startDate") ?? new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0];
  const endDate = sp.get("endDate") ?? new Date().toISOString().split("T")[0];
  const propertyIds = sp.get("propertyIds")?.split(",").filter(Boolean) ?? [];

  const period = createMovementPeriod("1M");
  const [reportData, movementData] = await Promise.all([
    generateAssetRegisterData(supabase, user.id, { reportType: "asset-register", startDate, endDate, selectedPropertyIds: propertyIds }),
    calculatePortfolioMovement(supabase, user.id, period, propertyIds),
  ]);

  // 3. Build HTML using the shared builder
  const html = buildReportHTML(reportData, movementData);

  // 4. Render to PDF via headless Chromium
  let browser;
  try {
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 794, height: 1123 },
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=AssetRegister.pdf",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
