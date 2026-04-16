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

  // 2. Build the print template URL with the token for auth
  const sp = request.nextUrl.searchParams;
  const printURL = new URL("/asset-register", "https://stockmanswallet.com.au");
  printURL.searchParams.set("token", jwt);
  if (sp.get("startDate")) printURL.searchParams.set("startDate", sp.get("startDate")!);
  if (sp.get("endDate")) printURL.searchParams.set("endDate", sp.get("endDate")!);
  if (sp.get("propertyIds")) printURL.searchParams.set("propertyIds", sp.get("propertyIds")!);

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

    // Hide the print toolbar
    await page.evaluate(() => {
      document.querySelectorAll(".no-print").forEach(el => {
        (el as HTMLElement).style.display = "none";
      });
    });

    // Debug: 6mm top margin on every page creates white space at the top.
    // Page 1: 6mm (Puppeteer) + 6mm (CSS .report-page padding) = 12mm total.
    // Pages 2+: 6mm of white space so content doesn't sit flush against the edge.
    // @page { margin: 0 } keeps pages flush with no black gap between them.
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", right: "0", bottom: "0", left: "0" },
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
