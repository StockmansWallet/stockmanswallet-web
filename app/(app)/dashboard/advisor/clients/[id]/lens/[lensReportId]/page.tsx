import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { LensReportSummary } from "@/components/app/advisory/lens-report-summary";
import { LensReportView } from "@/components/app/advisory/lens-report-view";
import { GenerateReportButton } from "./generate-report-button";
import { DeleteLensButton } from "./delete-lens-button";
import type { LensReport } from "@/lib/types/lens-report";
import type { AdvisorLens } from "@/lib/types/advisor-lens";

export const revalidate = 0;
export const metadata = { title: "Advisor Lens" };

export default async function LensDetailPage({
  params,
}: {
  params: Promise<{ id: string; lensReportId: string }>;
}) {
  const { id: connectionId, lensReportId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Verify connection
  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id, status, permission_granted_at")
    .eq("id", connectionId)
    .single();

  if (!connection) notFound();
  const isInvolved =
    connection.requester_user_id === user.id ||
    connection.target_user_id === user.id;
  if (!isInvolved) notFound();

  const clientUserId =
    connection.requester_user_id === user.id
      ? connection.target_user_id
      : connection.requester_user_id;

  // Load lens report
  const { data: reportRow } = await supabase
    .from("lens_reports")
    .select("*")
    .eq("id", lensReportId)
    .eq("client_connection_id", connectionId)
    .eq("is_deleted", false)
    .single();

  if (!reportRow) notFound();
  const report = reportRow as LensReport;

  // Load linked advisor_lenses rows
  const { data: lensRowsRaw } = await supabase
    .from("advisor_lenses")
    .select("*")
    .eq("lens_report_id", lensReportId)
    .eq("is_deleted", false);

  const lensRows = (lensRowsRaw ?? []) as AdvisorLens[];

  // Load herds via service client
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceClient = serviceRoleKey
    ? createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
    : null;

  const herdIds = lensRows.map((l) => l.herd_id).filter(Boolean) as string[];
  const { data: herdsRaw } = serviceClient && herdIds.length > 0
    ? await serviceClient
        .from("herds")
        .select("id, name, category, breed, head_count, species")
        .in("id", herdIds)
        .eq("is_deleted", false)
    : { data: [] };

  const herds = (herdsRaw ?? []).map((h) => ({
    id: h.id as string,
    name: (h.name as string) ?? "",
    category: h.category as string,
    breed: h.breed as string,
    head_count: h.head_count as number,
  }));

  // Get names
  const { data: clientProfile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", clientUserId)
    .single();

  const { data: advisorProfile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  const clientName = clientProfile?.display_name ?? "Unknown Producer";
  const advisorName = advisorProfile?.display_name ?? "Advisor";

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-amber-500/15 text-amber-600" },
    saved: { label: "Saved", className: "bg-[#2F8CD9]/15 text-[#2F8CD9]" },
    report_generated: { label: "Report Ready", className: "bg-emerald-500/15 text-emerald-600" },
  };
  const status = statusConfig[report.status] ?? statusConfig.draft;

  return (
    <div className="max-w-[1800px] space-y-6">
      <PageHeader
        title={report.name}
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        titleHref={`/dashboard/advisor/clients/${connectionId}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge className={status.className}>{status.label}</Badge>
            {report.status === "saved" && (
              <GenerateReportButton
                connectionId={connectionId}
                lensReportId={lensReportId}
              />
            )}
            <DeleteLensButton
              connectionId={connectionId}
              lensReportId={lensReportId}
              lensName={report.name}
            />
          </div>
        }
      />

      <p className="text-sm text-text-muted">
        Lens assessment for {clientName} · Created{" "}
        {new Date(report.created_at).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      {/* Summary section (always shown) */}
      <LensReportSummary
        report={report}
        lensRows={lensRows}
        herds={herds}
      />

      {/* Report view (only when generated) */}
      {report.status === "report_generated" && report.advisor_narrative && (
        <LensReportView
          report={report}
          clientName={clientName}
          advisorName={advisorName}
        />
      )}
    </div>
  );
}
