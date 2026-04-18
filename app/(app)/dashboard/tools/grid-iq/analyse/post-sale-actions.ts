"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calculateHerdValuation,
  calculateProjectedWeight,
  categoryFallback,
  type CategoryPriceEntry,
} from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName, saleyardCoordinates } from "@/lib/data/reference-data";
import { calculateFreightEstimate } from "@/lib/engines/freight-engine";
import { centsToDollars } from "@/lib/types/money";
import {
  analyse,
  defaultDressingPercentage,
  BASELINE_REALISATION_FACTOR,
} from "@/lib/engines/grid-iq-engine";
import type { KillSheetForScoring, KillSheetLineItem, GridEntry } from "@/lib/engines/kill-score-engine";
import { runPaymentCheck } from "@/lib/engines/grid-iq-payment-check";
import { generateBrangusCommentary } from "@/lib/grid-iq/commentary-service";
import { computeProducerProfile } from "@/lib/grid-iq/producer-profile";

const postSaleAnalysisSchema = z.object({
  consignmentId: z.string().uuid(),
  killSheetId: z.string().uuid(),
});

const confirmSaleSchema = z.object({
  consignmentId: z.string().uuid(),
  adjustedAllocations: z.array(z.object({
    herdGroupId: z.string().uuid(),
    headCount: z.number().int().positive(),
  })).optional(),
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Run post-kill analysis for a consignment.
 * Called after the user uploads the actual kill sheet and links it to the consignment.
 */
export async function runPostSaleAnalysis(consignmentId: string, killSheetId: string) {
  const parsed = postSaleAnalysisSchema.safeParse({ consignmentId, killSheetId });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // 1. Fetch consignment + allocations + grid + kill sheet in parallel
  const [
    { data: consignment },
    { data: allocations },
    killSheetResult,
  ] = await Promise.all([
    supabase
      .from("consignments")
      .select("*, processor_grid_id")
      .eq("id", consignmentId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("consignment_allocations")
      .select("*")
      .eq("consignment_id", consignmentId),
    supabase
      .from("kill_sheet_records")
      .select(
        `id, processor_name, kill_date, total_head_count, total_gross_value,
         total_body_weight, average_body_weight, average_price_per_kg,
         line_items, grade_distribution, realisation_factor, condemns`
      )
      .eq("id", killSheetId)
      .eq("user_id", user.id)
      .single(),
  ]);

  if (!consignment) return { error: "Consignment not found" };
  if (!allocations?.length) return { error: "No allocations found" };
  if (!killSheetResult?.data) return { error: "Kill sheet not found" };

  const killSheetData = killSheetResult.data;

  // Fetch grid
  const { data: grid } = await supabase
    .from("processor_grids")
    .select("id, processor_name, processor_id, grid_code, entries, location_latitude, location_longitude")
    .eq("id", consignment.processor_grid_id)
    .eq("user_id", user.id)
    .single();
  if (!grid) return { error: "Linked processor grid not found" };

  const gridEntries = (grid.entries ?? []) as GridEntry[];

  // Resolve processor coordinates: prefer the processor record, fall back to
  // coords stored directly on the grid for legacy rows.
  let processorLat: number | null = grid.location_latitude ?? null;
  let processorLon: number | null = grid.location_longitude ?? null;
  const processorId = grid.processor_id as string | null;
  if (processorId) {
    const { data: processorRow } = await supabase
      .from("processors")
      .select("location_latitude, location_longitude")
      .eq("id", processorId)
      .maybeSingle();
    if (processorRow) {
      if (processorRow.location_latitude != null)
        processorLat = processorRow.location_latitude;
      if (processorRow.location_longitude != null)
        processorLon = processorRow.location_longitude;
    }
  }

  // Link kill sheet to consignment. Every mutation is scoped by user_id so a
  // caller cannot null out someone else's consignment link even under a
  // stale/misused killSheetId.
  const { data: priorKS } = await supabase
    .from("kill_sheet_records")
    .select("consignment_id")
    .eq("id", killSheetId)
    .eq("user_id", user.id)
    .single();
  const priorConsignmentId = priorKS?.consignment_id as string | null;
  if (priorConsignmentId && priorConsignmentId !== consignmentId) {
    await supabase
      .from("consignments")
      .update({ kill_sheet_record_id: null })
      .eq("id", priorConsignmentId)
      .eq("user_id", user.id);
  }

  await supabase
    .from("consignments")
    .update({ kill_sheet_record_id: killSheetId })
    .eq("id", consignmentId)
    .eq("user_id", user.id);
  await supabase
    .from("kill_sheet_records")
    .update({ consignment_id: consignmentId })
    .eq("id", killSheetId)
    .eq("user_id", user.id);

  // Build kill sheet for scoring
  const rawItems = (killSheetData.line_items ?? []) as Record<string, unknown>[];
  const lineItems: KillSheetLineItem[] = rawItems.map((item) => ({
    bodyNumber: (item.bodyNumber ?? item.body_number ?? 0) as number,
    category: (item.category ?? "") as string,
    sex: (item.sex ?? undefined) as "Male" | "Female" | "Unknown" | undefined,
    dentition: (item.dentition ?? 0) as number,
    p8Fat: (item.p8Fat ?? item.p8_fat ?? 0) as number,
    leftSideWeight: (item.leftSideWeight ?? item.left_side_weight ?? 0) as number,
    leftGrade: (item.leftGrade ?? item.left_grade ?? "") as string,
    leftPricePerKg: (item.leftPricePerKg ?? item.left_price_per_kg ?? 0) as number,
    rightSideWeight: (item.rightSideWeight ?? item.right_side_weight ?? 0) as number,
    rightGrade: (item.rightGrade ?? item.right_grade ?? "") as string,
    rightPricePerKg: (item.rightPricePerKg ?? item.right_price_per_kg ?? 0) as number,
    totalBodyWeight: (item.totalBodyWeight ?? item.total_body_weight ?? 0) as number,
    grossValue: (item.grossValue ?? item.gross_value ?? 0) as number,
    comments: (item.comments ?? null) as string | null,
  }));

  const killSheetForScoring: KillSheetForScoring & { id: string } = {
    id: killSheetData.id,
    totalHeadCount: killSheetData.total_head_count ?? 0,
    totalGrossValue: killSheetData.total_gross_value ?? 0,
    lineItems,
  };

  // Fetch breed premiums + producer profile
  const [{ data: breedPremiumData }, profile] = await Promise.all([
    supabase.from("breed_premiums").select("breed, premium_percent:premium_pct"),
    computeProducerProfile(user.id).catch(() => null),
  ]);

  const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
  for (const b of breedPremiumData ?? []) {
    premiumMap.set(b.breed, b.premium_percent);
  }

  // RF from kill sheet, then profile, then baseline
  let realisationFactor = BASELINE_REALISATION_FACTOR;
  let isPersonalised = false;
  if (killSheetData.realisation_factor && killSheetData.realisation_factor > 0) {
    realisationFactor = killSheetData.realisation_factor;
    isPersonalised = true;
  } else if (profile?.averageRF != null && profile.averageRF > 0) {
    realisationFactor = profile.averageRF;
    isPersonalised = true;
  }

  // Fetch all herds for allocations
  const herdIds = [...new Set(allocations.map((a) => a.herd_id))];
  const { data: herds } = await supabase
    .from("herds")
    .select(
      `id, name, species, breed, sex, category, head_count,
       initial_weight, current_weight, daily_weight_gain,
       dwg_change_date, previous_dwg, created_at,
       is_breeder, is_pregnant, joined_date, calving_rate,
       breeding_program_type, joining_period_start, joining_period_end,
       breed_premium_override, mortality_rate, selected_saleyard,
       additional_info, calf_weight_recorded_date, updated_at, property_id,
       breeder_sub_type`
    )
    .eq("user_id", user.id)
    .in("id", herdIds);

  if (!herds?.length) return { error: "Herds not found" };
  const herdMap = new Map(herds.map((h) => [h.id, h]));

  // Fetch properties
  const propertyIds = [...new Set(herds.filter((h) => h.property_id).map((h) => h.property_id!))];
  const propertyMap = new Map<string, { latitude: number; longitude: number }>();
  if (propertyIds.length > 0) {
    const { data: properties } = await supabase.from("properties").select("id, latitude, longitude").in("id", propertyIds);
    for (const p of properties ?? []) {
      if (p.latitude && p.longitude) propertyMap.set(p.id, { latitude: p.latitude, longitude: p.longitude });
    }
  }

  // Use the first allocation's herd for the primary analysis (post-sale uses kill sheet data)
  const primaryHerd = herdMap.get(allocations[0].herd_id)!;
  const property = primaryHerd.property_id ? propertyMap.get(primaryHerd.property_id) : null;

  // MLA market value (aggregate across allocations)
  let aggMlaMarketValue = 0;
  let aggFreightToSaleyard = 0;
  let aggFreightToProcessor = 0;

  for (const alloc of allocations) {
    const herd = herdMap.get(alloc.herd_id)!;
    const prop = herd.property_id ? propertyMap.get(herd.property_id) : null;

    const mlaCategory = resolveMLACategory(herd.category, herd.initial_weight, herd.breeder_sub_type ?? undefined).primaryMLACategory;
    const fallbackCat = categoryFallback(mlaCategory);
    const mlaCategories = fallbackCat ? [mlaCategory, fallbackCat] : [mlaCategory];
    const resolvedSaleyard = herd.selected_saleyard ? resolveMLASaleyardName(herd.selected_saleyard) : null;

    type PriceRow = { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string };
    const [{ data: syPrices }, { data: natPrices }] = await Promise.all([
      resolvedSaleyard
        ? supabase.from("category_prices").select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date").eq("saleyard", resolvedSaleyard).in("category", mlaCategories).order("data_date", { ascending: false }).limit(5000)
        : Promise.resolve({ data: [] as PriceRow[] }),
      supabase.from("category_prices").select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date").eq("saleyard", "National").in("category", mlaCategories).order("data_date", { ascending: false }).limit(5000),
    ]);

    const allPrices = [...(syPrices ?? []), ...(natPrices ?? [])];
    const npm = new Map<string, CategoryPriceEntry[]>();
    const spm = new Map<string, CategoryPriceEntry[]>();
    const sbpm = new Map<string, CategoryPriceEntry[]>();
    for (const p of allPrices) {
      const pe = { price_per_kg: centsToDollars(p.price_per_kg), weight_range: p.weight_range, data_date: p.data_date };
      if (p.saleyard === "National" && !p.breed) { const e = npm.get(p.category) ?? []; e.push(pe); npm.set(p.category, e); }
      else if (p.saleyard !== "National") {
        if (!p.breed) { const k = `${p.category}|${p.saleyard}`; const e = spm.get(k) ?? []; e.push(pe); spm.set(k, e); }
        else { const k = `${p.category}|${p.breed}|${p.saleyard}`; const e = sbpm.get(k) ?? []; e.push(pe); sbpm.set(k, e); }
      }
    }

    const allocHerd = { ...herd, head_count: alloc.head_count };
    const val = calculateHerdValuation(allocHerd as Parameters<typeof calculateHerdValuation>[0], npm, premiumMap, undefined, spm, sbpm);
    aggMlaMarketValue += val.netValue;

    const projLW = calculateProjectedWeight(herd.initial_weight ?? herd.current_weight ?? 0, herd.created_at ? new Date(herd.created_at) : new Date(), herd.dwg_change_date ? new Date(herd.dwg_change_date) : null, new Date(), herd.previous_dwg ?? null, herd.daily_weight_gain ?? 0);
    if (prop) {
      if (resolvedSaleyard && saleyardCoordinates[resolvedSaleyard]) {
        const sc = saleyardCoordinates[resolvedSaleyard];
        const d = haversineKm(prop.latitude, prop.longitude, sc.lat, sc.lon) * 1.3;
        if (d > 0) aggFreightToSaleyard += calculateFreightEstimate({ appCategory: herd.category, sex: herd.sex ?? "Male", averageWeightKg: projLW, headCount: alloc.head_count, distanceKm: d }).totalCost;
      }
      if (processorLat != null && processorLon != null) {
        const d = haversineKm(prop.latitude, prop.longitude, processorLat, processorLon) * 1.3;
        if (d > 0) aggFreightToProcessor += calculateFreightEstimate({ appCategory: herd.category, sex: herd.sex ?? "Male", averageWeightKg: projLW, headCount: alloc.head_count, distanceKm: d }).totalCost;
      }
    }
  }

  // Dressing % from kill sheet data
  const projectedLiveWeight = calculateProjectedWeight(
    primaryHerd.initial_weight ?? primaryHerd.current_weight ?? 0,
    primaryHerd.created_at ? new Date(primaryHerd.created_at) : new Date(),
    primaryHerd.dwg_change_date ? new Date(primaryHerd.dwg_change_date) : null,
    new Date(),
    primaryHerd.previous_dwg ?? null,
    primaryHerd.daily_weight_gain ?? 0,
  );
  let dressingPct = defaultDressingPercentage(primaryHerd.category);
  if (killSheetData.average_body_weight > 0 && projectedLiveWeight > 0) {
    const actual = killSheetData.average_body_weight / projectedLiveWeight;
    if (actual >= 0.40 && actual <= 0.70) { dressingPct = actual; isPersonalised = true; }
  }
  const estimatedCarcaseWeight = projectedLiveWeight * dressingPct;

  const totalHead = allocations.reduce((s, a) => s + a.head_count, 0);
  const herdNames = allocations.map((a) => {
    const h = herdMap.get(a.herd_id);
    return h ? `${h.name} (${a.head_count})` : `${a.head_count} head`;
  }).join(", ");

  // Run analysis with kill sheet
  const result = analyse({
    herd: {
      id: primaryHerd.id,
      name: herdNames,
      sex: primaryHerd.sex ?? "Male",
      category: primaryHerd.category,
      headCount: totalHead,
      dailyWeightGain: primaryHerd.daily_weight_gain ?? 0,
    },
    grid: { id: grid.id, processorName: grid.processor_name, entries: gridEntries },
    killSheet: killSheetForScoring,
    mlaMarketValue: aggMlaMarketValue,
    estimatedCarcaseWeight,
    dressingPercentage: dressingPct,
    isPersonalisedData: isPersonalised,
    realisationFactor,
    freightToSaleyard: aggFreightToSaleyard,
    freightToProcessor: aggFreightToProcessor,
    analysisMode: "post_sale",
  });

  // Save analysis
  const analysisId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: analysisError } = await supabase.from("grid_iq_analyses").insert({
    id: analysisId,
    user_id: user.id,
    herd_id: null,
    consignment_id: consignmentId,
    processor_grid_id: grid.id,
    processor_id: processorId,
    kill_sheet_record_id: killSheetId,
    analysis_date: now,
    updated_at: now,
    herd_name: herdNames,
    processor_name: grid.processor_name,
    analysis_mode: "post_sale",
    head_count: totalHead,
    mla_market_value: Math.round(result.mlaMarketValue),
    headline_grid_value: Math.round(result.headlineGridValue),
    realisation_factor: result.realisationFactor,
    realistic_grid_outcome: Math.round(result.realisticGridOutcome),
    freight_to_saleyard: Math.round(result.freightToSaleyard),
    freight_to_processor: Math.round(result.freightToProcessor),
    net_saleyard_value: Math.round(result.netSaleyardValue),
    net_processor_value: Math.round(result.netProcessorValue),
    grid_iq_advantage: Math.round(result.gridIQAdvantage),
    sell_window_status_raw: result.sellWindowStatus,
    sell_window_detail: result.sellWindowDetail,
    days_to_target: result.daysToTarget,
    projected_carcase_weight: result.projectedCarcaseWeight ? Math.round(result.projectedCarcaseWeight) : null,
    opportunity_value: result.opportunityValue ? Math.round(result.opportunityValue) : null,
    opportunity_driver: result.opportunityDriver,
    opportunity_detail: result.opportunityDetail,
    processor_fit_score: result.processorFitScore ? Math.round(result.processorFitScore) : null,
    processor_fit_label_raw: result.processorFitLabel,
    estimated_carcase_weight: Math.round(result.estimatedCarcaseWeight),
    dressing_percentage: result.dressingPercentage,
    is_using_personalised_data: result.isUsingPersonalisedData,
    gcr: result.gcr ? Math.round(result.gcr * 10) / 10 : null,
    grid_risk: result.gridRisk ? Math.round(result.gridRisk * 10) / 10 : null,
    kill_score: result.killScore ? Math.round(result.killScore * 10) / 10 : null,
    grid_compliance_score: result.gridComplianceScore ? Math.round(result.gridComplianceScore * 10) / 10 : null,
    fat_compliance_score: result.fatComplianceScore ? Math.round(result.fatComplianceScore * 10) / 10 : null,
    dentition_compliance_score: result.dentitionComplianceScore ? Math.round(result.dentitionComplianceScore * 10) / 10 : null,
    is_deleted: false,
  });

  if (analysisError) return { error: `Failed to save analysis: ${analysisError.message}` };

  // Payment check
  if (killSheetForScoring.lineItems.length > 0) {
    try {
      const paymentResult = runPaymentCheck(killSheetForScoring.lineItems, killSheetForScoring.totalGrossValue, gridEntries, primaryHerd.sex);
      await supabase.from("kill_sheet_records").update({ payment_check_result: paymentResult }).eq("id", killSheetId);
    } catch (e) {
      console.error("Payment check failed (non-blocking):", e);
    }
  }

  // Commentary
  generateBrangusCommentary({
    analysisId,
    herdName: herdNames,
    herdCategory: primaryHerd.category,
    processorName: grid.processor_name,
    analysisMode: "post_sale",
    result,
  }).catch((e) => console.error("Commentary generation failed:", e));

  // Deliberately no revalidatePath here. The client flips to the Confirm stage
  // via setStage after this resolves; revalidating would remount the parent
  // consignment page, unmount PostSaleFlow (canRunPostKill flips to false once
  // postSaleAnalysis exists), and swallow the transition. confirmSale
  // revalidates when the sale is finalised.
  return { analysisId };
}

/**
 * Confirm sale allocations and complete the consignment.
 * Takes optional adjusted allocations if the user changed head counts.
 */
export async function confirmSale(
  consignmentId: string,
  adjustedAllocations?: { herdGroupId: string; headCount: number }[],
) {
  const parsed = confirmSaleSchema.safeParse({ consignmentId, adjustedAllocations });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: consignment } = await supabase
    .from("consignments")
    .select("*, processor_grid_id, kill_sheet_record_id")
    .eq("id", consignmentId)
    .eq("user_id", user.id)
    .single();

  if (!consignment) return { error: "Consignment not found" };
  if (consignment.status === "completed") return { error: "Consignment already completed" };

  // If adjustments provided, update allocations
  if (adjustedAllocations) {
    await supabase.from("consignment_allocations").delete().eq("consignment_id", consignmentId);
    const newAllocRows = adjustedAllocations.map((a) => ({
      consignment_id: consignmentId,
      herd_id: a.herdGroupId,
      head_count: a.headCount,
    }));
    await supabase.from("consignment_allocations").insert(newAllocRows);
  }

  // Fetch final allocations
  const { data: allocations } = await supabase
    .from("consignment_allocations")
    .select("*")
    .eq("consignment_id", consignmentId);
  if (!allocations?.length) return { error: "No allocations found" };

  // Fetch kill sheet for revenue
  let totalRevenue = 0;
  let avgPricePerKg = 0;
  if (consignment.kill_sheet_record_id) {
    const { data: ks } = await supabase
      .from("kill_sheet_records")
      .select("total_gross_value, total_body_weight, average_price_per_kg")
      .eq("id", consignment.kill_sheet_record_id)
      .single();
    if (ks) {
      totalRevenue = ks.total_gross_value ?? 0;
      avgPricePerKg = ks.average_price_per_kg ?? (ks.total_body_weight > 0 ? ks.total_gross_value / ks.total_body_weight : 0);
    }
  }

  const totalHead = allocations.reduce((s, a) => s + a.head_count, 0);

  // Process each allocation
  for (const alloc of allocations) {
    const { data: herd } = await supabase
      .from("herds")
      .select("id, head_count, current_weight, name")
      .eq("id", alloc.herd_id)
      .eq("user_id", user.id)
      .single();
    if (!herd) continue;

    const remaining = (herd.head_count ?? 0) - alloc.head_count;
    const herdUpdate: Record<string, unknown> = { head_count: Math.max(0, remaining) };
    if (remaining <= 0) {
      herdUpdate.is_sold = true;
      herdUpdate.sold_date = consignment.kill_date || new Date().toISOString();
    }
    await supabase.from("herds").update(herdUpdate).eq("id", alloc.herd_id);

    const headRatio = totalHead > 0 ? alloc.head_count / totalHead : 0;
    const proratedRevenue = Math.round(totalRevenue * headRatio);
    await supabase.from("sales_records").insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      herd_id: alloc.herd_id,
      sale_date: consignment.kill_date || new Date().toISOString(),
      head_count: alloc.head_count,
      average_weight: alloc.average_weight ?? herd.current_weight ?? 0,
      price_per_kg: avgPricePerKg,
      pricing_type: "per_kg",
      sale_type: "Over-the-Hooks",
      sale_location: consignment.plant_location || consignment.processor_name,
      total_gross_value: proratedRevenue,
      freight_cost: 0,
      freight_distance: 0,
      net_value: proratedRevenue,
      consignment_id: consignmentId,
      notes: `Consignment: ${consignment.booking_reference || consignment.processor_name}`,
    });
  }

  await supabase.from("consignments").update({
    status: "completed",
    total_gross_value: totalRevenue,
    total_net_value: totalRevenue,
  }).eq("id", consignmentId);

  revalidatePath("/dashboard/tools/grid-iq");
  revalidatePath("/dashboard/portfolio");
  revalidatePath("/dashboard");
  return { success: true };
}
