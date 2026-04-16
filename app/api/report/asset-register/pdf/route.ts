// API route: returns a finished PDF of the Asset Register.
// Uses Puppeteer to navigate to the actual web print template page
// with Supabase auth cookies, producing identical output to the web app's "Save as PDF".

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Debug: Supabase project ref for cookie name
const SUPABASE_PROJECT_REF = "glxnmljnuzigyqydsxhc";
const COOKIE_CHUNK_SIZE = 3500;

export async function GET(request: NextRequest) {
  // 1. Auth
  const queryToken = request.nextUrl.searchParams.get("token");
  const authHeader = request.headers.get("authorization");
  const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken;
  if (!jwt) {
    return NextResponse.json({ error: "Missing authentication token" }, { status: 401 });
  }

  // Verify the token
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. Build the print template URL (the same page the web app uses)
  const sp = request.nextUrl.searchParams;
  const startDate = sp.get("startDate") ?? "";
  const endDate = sp.get("endDate") ?? "";
  const propertyIds = sp.get("propertyIds") ?? "";

  const printURL = new URL("/asset-register", "https://stockmanswallet.com.au");
  if (startDate) printURL.searchParams.set("startDate", startDate);
  if (endDate) printURL.searchParams.set("endDate", endDate);
  if (propertyIds) printURL.searchParams.set("propertyIds", propertyIds);

  // 3. Build Supabase auth cookies matching @supabase/ssr format.
  // We construct the session JSON directly from the JWT since the Supabase client
  // was created with a header, not a session store (getSession() would return null).
  // The web middleware only needs a valid access_token to authenticate.
  const sessionJSON = JSON.stringify({
    access_token: jwt,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "",
    user: {
      id: user.id,
      email: user.email ?? "",
      role: user.role ?? "authenticated",
    },
  });

  // Debug: Chunk the cookie if it's too large (matching @supabase/ssr chunking)
  const cookieBase = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
  const cookies: { name: string; value: string; domain: string; path: string }[] = [];

  if (sessionJSON.length <= COOKIE_CHUNK_SIZE) {
    cookies.push({ name: cookieBase, value: encodeURIComponent(sessionJSON), domain: "stockmanswallet.com.au", path: "/" });
  } else {
    const encoded = encodeURIComponent(sessionJSON);
    for (let i = 0; i < encoded.length; i += COOKIE_CHUNK_SIZE) {
      const chunk = encoded.slice(i, i + COOKIE_CHUNK_SIZE);
      cookies.push({ name: `${cookieBase}.${Math.floor(i / COOKIE_CHUNK_SIZE)}`, value: chunk, domain: "stockmanswallet.com.au", path: "/" });
    }
  }

  // 4. Launch Puppeteer, set cookies, navigate to the print template
  let browser;
  try {
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 794, height: 1123 },
    });

    const page = await browser.newPage();

    // Set auth cookies before navigation
    await page.setCookie(...cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      httpOnly: false,
      secure: true,
      sameSite: "Lax" as const,
    })));

    // Navigate to the actual web print template page
    await page.goto(printURL.toString(), { waitUntil: "networkidle0", timeout: 30000 });

    // Hide the print actions toolbar (it has a .no-print class but also hide via JS)
    await page.evaluate(() => {
      document.querySelectorAll("[data-print-actions], .no-print").forEach(el => {
        (el as HTMLElement).style.display = "none";
      });
    });

    // Generate PDF with the same settings as browser print
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
    const message = error instanceof Error ? error.message : String(error);
    console.error("PDF generation error:", message);
    return NextResponse.json({ error: "PDF generation failed", detail: message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
