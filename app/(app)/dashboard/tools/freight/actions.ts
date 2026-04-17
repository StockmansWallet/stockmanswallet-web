"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Mirrors columns written by the iOS SavedFreightEstimateDTO so saved records from either
// platform are interchangeable. The live Postgres table is the source of truth; the web
// database.ts type stubs are stale and intentionally not relied on here.
const saveSchema = z.object({
  originPropertyName: z.string().min(1).max(200),
  destinationName: z.string().min(1).max(200),
  herdName: z.string().max(200),
  categoryName: z.string().min(1).max(120),
  headCount: z.number().int().positive(),
  averageWeightKg: z.number().nonnegative(),
  headsPerDeck: z.number().int().positive(),
  decksRequired: z.number().int().nonnegative(),
  distanceKm: z.number().nonnegative(),
  ratePerDeckPerKm: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  costPerHead: z.number().nonnegative(),
  costPerDeck: z.number().nonnegative(),
  costPerKm: z.number().nonnegative(),
  hasPartialDeck: z.boolean(),
  spareSpotsOnLastDeck: z.number().int().nonnegative(),
  isCustomJob: z.boolean(),
  categoryWarning: z.string().nullable().optional(),
  efficiencyPrompt: z.string().nullable().optional(),
  breederAutoDetectNotice: z.string().nullable().optional(),
  shortCartNotice: z.string().nullable().optional(),
  assumptionsSummary: z.string().max(500),
});

export type SaveFreightEstimateInput = z.infer<typeof saveSchema>;

export async function saveFreightEstimate(input: SaveFreightEstimateInput) {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const v = parsed.data;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const totalGst = v.totalCost * 0.1;
  const totalWithGst = v.totalCost * 1.1;

  const { error } = await supabase.from("saved_freight_estimates").insert({
    id,
    user_id: user.id,
    origin_property_name: v.originPropertyName,
    destination_name: v.destinationName,
    herd_name: v.herdName,
    category_name: v.categoryName,
    head_count: v.headCount,
    average_weight_kg: v.averageWeightKg,
    heads_per_deck: v.headsPerDeck,
    decks_required: v.decksRequired,
    distance_km: v.distanceKm,
    rate_per_deck_per_km: v.ratePerDeckPerKm,
    total_cost: v.totalCost,
    cost_per_head: v.costPerHead,
    cost_per_deck: v.costPerDeck,
    cost_per_km: v.costPerKm,
    total_gst: totalGst,
    total_with_gst: totalWithGst,
    has_partial_deck: v.hasPartialDeck,
    spare_spots_on_last_deck: v.spareSpotsOnLastDeck,
    is_custom_job: v.isCustomJob,
    category_warning: v.categoryWarning ?? null,
    efficiency_prompt: v.efficiencyPrompt ?? null,
    breeder_auto_detect_notice: v.breederAutoDetectNotice ?? null,
    short_cart_notice: v.shortCartNotice ?? null,
    assumptions_summary: v.assumptionsSummary,
    saved_at: now,
    is_deleted: false,
    created_at: now,
    updated_at: now,
    last_synced_at: now,
  } as never);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/freight/history");
  return { id };
}

export async function deleteSavedFreightEstimate(id: string) {
  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) return { error: "Invalid id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const now = new Date().toISOString();
  // Soft delete so iOS sync tombstones propagate correctly.
  const { error } = await supabase
    .from("saved_freight_estimates")
    .update({
      is_deleted: true,
      deleted_at: now,
      updated_at: now,
      last_synced_at: now,
    } as never)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/freight/history");
  return { ok: true };
}
