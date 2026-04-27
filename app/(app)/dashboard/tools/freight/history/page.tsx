import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SavedEstimatesList, type SavedEstimate } from "./saved-estimates-list";

export const metadata = { title: "Saved Freight Estimates" };

export default async function FreightHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Columns match iOS SavedFreightEstimateDTO. Soft-deleted rows are filtered out.
  const { data } = await supabase
    .from("saved_freight_estimates")
    .select(
      "id, origin_property_name, destination_name, herd_name, category_name, head_count, average_weight_kg, heads_per_deck, decks_required, distance_km, rate_per_deck_per_km, total_cost, cost_per_head, cost_per_deck, cost_per_km, has_partial_deck, spare_spots_on_last_deck, is_custom_job, category_warning, efficiency_prompt, breeder_auto_detect_notice, short_cart_notice, assumptions_summary, saved_at"
    )
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("saved_at", { ascending: false });

  const estimates: SavedEstimate[] = (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    return {
      id: r.id as string,
      originPropertyName: (r.origin_property_name as string) ?? "",
      destinationName: (r.destination_name as string) ?? "",
      herdName: (r.herd_name as string) ?? "",
      categoryName: (r.category_name as string) ?? "",
      headCount: Number(r.head_count ?? 0),
      averageWeightKg: Number(r.average_weight_kg ?? 0),
      headsPerDeck: Number(r.heads_per_deck ?? 0),
      decksRequired: Number(r.decks_required ?? 0),
      distanceKm: Number(r.distance_km ?? 0),
      ratePerDeckPerKm: Number(r.rate_per_deck_per_km ?? 0),
      totalCost: Number(r.total_cost ?? 0),
      costPerHead: Number(r.cost_per_head ?? 0),
      costPerDeck: Number(r.cost_per_deck ?? 0),
      costPerKm: Number(r.cost_per_km ?? 0),
      assumptionsSummary: (r.assumptions_summary as string) ?? "",
      categoryWarning: (r.category_warning as string | null) ?? null,
      efficiencyPrompt: (r.efficiency_prompt as string | null) ?? null,
      breederAutoDetectNotice: (r.breeder_auto_detect_notice as string | null) ?? null,
      shortCartNotice: (r.short_cart_notice as string | null) ?? null,
      savedAt: (r.saved_at as string) ?? "",
    };
  });

  return (
    <div className="w-full max-w-[1680px]">
      <Link
        href="/dashboard/tools/freight"
        className="bg-surface-lowest text-text-secondary hover:text-text-primary mb-4 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Freight IQ
      </Link>

      <PageHeader
        feature="freight-iq"
        title="Saved Estimates"
        titleClassName="text-4xl font-bold text-freight-iq"
        subtitle="Freight calculations you've bookmarked from iOS or web"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      {estimates.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-5 w-5" />}
          title="No saved estimates"
          description="Estimates you save from a Freight IQ calculation will appear here."
          actionLabel="New Estimate"
          actionHref="/dashboard/tools/freight"
          variant="freight-iq"
        />
      ) : (
        <SavedEstimatesList estimates={estimates} />
      )}
    </div>
  );
}
