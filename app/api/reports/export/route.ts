// POST /api/reports/export
//
// Generates a CSV or XLSX export for a given report type and returns the
// file body directly as a download. Unlike the PDF endpoint this does not
// render the report page via Puppeteer; it consumes the same ReportData the
// page uses and writes it to a tabular format. That means:
//   - much faster (no browser cold start)
//   - no Supabase Storage round-trip (files are small)
//   - one source of truth for data; CSV and XLSX cannot drift from PDF

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  generateAssetRegisterData,
  generateSalesSummaryData,
  generateSaleyardComparisonData,
  generateLandValueData,
  generatePropertyComparisonData,
} from "@/lib/services/report-service";
import { calculatePortfolioMovement } from "@/lib/services/movement-service";
import { parseReportConfig } from "@/lib/utils/report-config";
import { buildWorkbook } from "@/lib/exports/build-rows";
import { workbookToCsv } from "@/lib/exports/csv";
import { workbookToXlsx } from "@/lib/exports/xlsx";
import type { ReportConfiguration, ReportData } from "@/lib/types/reports";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const EXPORTABLE_REPORT_TYPES = [
  "asset-report",
  "lender-report",
  "sales-summary",
  "saleyard-comparison",
  "value-vs-land-area",
  "property-comparison",
] as const;
type ExportableReportType = (typeof EXPORTABLE_REPORT_TYPES)[number];

function isExportableReportType(value: unknown): value is ExportableReportType {
  return typeof value === "string"
    && (EXPORTABLE_REPORT_TYPES as readonly string[]).includes(value);
}

function isFormat(value: unknown): value is "csv" | "xlsx" {
  return value === "csv" || value === "xlsx";
}

const ALLOWED_CONFIG_KEYS = new Set(["range", "start", "end", "properties"]);

function buildReportConfig(
  reportType: ExportableReportType,
  raw: Record<string, string>,
): ReportConfiguration {
  const parsed = parseReportConfig(raw);
  return {
    reportType: reportType === "lender-report" ? "asset-register" : (reportType as unknown as ReportConfiguration["reportType"]),
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    selectedPropertyIds: parsed.selectedPropertyIds,
  };
}

async function generate(
  reportType: ExportableReportType,
  userId: string,
  config: ReportConfiguration,
): Promise<ReportData> {
  const supabase = createServiceRoleClient();
  switch (reportType) {
    case "asset-report":
    case "lender-report":
      return generateAssetRegisterData(supabase, userId, config);
    case "sales-summary":
      return generateSalesSummaryData(supabase, userId, config);
    case "saleyard-comparison":
      return generateSaleyardComparisonData(supabase, userId, config);
    case "value-vs-land-area":
      return generateLandValueData(supabase, userId, config);
    case "property-comparison":
      return generatePropertyComparisonData(supabase, userId, config);
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!jwt) {
    return NextResponse.json({ error: "Missing authentication token" }, { status: 401 });
  }

  const verifyClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error: authError } = await verifyClient.auth.getUser(jwt);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let body: { reportType?: unknown; format?: unknown; config?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reportType = body.reportType;
  if (!isExportableReportType(reportType)) {
    return NextResponse.json({ error: "Unknown or unexportable reportType" }, { status: 400 });
  }

  const format = body.format;
  if (!isFormat(format)) {
    return NextResponse.json({ error: "format must be 'csv' or 'xlsx'" }, { status: 400 });
  }

  const rawConfig: Record<string, string> = {};
  if (body.config && typeof body.config === "object") {
    for (const [key, value] of Object.entries(body.config as Record<string, unknown>)) {
      if (!ALLOWED_CONFIG_KEYS.has(key)) continue;
      if (typeof value !== "string") continue;
      rawConfig[key] = value;
    }
  }

  const config = buildReportConfig(reportType, rawConfig);

  let reportData: ReportData;
  try {
    reportData = await generate(reportType, user.id, config);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/reports/export] data generation failed:", message);
    return NextResponse.json({ error: "Report generation failed", detail: message }, { status: 500 });
  }

  // Asset + Lender reports benefit from a Movement Bridge sheet alongside
  // the herd table so lenders see the period movement in one file.
  let movement = null;
  if (reportType === "asset-report" || reportType === "lender-report") {
    try {
      const supabase = createServiceRoleClient();
      movement = await calculatePortfolioMovement(
        supabase,
        user.id,
        { preset: "custom", startDate: config.startDate, endDate: config.endDate, label: "Custom" },
        config.selectedPropertyIds,
      );
    } catch (err) {
      // Non-fatal: the herd sheet is the primary payload. Log and carry on.
      console.warn("[/api/reports/export] movement generation failed (continuing without):", err);
    }
  }

  const workbook = buildWorkbook({ reportType, reportData, movement });

  if (format === "csv") {
    const csv = workbookToCsv(workbook);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${workbook.filenameStem}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const xlsx = await workbookToXlsx(workbook);
  return new NextResponse(xlsx as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${workbook.filenameStem}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
