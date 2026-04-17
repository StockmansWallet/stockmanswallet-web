// API route: returns a server-rendered PDF of the Asset Register.
// Puppeteer navigates to the web print template page, authenticating via an
// `x-pdf-token` HTTP header (not a query string) so the JWT never lands in
// server logs, CDN access logs, browser history, or Referer headers.

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Query params forwarded to the print template. Anything else is dropped so a
// malicious caller cannot reflect arbitrary params into the authenticated page.
const FORWARDED_PARAMS = new Set(["range", "start", "end", "properties"]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RANGE_RE = /^(1m|3m|6m|1y)$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateParam(key: string, value: string): boolean {
  if (value.length > 500) return false;
  switch (key) {
    case "range":
      return RANGE_RE.test(value);
    case "start":
    case "end":
      return DATE_RE.test(value);
    case "properties":
      return value.split(",").every((id) => id === "" || UUID_RE.test(id));
    default:
      return false;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!jwt) {
    return NextResponse.json({ error: "Missing authentication token" }, { status: 401 });
  }

  // Verify the JWT belongs to a real user before kicking off a headless browser.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Build the print URL with only allow-listed, validated params.
  const sp = request.nextUrl.searchParams;
  const printURL = new URL("/asset-register", "https://stockmanswallet.com.au");
  for (const [key, value] of sp.entries()) {
    if (!FORWARDED_PARAMS.has(key)) continue;
    if (!validateParam(key, value)) continue;
    printURL.searchParams.set(key, value);
  }

  let browser;
  try {
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 794, height: 1123 },
    });

    const page = await browser.newPage();
    // Custom header isn't logged by Vercel's request logs the way query params
    // are; it also doesn't leak via Referer to subresources.
    await page.setExtraHTTPHeaders({ "x-pdf-token": jwt });
    await page.goto(printURL.toString(), { waitUntil: "networkidle0", timeout: 30000 });

    // Switch to print media BEFORE generating the PDF so @media print rules apply.
    await page.emulateMediaType("print");

    await page.evaluate(() => {
      document.querySelectorAll(".no-print").forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    });

    // Page margins are owned by CSS @page in print-styles.tsx. Zeroing
    // Puppeteer's margins prevents it from overriding the CSS with defaults.
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
