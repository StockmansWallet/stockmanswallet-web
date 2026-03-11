"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calculateHerdValuation,
  calculateProjectedWeight,
  categoryFallback,
  type CategoryPriceEntry,
} from "@/lib/engines/valuation-engine";
import { mapCategoryToMLACategory } from "@/lib/data/reference-data";
import { cattleBreedPremiums, resolveMLASaleyardName, saleyardCoordinates } from "@/lib/data/reference-data";
import { calculateFreightEstimate } from "@/lib/engines/freight-engine";
import {
  analyse,
  defaultDressingPercentage,
  BASELINE_REALISATION_FACTOR,
  type GridIQAnalysisResult,
} from "@/lib/engines/grid-iq-engine";
import type { GridEntry } from "@/lib/engines/kill-score-engine";
import { generateBrangusCommentary } from "@/lib/grid-iq/commentary-service";
import { computeProducerProfile } from "@/lib/grid-iq/producer-profile";

// Haversine distance (km) between two lat/lon points
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Per-allocation result stored in category_results JSONB
export interface AllocationResult {
  herdGroupId: string;
  herdName: string;
  category: string;
  headCount: number;
  mlaMarketValue: number;
  headlineGridValue: number;
  realisticGridOutcome: number;
  freightToSaleyard: number;
  freightToProcessor: number;
  netSaleyardValue: number;
  netProcessorValue: number;
  gridIQAdvantage: number;
  sellWindowStatus: string;
  sellWindowDetail: string;
  daysToTarget: number | null;
  dressingPercentage: number;
  estimatedCarcaseWeight: number;
  realisationFactor: number;
  isUsingPersonalisedData: boolean;
}

interface AllocationInput {
  herdGroupId: string;
  headCount: number;
  category: string;
}

export async function createPreSaleAnalysis(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Parse inputs
  const gridId = formData.get("gridId") as string;
  const processorName = formData.get("processorName") as string;
  const plantLocation = (formData.get("plantLocation") as string) || null;
  const bookingReference = (formData.get("bookingReference") as string) || null;
  const killDate = (formData.get("killDate") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const allocationsJSON = formData.get("allocations") as string;

  if (!gridId) return { error: "Processor grid is required" };

  let allocations: AllocationInput[];
  try {
    allocations = JSON.parse(allocationsJSON || "[]");
  } catch {
    return { error: "Invalid allocations data" };
  }
  if (allocations.length === 0) return { error: "At least one herd allocation is required" };

  const totalHead = allocations.reduce((sum, a) => sum + a.headCount, 0);
  if (totalHead <= 0) return { error: "Total head count must be greater than zero" };

  // 1. Fetch grid
  const { data: grid } = await supabase
    .from("processor_grids")
    .select("id, processor_name, grid_code, entries, location_latitude, location_longitude")
    .eq("id", gridId)
    .eq("user_id", user.id)
    .single();
  if (!grid) return { error: "Grid not found" };

  const gridEntries = (grid.entries ?? []) as GridEntry[];
  const resolvedProcessorName = processorName || grid.processor_name;

  // 2. Fetch breed premiums + producer profile in parallel
  const [{ data: breedPremiumData }, profile] = await Promise.all([
    supabase.from("breed_premiums").select("breed, premium_percent:premium_pct"),
    computeProducerProfile(user.id).catch(() => null),
  ]);

  const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
  for (const b of breedPremiumData ?? []) {
    premiumMap.set(b.breed, b.premium_percent);
  }

  // Determine RF from producer profile or baseline
  let realisationFactor = BASELINE_REALISATION_FACTOR;
  let isPersonalised = false;
  if (profile?.averageRF != null && profile.averageRF > 0) {
    realisationFactor = profile.averageRF;
    isPersonalised = true;
  }

  // 3. Fetch all herds in parallel
  const herdIds = [...new Set(allocations.map((a) => a.herdGroupId))];
  const { data: herds } = await supabase
    .from("herd_groups")
    .select(
      `id, name, species, breed, sex, category, head_count,
       initial_weight, current_weight, daily_weight_gain,
       dwg_change_date, previous_dwg, created_at,
       is_breeder, is_pregnant, joined_date, calving_rate,
       breeding_program_type, joining_period_start, joining_period_end,
       breed_premium_override, mortality_rate, selected_saleyard,
       additional_info, calf_weight_recorded_date, updated_at, property_id`
    )
    .eq("user_id", user.id)
    .in("id", herdIds);

  if (!herds || herds.length === 0) return { error: "No herds found" };
  const herdMap = new Map(herds.map((h) => [h.id, h]));

  // Validate head counts
  for (const alloc of allocations) {
    const herd = herdMap.get(alloc.herdGroupId);
    if (!herd) return { error: `Herd not found: ${alloc.herdGroupId}` };
    if (alloc.headCount > (herd.head_count ?? 0)) {
      return { error: `Cannot allocate ${alloc.headCount} head from "${herd.name}" - only ${herd.head_count} available` };
    }
  }

  // 4. Fetch all property coordinates in parallel
  const propertyIds = [...new Set(herds.filter((h) => h.property_id).map((h) => h.property_id!))];
  const propertyMap = new Map<string, { latitude: number; longitude: number }>();
  if (propertyIds.length > 0) {
    const { data: properties } = await supabase
      .from("properties")
      .select("id, latitude, longitude")
      .in("id", propertyIds);
    for (const p of properties ?? []) {
      if (p.latitude && p.longitude) {
        propertyMap.set(p.id, { latitude: p.latitude, longitude: p.longitude });
      }
    }
  }

  // 5. Run analysis per allocation
  const allocationResults: AllocationResult[] = [];
  const fullResults: GridIQAnalysisResult[] = [];

  for (const alloc of allocations) {
    const herd = herdMap.get(alloc.herdGroupId)!;
    const property = herd.property_id ? propertyMap.get(herd.property_id) : null;

    // MLA market value for this herd
    const mlaCategory = mapCategoryToMLACategory(herd.category);
    const fallbackCat = categoryFallback(mlaCategory);
    const mlaCategories = fallbackCat ? [mlaCategory, fallbackCat] : [mlaCategory];
    const resolvedSaleyard = herd.selected_saleyard
      ? resolveMLASaleyardName(herd.selected_saleyard)
      : null;

    type PriceRow = {
      category: string;
      price_per_kg: number;
      weight_range: string | null;
      saleyard: string;
      breed: string | null;
      data_date: string;
    };

    const [{ data: saleyardPrices }, { data: nationalPrices }] = await Promise.all([
      resolvedSaleyard
        ? supabase
            .from("category_prices")
            .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date")
            .eq("saleyard", resolvedSaleyard)
            .in("category", mlaCategories)
            .order("data_date", { ascending: false })
            .limit(5000)
        : Promise.resolve({ data: [] as PriceRow[] }),
      supabase
        .from("category_prices")
        .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date")
        .eq("saleyard", "National")
        .in("category", mlaCategories)
        .order("data_date", { ascending: false })
        .limit(5000),
    ]);

    const allPrices = [...(saleyardPrices ?? []), ...(nationalPrices ?? [])];
    const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
    const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
    const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();
    for (const p of allPrices) {
      const priceEntry = { price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range, data_date: p.data_date };
      if (p.saleyard === "National" && p.breed === null) {
        const entries = nationalPriceMap.get(p.category) ?? [];
        entries.push(priceEntry);
        nationalPriceMap.set(p.category, entries);
      } else if (p.saleyard !== "National") {
        if (p.breed === null) {
          const key = `${p.category}|${p.saleyard}`;
          const entries = saleyardPriceMap.get(key) ?? [];
          entries.push(priceEntry);
          saleyardPriceMap.set(key, entries);
        } else {
          const key = `${p.category}|${p.breed}|${p.saleyard}`;
          const entries = saleyardBreedPriceMap.get(key) ?? [];
          entries.push(priceEntry);
          saleyardBreedPriceMap.set(key, entries);
        }
      }
    }

    // Override head count for this allocation (not the full herd)
    const allocHerd = { ...herd, head_count: alloc.headCount };
    const valuation = calculateHerdValuation(
      allocHerd as Parameters<typeof calculateHerdValuation>[0],
      nationalPriceMap,
      premiumMap,
      undefined,
      saleyardPriceMap,
      saleyardBreedPriceMap,
    );
    const mlaMarketValue = valuation.netValue;

    // Projected weight + dressing %
    const createdAt = herd.created_at ? new Date(herd.created_at) : new Date();
    const projectedLiveWeight = calculateProjectedWeight(
      herd.initial_weight ?? herd.current_weight ?? 0,
      createdAt,
      herd.dwg_change_date ? new Date(herd.dwg_change_date) : null,
      new Date(),
      herd.previous_dwg ?? null,
      herd.daily_weight_gain ?? 0,
    );
    const dressingPct = defaultDressingPercentage(herd.category);
    const estimatedCarcaseWeight = projectedLiveWeight * dressingPct;

    // Freight
    let freightToSaleyard = 0;
    let freightToProcessor = 0;
    if (property) {
      if (resolvedSaleyard && saleyardCoordinates[resolvedSaleyard]) {
        const sc = saleyardCoordinates[resolvedSaleyard];
        const distKm = haversineKm(property.latitude, property.longitude, sc.lat, sc.lon) * 1.3;
        if (distKm > 0) {
          freightToSaleyard = calculateFreightEstimate({
            appCategory: herd.category,
            sex: herd.sex ?? "Male",
            averageWeightKg: projectedLiveWeight,
            headCount: alloc.headCount,
            distanceKm: distKm,
          }).totalCost;
        }
      }
      if (grid.location_latitude && grid.location_longitude) {
        const distKm = haversineKm(property.latitude, property.longitude, grid.location_latitude, grid.location_longitude) * 1.3;
        if (distKm > 0) {
          freightToProcessor = calculateFreightEstimate({
            appCategory: herd.category,
            sex: herd.sex ?? "Male",
            averageWeightKg: projectedLiveWeight,
            headCount: alloc.headCount,
            distanceKm: distKm,
          }).totalCost;
        }
      }
    }

    // Run analysis for this allocation
    const result = analyse({
      herd: {
        id: herd.id,
        name: herd.name,
        sex: herd.sex ?? "Male",
        category: herd.category,
        headCount: alloc.headCount,
        dailyWeightGain: herd.daily_weight_gain ?? 0,
      },
      grid: {
        id: grid.id,
        processorName: grid.processor_name,
        entries: gridEntries,
      },
      killSheet: null,
      mlaMarketValue,
      estimatedCarcaseWeight,
      dressingPercentage: dressingPct,
      isPersonalisedData: isPersonalised,
      realisationFactor,
      freightToSaleyard,
      freightToProcessor,
      analysisMode: "pre_sale",
    });

    fullResults.push(result);
    allocationResults.push({
      herdGroupId: herd.id,
      herdName: herd.name,
      category: herd.category,
      headCount: alloc.headCount,
      mlaMarketValue: result.mlaMarketValue,
      headlineGridValue: result.headlineGridValue,
      realisticGridOutcome: result.realisticGridOutcome,
      freightToSaleyard: result.freightToSaleyard,
      freightToProcessor: result.freightToProcessor,
      netSaleyardValue: result.netSaleyardValue,
      netProcessorValue: result.netProcessorValue,
      gridIQAdvantage: result.gridIQAdvantage,
      sellWindowStatus: result.sellWindowStatus,
      sellWindowDetail: result.sellWindowDetail,
      daysToTarget: result.daysToTarget,
      dressingPercentage: result.dressingPercentage,
      estimatedCarcaseWeight: result.estimatedCarcaseWeight,
      realisationFactor: result.realisationFactor,
      isUsingPersonalisedData: result.isUsingPersonalisedData,
    });
  }

  // 6. Aggregate totals across all allocations
  const aggMlaMarketValue = fullResults.reduce((s, r) => s + r.mlaMarketValue, 0);
  const aggHeadlineGridValue = fullResults.reduce((s, r) => s + r.headlineGridValue, 0);
  const aggRealisticGridOutcome = fullResults.reduce((s, r) => s + r.realisticGridOutcome, 0);
  const aggFreightToSaleyard = fullResults.reduce((s, r) => s + r.freightToSaleyard, 0);
  const aggFreightToProcessor = fullResults.reduce((s, r) => s + r.freightToProcessor, 0);
  const aggNetSaleyard = fullResults.reduce((s, r) => s + r.netSaleyardValue, 0);
  const aggNetProcessor = fullResults.reduce((s, r) => s + r.netProcessorValue, 0);
  const aggAdvantage = aggNetProcessor - aggNetSaleyard;

  // Weighted average dressing % and carcase weight
  const aggEstCarcaseWeight = fullResults.reduce((s, r) => s + r.estimatedCarcaseWeight, 0) / Math.max(1, fullResults.length);
  const aggDressingPct = fullResults.reduce((s, r) => s + r.dressingPercentage * r.headCount, 0) / Math.max(1, totalHead);

  // Worst sell window status (most urgent)
  const statusPriority: Record<string, number> = { RISK_OF_OVERWEIGHT: 3, EARLY: 2, ON_TARGET: 1 };
  const worstSellWindow = fullResults.reduce((worst, r) => {
    return (statusPriority[r.sellWindowStatus] ?? 0) > (statusPriority[worst.sellWindowStatus] ?? 0) ? r : worst;
  }, fullResults[0]);

  // Herd name as combined list
  const herdNames = allocations.map((a) => {
    const h = herdMap.get(a.herdGroupId);
    return h ? `${h.name} (${a.headCount})` : `${a.headCount} head`;
  }).join(", ");

  // 7. Create consignment
  const consignmentId = crypto.randomUUID();
  const { error: consignmentError } = await supabase.from("consignments").insert({
    id: consignmentId,
    user_id: user.id,
    processor_name: resolvedProcessorName,
    plant_location: plantLocation,
    booking_reference: bookingReference,
    kill_date: killDate || null,
    status: "draft",
    total_head_count: totalHead,
    processor_grid_id: gridId,
    notes,
  });
  if (consignmentError) return { error: `Failed to create consignment: ${consignmentError.message}` };

  // Insert allocations
  const allocationRows = allocations.map((a) => ({
    consignment_id: consignmentId,
    herd_group_id: a.herdGroupId,
    head_count: a.headCount,
    category: a.category || null,
  }));
  const { error: allocError } = await supabase.from("consignment_allocations").insert(allocationRows);
  if (allocError) return { error: `Failed to create allocations: ${allocError.message}` };

  // 8. Save analysis with category_results
  const analysisId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: analysisError } = await supabase.from("grid_iq_analyses").insert({
    id: analysisId,
    user_id: user.id,
    herd_group_id: null,
    consignment_id: consignmentId,
    processor_grid_id: grid.id,
    kill_sheet_record_id: null,
    analysis_date: now,
    updated_at: now,
    herd_name: herdNames,
    processor_name: resolvedProcessorName,
    analysis_mode: "pre_sale",
    head_count: totalHead,
    mla_market_value: Math.round(aggMlaMarketValue),
    headline_grid_value: Math.round(aggHeadlineGridValue),
    realisation_factor: realisationFactor,
    realistic_grid_outcome: Math.round(aggRealisticGridOutcome),
    freight_to_saleyard: Math.round(aggFreightToSaleyard),
    freight_to_processor: Math.round(aggFreightToProcessor),
    net_saleyard_value: Math.round(aggNetSaleyard),
    net_processor_value: Math.round(aggNetProcessor),
    grid_iq_advantage: Math.round(aggAdvantage),
    sell_window_status_raw: worstSellWindow.sellWindowStatus,
    sell_window_detail: worstSellWindow.sellWindowDetail,
    days_to_target: worstSellWindow.daysToTarget,
    projected_carcase_weight: Math.round(aggEstCarcaseWeight),
    estimated_carcase_weight: Math.round(aggEstCarcaseWeight),
    dressing_percentage: aggDressingPct,
    is_using_personalised_data: isPersonalised,
    category_results: allocationResults,
    is_deleted: false,
  });

  if (analysisError) return { error: `Failed to save analysis: ${analysisError.message}` };

  // 9. Generate commentary asynchronously
  generateBrangusCommentary({
    analysisId,
    herdName: herdNames,
    herdCategory: allocations[0]?.category ?? "Mixed",
    processorName: resolvedProcessorName,
    analysisMode: "pre_sale",
    result: fullResults[0],
  }).catch((e) => console.error("Commentary generation failed (non-blocking):", e));

  revalidatePath("/dashboard/tools/grid-iq");
  return { analysisId, consignmentId };
}
