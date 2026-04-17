// API route: returns a server-rendered PDF of the Asset Register.
// Puppeteer navigates to the actual web print template page with ?token= auth,
// producing identical output to the web app's "Save as PDF".

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";

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

  // Verify token is valid
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. Build the print template URL with the token for auth.
  // Forward every filter param the UI set (range, start, end, properties) so the PDF
  // reflects the user's chosen date range and property selection. parseReportConfig
  // on the print template reads start / end / properties directly.
  const sp = request.nextUrl.searchParams;
  const printURL = new URL("/asset-register", "https://stockmanswallet.com.au");
  for (const [key, value] of sp.entries()) {
    if (key === "token") continue; // Set explicitly below
    printURL.searchParams.set(key, value);
  }
  printURL.searchParams.set("token", jwt);

  // 3. Launch Puppeteer, navigate to the actual print template, generate PDF
  let browser;
  try {
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 794, height: 1123 },
    });

    const page = await browser.newPage();
    await page.goto(printURL.toString(), { waitUntil: "networkidle0", timeout: 30000 });

    // Switch to print media BEFORE generating the PDF so @media print rules apply.
    // Without this, Chromium renders with screen media - the app's dark body background
    // bleeds into the @page margin area and the PDF shows black bars at the top of each
    // page and between pages. Print media forces body { background: white !important; }.
    await page.emulateMediaType("print");

    // Hide the print toolbar
    await page.evaluate(() => {
      document.querySelectorAll(".no-print").forEach(el => {
        (el as HTMLElement).style.display = "none";
      });
    });

    // Page margins are owned by CSS @page in print-styles.tsx (16mm top, 10mm bottom for the
    // page counter, horizontal handled by .report-page). Zeroing Puppeteer's margins here
    // prevents it from silently overriding the CSS with defaults.
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=AssetRegister.pdf",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("PDF generation error:", message);
    return NextResponse.json({ error: "PDF generation failed", detail: message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
