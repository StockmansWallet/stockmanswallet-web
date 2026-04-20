// Shared Puppeteer-based PDF renderer. Used by /api/reports/generate to
// render any of the four report preview routes into an A4 PDF with
// Chrome-on-Vercel compatible binaries. Replaces the per-report
// /api/report/{type}/pdf routes that previously duplicated this logic.

import { existsSync } from "fs";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// @sparticuz/chromium ships a Linux-only binary built for Vercel's serverless
// environment. On macOS/Windows dev boxes its executablePath points at a file
// the OS can't exec (fails with `spawn ENOEXEC`). Fall back to a locally
// installed Google Chrome / Chromium when we're not on a Linux host.
const LOCAL_CHROME_PATHS = [
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  // Windows
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  // Linux (covers bare-metal dev, not Vercel)
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

async function launchBrowser() {
  // Vercel functions set VERCEL=1. We also check platform so other Linux
  // deployments that use @sparticuz/chromium work out of the box.
  const useSparticuz = !!process.env.VERCEL || process.platform === "linux";
  if (useSparticuz) {
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 794, height: 1123 },
    });
  }
  const executablePath = LOCAL_CHROME_PATHS.find((p) => existsSync(p));
  if (!executablePath) {
    throw new Error(
      "No Chrome/Chromium binary found locally. Install Google Chrome or run on Vercel.",
    );
  }
  return puppeteerCore.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 794, height: 1123 },
    // --no-sandbox is fine in local dev; Vercel path uses Sparticuz's curated
    // args set which already handles sandboxing for the containerised env.
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

// Map our public report-type slug to the internal preview route Puppeteer
// renders. Preview routes accept an `x-pdf-token` header to authenticate
// without the JWT leaking into query strings / Vercel logs / CDN caches.
const PREVIEW_PATH_BY_TYPE: Record<ReportType, string> = {
  "asset-report":         "/asset-register",
  "lender-report":        "/lender-report",
  "saleyard-comparison":  "/saleyard-comparison",
  "sales-summary":        "/sales-summary",
};

export const REPORT_TYPES = [
  "asset-report",
  "lender-report",
  "saleyard-comparison",
  "sales-summary",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export function isReportType(value: unknown): value is ReportType {
  return typeof value === "string" && (REPORT_TYPES as readonly string[]).includes(value);
}

// Only allow-listed query params flow from the caller to the preview route,
// preventing a malicious caller from reflecting arbitrary params into an
// authenticated render.
const FORWARDED_PARAMS = new Set(["range", "start", "end", "properties"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RANGE_RE = /^(1d|1w|1m|3m|6m|1y)$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateParam(key: string, value: string): boolean {
  if (value.length > 500) return false;
  switch (key) {
    case "range":      return RANGE_RE.test(value);
    case "start":
    case "end":        return DATE_RE.test(value);
    case "properties": return value.split(",").every((id) => id === "" || UUID_RE.test(id));
    default:           return false;
  }
}

interface GenerateArgs {
  reportType: ReportType;
  /** User JWT - forwarded to the preview route via x-pdf-token header. */
  jwt: string;
  /** Query params from the original caller. Filtered + validated before forwarding. */
  searchParams: URLSearchParams;
  /** Absolute origin the preview route is served from (e.g. https://stockmanswallet.com.au). */
  origin: string;
}

export async function generatePdfBuffer(args: GenerateArgs): Promise<Buffer> {
  const { reportType, jwt, searchParams, origin } = args;
  const path = PREVIEW_PATH_BY_TYPE[reportType];
  const printURL = new URL(path, origin);

  for (const [key, value] of searchParams.entries()) {
    if (!FORWARDED_PARAMS.has(key)) continue;
    if (!validateParam(key, value)) continue;
    printURL.searchParams.set(key, value);
  }

  let browser;
  try {
    browser = await launchBrowser();

    const page = await browser.newPage();
    // JWT in a custom header avoids logging via Vercel access logs, browser
    // history, and Referer to subresources. Preview pages accept it.
    await page.setExtraHTTPHeaders({ "x-pdf-token": jwt });
    await page.goto(printURL.toString(), { waitUntil: "networkidle0", timeout: 30000 });

    // Apply @media print rules before capturing.
    await page.emulateMediaType("print");

    // Safety: strip any surviving .no-print elements that the preview
    // template might still render (e.g. the PrintActions banner if someone
    // brings it back). Puppeteer captures what's visible at PDF time.
    await page.evaluate(() => {
      document.querySelectorAll(".no-print").forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    });

    // Page size + margins are driven by CSS @page in print-styles.tsx.
    // Zeroing Puppeteer margins prevents it from layering its defaults on
    // top of the CSS.
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    if (browser) await browser.close();
  }
}

// ----- Filename + title helpers ---------------------------------------------

const TITLE_BY_TYPE: Record<ReportType, string> = {
  "asset-report":        "Asset Report",
  "lender-report":       "Lender Report",
  "saleyard-comparison": "Saleyard Comparison",
  "sales-summary":       "Sales Summary",
};

const PASCAL_BY_TYPE: Record<ReportType, string> = {
  "asset-report":        "AssetReport",
  "lender-report":       "LenderReport",
  "saleyard-comparison": "SaleyardComparison",
  "sales-summary":       "SalesSummary",
};

export function reportTitle(reportType: ReportType): string {
  return TITLE_BY_TYPE[reportType];
}

/**
 * Build a PDF filename including the report's date range, e.g.
 *   AssetReport_2026-04-01_to_2026-04-20.pdf
 */
export function reportFilename(
  reportType: ReportType,
  startDate: string | null,
  endDate: string | null
): string {
  const slug = PASCAL_BY_TYPE[reportType];
  if (startDate && endDate && DATE_RE.test(startDate) && DATE_RE.test(endDate)) {
    return `${slug}_${startDate}_to_${endDate}.pdf`;
  }
  return `${slug}.pdf`;
}
