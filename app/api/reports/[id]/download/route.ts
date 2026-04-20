// GET /api/reports/:id/download
//
// Returns a fresh 24-hour signed URL for an existing report_exports row.
// Owner-only for now; share_token support added later (Producer Chat flow).
// Useful for reopening a previously-generated PDF without re-rendering.

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { reportFilename, isReportType } from "@/lib/pdf/generate";

export const dynamic = "force-dynamic";

const BUCKET = "reports";
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  const service = createServiceRoleClient();
  const { data: row, error: rowError } = await service
    .from("report_exports")
    .select("id, user_id, report_type, title, storage_path, config_json, revoked_at")
    .eq("id", id)
    .maybeSingle();

  if (rowError) {
    console.error("[/api/reports/:id/download] row lookup failed:", rowError);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (row.revoked_at) return NextResponse.json({ error: "Revoked" }, { status: 410 });

  const cfg = (row.config_json ?? {}) as Record<string, string | undefined>;
  const filename = isReportType(row.report_type)
    ? reportFilename(row.report_type, {
        startDate: cfg.start ?? null,
        endDate: cfg.end ?? null,
        fy: cfg.fy ?? null,
      })
    : "Report.pdf";

  const { data: signed, error: signError } = await service.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS, { download: filename });

  if (signError || !signed?.signedUrl) {
    console.error("[/api/reports/:id/download] sign failed:", signError);
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 });
  }

  return NextResponse.json({
    id: row.id,
    title: row.title,
    filename,
    signedUrl: signed.signedUrl,
    expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
  });
}
