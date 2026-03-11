// Consignment detail page - shows booking info, herd allocations, and sale actions

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Truck,
  Users,
  Calendar,
  Hash,
  FileText,
  MapPin,
} from "lucide-react";
import { ConsignmentActions } from "./consignment-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return { label: "Draft", cls: "bg-white/[0.06] text-text-muted" };
    case "confirmed":
      return { label: "Confirmed", cls: "bg-teal-500/15 text-teal-400" };
    case "completed":
      return { label: "Completed", cls: "bg-emerald-500/15 text-emerald-400" };
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
    .select("id, herd_group_id, head_count, category, average_weight, total_value")
    .eq("consignment_id", id);

  // Get herd names for each allocation
  const herdIds = (allocations ?? []).map((a) => a.herd_group_id);
  const { data: herds } = await supabase
    .from("herd_groups")
    .select("id, name, head_count, category, species")
    .in("id", herdIds.length > 0 ? herdIds : ["__none__"]);

  const herdMap = new Map((herds ?? []).map((h) => [h.id, h]));

  // Fetch linked kill sheet if present
  let killSheet: Record<string, unknown> | null = null;
  if (consignment.kill_sheet_record_id) {
    const { data: ks } = await supabase
      .from("kill_sheet_records")
      .select("id, processor_name, kill_date, total_head_count, total_gross_value, total_body_weight")
      .eq("id", consignment.kill_sheet_record_id)
      .single();
    killSheet = ks as Record<string, unknown> | null;
  }

  // Fetch unlinked kill sheets for linking
  const { data: availableKillSheets } = await supabase
    .from("kill_sheet_records")
    .select("id, processor_name, kill_date, total_head_count")
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .is("consignment_id", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const badge = statusBadge(consignment.status);
  const isCompleted = consignment.status === "completed";

  return (
    <div className="max-w-3xl">
      <div className="mb-4 sm:hidden">
        <Link href="/dashboard/tools/grid-iq/consignments">
          <Button variant="ghost" size="sm" className="gap-1.5 text-text-muted hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            Consignments
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <PageHeader
          title={consignment.processor_name}
          titleClassName="text-2xl font-bold text-teal-400"
          subtitle={
            consignment.plant_location
              ? consignment.plant_location
              : undefined
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
                valueColor="text-emerald-400"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Herd Allocations */}
      <Card className="mt-4">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <Users className="h-4 w-4 text-teal-400" />
            <span className="text-sm font-semibold text-teal-400">
              Herd Allocations ({(allocations ?? []).length})
            </span>
          </div>
          {(allocations ?? []).length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {(allocations ?? []).map((alloc) => {
                const herd = herdMap.get(alloc.herd_group_id);
                return (
                  <div key={alloc.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10">
                      <Users className="h-4 w-4 text-teal-400" />
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
                      <span className="text-sm font-semibold text-emerald-400">
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
              <FileText className="h-4 w-4 text-teal-400" />
              <span className="text-sm font-semibold text-teal-400">Linked Kill Sheet</span>
            </div>
            <Link
              href={`/dashboard/tools/grid-iq/history/${killSheet.id as string}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10">
                <FileText className="h-4 w-4 text-teal-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {killSheet.processor_name as string}
                </p>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-text-muted">
                  {(killSheet.kill_date as string | null) && (
                    <span>{new Date(killSheet.kill_date as string).toLocaleDateString("en-AU")}</span>
                  )}
                  <span>{killSheet.total_head_count as number} head</span>
                </div>
              </div>
              {(killSheet.total_gross_value as number) > 0 && (
                <span className="text-sm font-semibold text-emerald-400">
                  ${Math.round(killSheet.total_gross_value as number).toLocaleString()}
                </span>
              )}
            </Link>
          </CardContent>
        </Card>
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

      {/* Actions (client component for interactivity) */}
      {!isCompleted && (
        <ConsignmentActions
          consignmentId={id}
          status={consignment.status}
          hasKillSheet={!!consignment.kill_sheet_record_id}
          availableKillSheets={(availableKillSheets ?? []).map((ks) => ({
            id: ks.id,
            label: `${ks.processor_name}${ks.kill_date ? ` - ${new Date(ks.kill_date).toLocaleDateString("en-AU")}` : ""} (${ks.total_head_count} head)`,
          }))}
        />
      )}

      {/* Completed banner */}
      {isCompleted && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-3 text-sm font-medium text-emerald-400">
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
