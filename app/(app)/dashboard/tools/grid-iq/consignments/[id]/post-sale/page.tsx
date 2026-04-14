// Post-sale flow page - upload kill sheet, run analysis, confirm sale

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PostSaleFlow } from "@/components/grid-iq/post-sale-flow";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PostSalePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch consignment + allocations + unlinked kill sheets in parallel
  const [{ data: consignment }, { data: allocations }, { data: availableKillSheets }] = await Promise.all([
    supabase
      .from("consignments")
      .select("id, processor_name, plant_location, kill_date, total_head_count, status, processor_grid_id, kill_sheet_record_id")
      .eq("id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .single(),
    supabase
      .from("consignment_allocations")
      .select("id, herd_id, head_count, category")
      .eq("consignment_id", id),
    supabase
      .from("kill_sheet_records")
      .select("id, record_name, processor_name, kill_date, total_head_count, total_gross_value")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .is("consignment_id", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!consignment) notFound();
  if (consignment.status === "completed") notFound();

  // Get herd names
  const herdIds = (allocations ?? []).map((a) => a.herd_id);
  const { data: herds } = await supabase
    .from("herds")
    .select("id, name, category, head_count")
    .in("id", herdIds.length > 0 ? herdIds : ["__none__"]);
  const herdMap = new Map((herds ?? []).map((h) => [h.id, h]));

  // Auto-match: suggest kill sheets that match processor name or head count
  const suggestedIds = new Set<string>();
  for (const ks of availableKillSheets ?? []) {
    const nameMatch = ks.processor_name?.toLowerCase() === consignment.processor_name?.toLowerCase();
    const headMatch = ks.total_head_count && consignment.total_head_count &&
      Math.abs(ks.total_head_count - consignment.total_head_count) <= 5;
    if (nameMatch || headMatch) suggestedIds.add(ks.id);
  }

  const enrichedAllocations = (allocations ?? []).map((a) => ({
    ...a,
    herdName: herdMap.get(a.herd_id)?.name ?? "Unknown herd",
  }));

  return (
    <div className="max-w-3xl">
      <div className="mb-4 sm:hidden">
        <Link href={`/dashboard/tools/grid-iq/consignments/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-text-muted hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />Consignment
          </Button>
        </Link>
      </div>
      <PageHeader
        title="Post-Kill Analysis"
        titleClassName="text-2xl font-semibold text-text-primary"
        subtitle={`${consignment.processor_name} - ${consignment.total_head_count} head`}
        subtitleClassName="text-sm text-text-muted"
        compact
      />
      <PostSaleFlow
        consignmentId={id}
        processorName={consignment.processor_name}
        totalHead={consignment.total_head_count ?? 0}
        allocations={enrichedAllocations}
        availableKillSheets={(availableKillSheets ?? []).map((ks) => ({
          id: ks.id,
          processorName: ks.record_name || ks.processor_name,
          killDate: ks.kill_date,
          totalHeadCount: ks.total_head_count ?? 0,
          totalGrossValue: ks.total_gross_value ?? 0,
          isSuggested: suggestedIds.has(ks.id),
        }))}
      />
    </div>
  );
}
