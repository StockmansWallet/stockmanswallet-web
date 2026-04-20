// POST /api/reports/generate
//
// Renders a PDF via server-side Puppeteer, uploads it to Supabase Storage,
// and records a row in report_exports. Returns { id, signedUrl, title,
// filename, expiresAt } so the caller can open the PDF immediately.
//
// Replaces the per-report /api/report/{asset-register,sales-summary}/pdf
// routes that streamed PDFs without persistence. The storage-backed model
// makes the same artifact available for re-download, sharing (share_token
// column, future), and future clients (iOS, email, Producer Chat).

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  generatePdfBuffer,
  isReportType,
  reportFilename,
  reportTitle,
} from "@/lib/pdf/generate";
import { parseReportConfig } from "@/lib/utils/report-config";

export const dynamic = "force-dynamic";
// Puppeteer cold-start + render can exceed the Next default. 60 s matches
// the old per-report routes.
export const maxDuration = 60;

const BUCKET = "reports";
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// Input validation: we expect the caller to have already filtered search
// params on the way in (ReportExport forwards only range/start/end/
// properties). We revalidate in generatePdfBuffer regardless.
const ALLOWED_CONFIG_KEYS = new Set(["range", "start", "end", "properties"]);

// Caller picks whether the signed URL should force a download or open
// inline in the browser's PDF viewer. Defaults to attachment so the
// existing download flow keeps working for callers that don't pass it.
type Disposition = "attachment" | "inline";
function normaliseDisposition(v: unknown): Disposition {
  return v === "inline" ? "inline" : "attachment";
}

export async function POST(request: NextRequest) {
  // ----- Auth -------------------------------------------------------------
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

  // ----- Body -------------------------------------------------------------
  let body: { reportType?: unknown; config?: unknown; disposition?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reportType = body.reportType;
  if (!isReportType(reportType)) {
    return NextResponse.json({ error: "Unknown reportType" }, { status: 400 });
  }

  const disposition = normaliseDisposition(body.disposition);

  // Build a sanitised URLSearchParams from the caller-supplied config. Only
  // keys we explicitly allow flow through to Puppeteer, which independently
  // validates values.
  const searchParams = new URLSearchParams();
  if (body.config && typeof body.config === "object") {
    for (const [key, value] of Object.entries(body.config as Record<string, unknown>)) {
      if (!ALLOWED_CONFIG_KEYS.has(key)) continue;
      if (typeof value !== "string") continue;
      searchParams.set(key, value);
    }
  }

  // Resolve the effective date range. Callers usually pass just `range` (a
  // preset like "1y") and let parseReportConfig derive the concrete
  // start/end. We do that on the server so the filename always includes the
  // actual date range regardless of which params the caller sent.
  const configForDates = parseReportConfig(Object.fromEntries(searchParams.entries()));
  const startDate = configForDates.startDate;
  const endDate = configForDates.endDate;

  // ----- Render PDF -------------------------------------------------------
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePdfBuffer({
      reportType,
      jwt,
      searchParams,
      origin: request.nextUrl.origin,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/reports/generate] PDF render failed:", message);
    return NextResponse.json(
      { error: "PDF generation failed", detail: message },
      { status: 500 },
    );
  }

  // ----- Persist ----------------------------------------------------------
  const exportId = randomUUID();
  const storagePath = `${user.id}/${exportId}.pdf`;
  const title = reportTitle(reportType);
  const filename = reportFilename(reportType, startDate, endDate);

  const service = createServiceRoleClient();

  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("[/api/reports/generate] storage upload failed:", uploadError);
    return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
  }

  const { error: insertError } = await service
    .from("report_exports")
    .insert({
      id: exportId,
      user_id: user.id,
      report_type: reportType,
      title,
      config_json: Object.fromEntries(searchParams.entries()),
      storage_path: storagePath,
    });

  if (insertError) {
    // Roll back the uploaded file so we don't leak storage on insert failure.
    await service.storage.from(BUCKET).remove([storagePath]);
    console.error("[/api/reports/generate] insert failed:", insertError);
    return NextResponse.json({ error: "Failed to record export" }, { status: 500 });
  }

  // ----- Signed URL -------------------------------------------------------
  // `download: filename` sets Content-Disposition: attachment on the
  // response, forcing the browser to save the file with the friendly
  // filename. Omitting it defaults to inline, which lets the browser
  // display the PDF in its built-in viewer for preview.
  const signOptions = disposition === "attachment" ? { download: filename } : undefined;
  const { data: signed, error: signError } = await service.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, signOptions);

  if (signError || !signed?.signedUrl) {
    console.error("[/api/reports/generate] signed URL failed:", signError);
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 });
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();

  return NextResponse.json({
    id: exportId,
    title,
    filename,
    signedUrl: signed.signedUrl,
    expiresAt,
  });
}
