// Consignment detail page - shows booking info, herd allocations, and sale actions

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Truck,
  Users,
  Calendar,
  Hash,
  FileText,
  MapPin,
} from "lucide-react";
import { ConsignmentActions } from "./consignment-actions";
import { TrendingUp } from "lucide-react";
import { PostSaleFlow } from "@/components/grid-iq/post-sale-flow";
import {
  deriveSexFromCategory,
  type Sex,
} from "@/lib/grid-iq/category-sex";

interface SexBreakdown {
  male: number;
  female: number;
  unknown: number;
  dominant: Sex; // "Unknown" when no rows or a tied mix
}

function summariseSex(rows: { head: number; sex: Sex }[]): SexBreakdown {
  let male = 0;
  let female = 0;
  let unknown = 0;
  for (const r of rows) {
    if (r.sex === "Male") male += r.head;
    else if (r.sex === "Female") female += r.head;
    else unknown += r.head;
  }
  let dominant: Sex = "Unknown";
  if (male > 0 && male >= female) dominant = "Male";
  else if (female > 0 && female > male) dominant = "Female";
  // A tied non-zero mix stays Unknown so the banner treats it as "mixed".
  if (male > 0 && female > 0 && male === female) dominant = "Unknown";
  return { male, female, unknown, dominant };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return { label: "Draft", cls: "bg-white/[0.06] text-text-muted" };
    case "confirmed":
      return { label: "Confirmed", cls: "bg-teal/15 text-teal" };
    case "completed":
      return { label: "Completed", cls: "bg-success/15 text-success" };
    default:
      return { label: status, cls: "bg-white/[0.06] text-text-muted" };
  }
}

export default async function ConsignmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: consignment } = await supabase
    .from("consignments")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .single();

  if (!consignment) notFound();

  // Fetch allocations with herd names
  const { data: allocations } = await supabase
    .from("consignment_allocations")
    .select("id, herd_id, head_count, category, average_weight, total_value")
    .eq("consignment_id", id);

  // Get herd names for each allocation. Scoped to the signed-in user and
  // excludes soft-deleted rows.
  const herdIds = (allocations ?? []).map((a) => a.herd_id);
  const { data: herds } = await supabase
    .from("herds")
    .select("id, name, head_count, category, species")
    .in("id", herdIds.length > 0 ? herdIds : ["__none__"])
    .eq("user_id", user!.id)
    .eq("is_deleted", false);

  const herdMap = new Map((herds ?? []).map((h) => [h.id, h]));

  // Fetch linked kill sheet if present. Scoped to the signed-in user and
  // excludes soft-deleted rows.
  let killSheet: Record<string, unknown> | null = null;
  if (consignment.kill_sheet_record_id) {
    const { data: ks } = await supabase
      .from("kill_sheet_records")
      .select("id, record_name, processor_name, kill_date, total_head_count, total_gross_value, total_body_weight")
      .eq("id", consignment.kill_sheet_record_id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .single();
    killSheet = ks as Record<string, unknown> | null;
  }

  // Fetch linked analyses
  const { data: linkedAnalyses } = await supabase
    .from("grid_iq_analyses")
    .select("id, analysis_mode, analysis_date, grid_iq_advantage, kill_score, head_count")
    .eq("consignment_id", id)
    .eq("is_deleted", false)
    .order("analysis_date", { ascending: false });

  const preSaleAnalysis = (linkedAnalyses ?? []).find((a) => a.analysis_mode === "pre_sale");
  const postSaleAnalysis = (linkedAnalyses ?? []).find((a) => a.analysis_mode === "post_sale");

  // Fetch kill sheets available to link to this consignment. Includes rows
  // that are unlinked, OR linked to another non-completed draft/confirmed
  // consignment (which the user can re-link here), OR linked to a consignment
  // that has been soft-deleted. A kill sheet already tied to a completed sale
  // stays locked to that sale.
  // line_items is pulled so the sex composition of each sheet can be rendered
  // in the link-time banner and used to filter the analysis downstream.
  const { data: allKillSheets } = await supabase
    .from("kill_sheet_records")
    .select(
      "id, record_name, processor_name, kill_date, total_head_count, total_gross_value, consignment_id, line_items"
    )
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(100);

  // Resolve each candidate's owning consignment (if any) so we can filter out
  // kill sheets locked to a completed sale.
  const ownerConsignmentIds = Array.from(
    new Set(
      (allKillSheets ?? [])
        .map((k) => k.consignment_id as string | null)
        .filter((v): v is string => typeof v === "string")
    )
  );
  const ownerStatusMap = new Map<string, { status: string; is_deleted: boolean }>();
  if (ownerConsignmentIds.length > 0) {
    const { data: owners } = await supabase
      .from("consignments")
      .select("id, status, is_deleted")
      .in("id", ownerConsignmentIds);
    for (const o of owners ?? []) {
      ownerStatusMap.set(o.id as string, {
        status: o.status as string,
        is_deleted: o.is_deleted as boolean,
      });
    }
  }

  const availableKillSheets = (allKillSheets ?? []).filter((k) => {
    const owner = k.consignment_id
      ? ownerStatusMap.get(k.consignment_id as string)
      : null;
    if (!owner) return true; // unlinked or owner missing
    if (owner.is_deleted) return true; // owner consignment soft-deleted
    if (owner.status === "completed") return false; // locked to a completed sale
    return true; // draft / confirmed owner: re-link allowed
  });

  const badge = statusBadge(consignment.status);
  const isCompleted = consignment.status === "completed";
  const hasGrid = !!consignment.processor_grid_id;

  // PostSaleFlow owns the whole post-kill -> confirm-sale path whenever a grid
  // is attached. It picks its own stage: "confirm" if an analysis already
  // exists, otherwise "select".
  const showPostSaleFlow = !isCompleted && hasGrid;
  const canRunPostKill = showPostSaleFlow && !postSaleAnalysis;

  // Auto-match: suggest kill sheets by processor name or head count proximity
  const suggestedIds = new Set<string>();
  if (canRunPostKill) {
    for (const ks of availableKillSheets ?? []) {
      const nameMatch =
        ks.processor_name?.toLowerCase() ===
        consignment.processor_name?.toLowerCase();
      const headMatch =
        ks.total_head_count &&
        consignment.total_head_count &&
        Math.abs(ks.total_head_count - consignment.total_head_count) <= 5;
      if (nameMatch || headMatch) suggestedIds.add(ks.id);
    }
  }

  const enrichedAllocations = (allocations ?? []).map((a) => ({
    ...a,
    herdName: herdMap.get(a.herd_id)?.name ?? "Unknown herd",
  }));

  // Derive consignment sex composition from allocations. A consignment can be
  // single-sex (all steers / all heifers) or mixed. The banner logic uses the
  // dominant sex; if head counts are tied or both are present we flag it as
  // "Mixed" and skip the banner warning.
  const consignmentSex = summariseSex(
    (allocations ?? []).map((a) => ({
      head: a.head_count ?? 0,
      sex: deriveSexFromCategory(a.category),
    }))
  );

  // Per-kill-sheet sex breakdown, derived from line_items. Rows with blank or
  // unrecognised categories fall into the Unknown bucket (counted against
  // both sexes so the analysis doesn't silently drop them).
  const killSheetSexMap = new Map<string, SexBreakdown>();
  for (const ks of availableKillSheets ?? []) {
    const items = (ks.line_items ?? []) as Array<{ sex?: string; category?: string }>;
    killSheetSexMap.set(
      ks.id,
      summariseSex(
        items.map((item) => ({
          head: 1,
          sex:
            (item.sex as Sex | undefined) ??
            deriveSexFromCategory(item.category),
        }))
      )
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <PageHeader feature="grid-iq"
          title={consignment.consignment_name || consignment.processor_name}
          titleClassName="text-2xl font-bold text-teal"
          subtitle={
            consignment.consignment_name
              ? `${consignment.processor_name}${consignment.plant_location ? ` - ${consignment.plant_location}` : ""}`
              : consignment.plant_location || undefined
          }
          subtitleClassName="text-sm text-text-secondary"
          compact
        />
        <span className={`mt-1 rounded-full px-3 py-1 text-xs font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Booking Info */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {consignment.kill_date && (
              <InfoItem
                icon={Calendar}
                label="Kill Date"
                value={new Date(consignment.kill_date).toLocaleDateString("en-AU")}
              />
            )}
            {consignment.booking_reference && (
              <InfoItem
                icon={Hash}
                label="Booking Ref"
                value={consignment.booking_reference}
              />
            )}
            <InfoItem
              icon={Users}
              label="Total Head"
              value={`${consignment.total_head_count ?? 0}`}
            />
            {consignment.total_gross_value != null && consignment.total_gross_value > 0 && (
              <InfoItem
                icon={Truck}
                label="Gross Value"
                value={`$${Math.round(consignment.total_gross_value).toLocaleString()}`}
                valueColor="text-success"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Herd Allocations */}
      <Card className="mt-4">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <Users className="h-4 w-4 text-teal" />
            <span className="text-sm font-semibold text-teal">
              Herd Allocations ({(allocations ?? []).length})
            </span>
          </div>
          {(allocations ?? []).length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {(allocations ?? []).map((alloc) => {
                const herd = herdMap.get(alloc.herd_id);
                return (
                  <div key={alloc.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/10">
                      <Users className="h-4 w-4 text-teal" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {herd?.name ?? "Unknown herd"}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-text-muted">
                        <span>{alloc.head_count} head</span>
                        {alloc.category && <span>{alloc.category}</span>}
                        {herd?.species && <span>{herd.species}</span>}
                      </div>
                    </div>
                    {alloc.total_value != null && alloc.total_value > 0 && (
                      <span className="text-sm font-semibold text-success">
                        ${Math.round(alloc.total_value).toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-text-muted">
              No allocations found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Kill Sheet */}
      {killSheet && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <FileText className="h-4 w-4 text-teal" />
              <span className="text-sm font-semibold text-teal">Linked Kill Sheet</span>
            </div>
            <Link
              href={`/dashboard/tools/grid-iq/kill-sheets/${killSheet.id as string}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/10">
                <FileText className="h-4 w-4 text-teal" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {(killSheet.record_name as string | null) || (killSheet.processor_name as string)}
                </p>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-text-muted">
                  {(killSheet.kill_date as string | null) && (
                    <span>{new Date(killSheet.kill_date as string).toLocaleDateString("en-AU")}</span>
                  )}
                  <span>{killSheet.total_head_count as number} head</span>
                </div>
              </div>
              {(killSheet.total_gross_value as number) > 0 && (
                <span className="text-sm font-semibold text-success">
                  ${Math.round(killSheet.total_gross_value as number).toLocaleString()}
                </span>
              )}
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Linked Analyses */}
      {(preSaleAnalysis || postSaleAnalysis) && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <TrendingUp className="h-4 w-4 text-teal" />
              <span className="text-sm font-semibold text-teal">Analyses</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {preSaleAnalysis && (
                <Link
                  href={`/dashboard/tools/grid-iq/analysis/${preSaleAnalysis.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/10">
                    <TrendingUp className="h-4 w-4 text-teal" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">Pre-Sale Comparison</p>
                    <p className="text-xs text-text-muted">
                      {new Date(preSaleAnalysis.analysis_date).toLocaleDateString("en-AU")}
                      {preSaleAnalysis.grid_iq_advantage != null && (
                        <span className={preSaleAnalysis.grid_iq_advantage > 0 ? " text-success" : " text-warning"}>
                          {" "}Grid IQ: ${Math.abs(Math.round(preSaleAnalysis.grid_iq_advantage)).toLocaleString()}
                          {preSaleAnalysis.grid_iq_advantage > 0 ? " processor" : " saleyard"}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              )}
              {postSaleAnalysis && (
                <Link
                  href={`/dashboard/tools/grid-iq/analysis/${postSaleAnalysis.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10">
                    <TrendingUp className="h-4 w-4 text-warning" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">Post-Kill Analysis</p>
                    <p className="text-xs text-text-muted">
                      {new Date(postSaleAnalysis.analysis_date).toLocaleDateString("en-AU")}
                      {postSaleAnalysis.kill_score != null && (
                        <span> - Kill Score: {postSaleAnalysis.kill_score}</span>
                      )}
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inline post-kill / confirm-sale flow */}
      {showPostSaleFlow && (
        <div id="post-sale" className="mt-6 space-y-3">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
            <TrendingUp className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-warning">
              {postSaleAnalysis ? "Confirm Sale" : "Post-Kill Analysis"}
            </h3>
          </div>
          {!postSaleAnalysis && preSaleAnalysis ? (
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/[0.06] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/20">
                <FileText className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-warning">
                  Awaiting kill sheet
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Pre-sale analysis is done. When the processor sends the kill
                  sheet, upload it below to reconcile actual returns against the
                  prediction.
                </p>
              </div>
            </div>
          ) : !postSaleAnalysis ? (
            <p className="text-xs text-text-muted">
              Upload the actual kill sheet from the processor to reconcile the sale
              and generate the post-kill analysis.
            </p>
          ) : null}
          <PostSaleFlow
            consignmentId={id}
            processorName={consignment.processor_name}
            totalHead={consignment.total_head_count ?? 0}
            allocations={enrichedAllocations}
            existingAnalysisId={postSaleAnalysis?.id ?? null}
            consignmentSex={consignmentSex}
            availableKillSheets={(availableKillSheets ?? []).map((ks) => ({
              id: ks.id,
              processorName: ks.record_name || ks.processor_name,
              killDate: ks.kill_date,
              totalHeadCount: ks.total_head_count ?? 0,
              totalGrossValue: ks.total_gross_value ?? 0,
              isSuggested: suggestedIds.has(ks.id),
              sexBreakdown: killSheetSexMap.get(ks.id) ?? {
                male: 0,
                female: 0,
                unknown: 0,
                dominant: "Unknown",
              },
            }))}
          />
        </div>
      )}

      {/* Notes */}
      {consignment.notes && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-text-muted">Notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-text-secondary">
              {consignment.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions (client component for interactivity).
          When a grid is attached, PostSaleFlow owns link + complete. This
          component collapses to just the delete button. When no grid is
          attached (legacy/manual consignment), the full Link + Complete Sale
          path stays available. */}
      {!isCompleted && (
        <ConsignmentActions
          consignmentId={id}
          status={consignment.status}
          hasKillSheet={!!consignment.kill_sheet_record_id}
          hasGrid={hasGrid}
          availableKillSheets={(availableKillSheets ?? []).map((ks) => ({
            id: ks.id,
            label: `${ks.record_name || ks.processor_name}${ks.kill_date ? ` - ${new Date(ks.kill_date).toLocaleDateString("en-AU")}` : ""} (${ks.total_head_count} head)`,
          }))}
        />
      )}

      {/* Completed banner */}
      {isCompleted && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-success/10 py-3 text-sm font-medium text-success">
          <Truck className="h-4 w-4" />
          Sale completed - herd records updated
        </div>
      )}

      {/* Timestamps */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-text-muted">
        <span>Created {new Date(consignment.created_at).toLocaleDateString("en-AU")}</span>
        <span>Updated {new Date(consignment.updated_at).toLocaleDateString("en-AU")}</span>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  valueColor = "text-text-primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="text-center">
      <div className="mb-0.5 flex items-center justify-center gap-1">
        <Icon className="h-3 w-3 text-text-muted" />
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      </div>
      <p className={`text-sm font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
