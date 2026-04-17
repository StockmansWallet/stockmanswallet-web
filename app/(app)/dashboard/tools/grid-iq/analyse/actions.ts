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
import {
  analyse,
  defaultDressingPercentage,
  BASELINE_REALISATION_FACTOR,
  type AnalysisMode,
} from "@/lib/engines/grid-iq-engine";
import type { KillSheetForScoring, KillSheetLineItem, GridEntry } from "@/lib/engines/kill-score-engine";
import { runPaymentCheck } from "@/lib/engines/grid-iq-payment-check";
import { generateBrangusCommentary } from "@/lib/grid-iq/commentary-service";
import { computeProducerProfile } from "@/lib/grid-iq/producer-profile";

const createAnalysisSchema = z.object({
  gridId: z.string().uuid(),
  herdId: z.string().uuid(),
  killSheetId: z.string().uuid().nullable(),
});

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

export async function createAnalysis(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const gridId = formData.get("gridId") as string;
  const herdId = formData.get("herdId") as string;
  const killSheetId = (formData.get("killSheetId") as string) || null;

  const parsed = createAnalysisSchema.safeParse({ gridId, herdId, killSheetId });
  if (!parsed.success) return { error: "Invalid input" };

  const analysisMode: AnalysisMode = killSheetId ? "post_sale" : "pre_sale";

  // 1. Fetch grid, herd, kill sheet, property in parallel
  const [{ data: grid }, { data: herd }, killSheetResult, { data: breedPremiumData }] = await Promise.all([
    supabase
      .from("processor_grids")
      .select("id, processor_name, grid_code, entries, location_latitude, location_longitude")
      .eq("id", gridId)
      .eq("user_id", user.id)
      .single(),
    supabase
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
      .eq("id", herdId)
      .eq("user_id", user.id)
      .single(),
    killSheetId
      ? supabase
          .from("kill_sheet_records")
          .select(
            `id, processor_name, kill_date, total_head_count, total_gross_value,
             total_body_weight, average_body_weight, average_price_per_kg,
             line_items, grade_distribution, realisation_factor, condemns`
          )
          .eq("id", killSheetId)
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    supabase.from("breed_premiums").select("breed, premium_percent:premium_pct"),
  ]);

  if (!grid) return { error: "Grid not found" };
  if (!herd) return { error: "Herd not found" };

  // 2. Fetch property coordinates (for freight)
  let propertyLat: number | null = null;
  let propertyLon: number | null = null;
  if (herd.property_id) {
    const { data: property } = await supabase
      .from("properties")
      .select("latitude, longitude")
      .eq("id", herd.property_id)
      .single();
    if (property) {
      propertyLat = property.latitude;
      propertyLon = property.longitude;
    }
  }

  // 3. Fetch market prices (same pattern as dashboard page.tsx)
  const mlaCategory = resolveMLACategory(herd.category, herd.initial_weight, herd.breeder_sub_type ?? undefined).primaryMLACategory;
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
  const emptyPrices: PriceRow[] = [];

  const [{ data: saleyardPrices }, { data: nationalPrices }] = await Promise.all([
    resolvedSaleyard
      ? supabase
          .from("category_prices")
          .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date")
          .eq("saleyard", resolvedSaleyard)
          .in("category", mlaCategories)
          .order("data_date", { ascending: false })
          .limit(5000)
      : Promise.resolve({ data: emptyPrices }),
    supabase
      .from("category_prices")
      .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date")
      .eq("saleyard", "National")
      .in("category", mlaCategories)
      .order("data_date", { ascending: false })
      .limit(5000),
  ]);

  const allPrices = [...(saleyardPrices ?? []), ...(nationalPrices ?? [])];

  // Build price maps
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

  const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
  for (const b of breedPremiumData ?? []) {
    premiumMap.set(b.breed, b.premium_percent);
  }

  // 4. Calculate MLA market value
  const valuation = calculateHerdValuation(
    herd as Parameters<typeof calculateHerdValuation>[0],
    nationalPriceMap,
    premiumMap,
    undefined,
    saleyardPriceMap,
    saleyardBreedPriceMap
  );
  const mlaMarketValue = valuation.netValue;

  // 5. Projected weight and dressing %
  const createdAt = herd.created_at ? new Date(herd.created_at) : new Date();
  const projectedLiveWeight = calculateProjectedWeight(
    herd.initial_weight ?? herd.current_weight ?? 0,
    createdAt,
    herd.dwg_change_date ? new Date(herd.dwg_change_date) : null,
    new Date(),
    herd.previous_dwg ?? null,
    herd.daily_weight_gain ?? 0
  );

  const killSheetData = killSheetResult?.data ?? null;
  let dressingPct: number;
  let isPersonalised = false;

  if (killSheetData && killSheetData.average_body_weight > 0 && projectedLiveWeight > 0) {
    const actual = killSheetData.average_body_weight / projectedLiveWeight;
    if (actual >= 0.40 && actual <= 0.70) {
      dressingPct = actual;
      isPersonalised = true;
    } else {
      dressingPct = defaultDressingPercentage(herd.category);
    }
  } else {
    dressingPct = defaultDressingPercentage(herd.category);
  }

  const estimatedCarcaseWeight = projectedLiveWeight * dressingPct;

  // 6. Realisation factor - prefer kill sheet > producer profile > baseline
  let realisationFactor = BASELINE_REALISATION_FACTOR;
  if (killSheetData?.realisation_factor && killSheetData.realisation_factor > 0) {
    realisationFactor = killSheetData.realisation_factor;
    isPersonalised = true;
  } else {
    // Use historical average RF from producer profile if available
    try {
      const profile = await computeProducerProfile(user.id);
      if (profile.averageRF != null && profile.averageRF > 0) {
        realisationFactor = profile.averageRF;
        isPersonalised = true;
      }
    } catch (e) {
      console.warn("Could not fetch producer profile for RF:", e);
    }
  }

  // 7. Freight calculations
  let freightToSaleyard = 0;
  let freightToProcessor = 0;

  if (propertyLat !== null && propertyLon !== null) {
    // Saleyard freight
    if (resolvedSaleyard && saleyardCoordinates[resolvedSaleyard]) {
      const sc = saleyardCoordinates[resolvedSaleyard];
      const distKm = haversineKm(propertyLat, propertyLon, sc.lat, sc.lon) * 1.3;
      if (distKm > 0) {
        const est = calculateFreightEstimate({
          appCategory: herd.category,
          sex: herd.sex ?? "Male",
          averageWeightKg: projectedLiveWeight,
          headCount: herd.head_count ?? 0,
          distanceKm: distKm,
        });
        freightToSaleyard = est.totalCost;
      }
    }

    // Processor freight
    if (grid.location_latitude && grid.location_longitude) {
      const distKm = haversineKm(propertyLat, propertyLon, grid.location_latitude, grid.location_longitude) * 1.3;
      if (distKm > 0) {
        const est = calculateFreightEstimate({
          appCategory: herd.category,
          sex: herd.sex ?? "Male",
          averageWeightKg: projectedLiveWeight,
          headCount: herd.head_count ?? 0,
          distanceKm: distKm,
        });
        freightToProcessor = est.totalCost;
      }
    }
  }

  // 8. Build kill sheet for scoring (if available)
  let killSheetForScoring: (KillSheetForScoring & { id: string }) | null = null;
  if (killSheetData) {
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

    killSheetForScoring = {
      id: killSheetData.id,
      totalHeadCount: killSheetData.total_head_count ?? 0,
      totalGrossValue: killSheetData.total_gross_value ?? 0,
      lineItems,
    };
  }

  // 9. Run analysis engine
  const gridEntries = (grid.entries ?? []) as GridEntry[];
  const result = analyse({
    herd: {
      id: herd.id,
      name: herd.name,
      sex: herd.sex ?? "Male",
      category: herd.category,
      headCount: herd.head_count ?? 0,
      dailyWeightGain: herd.daily_weight_gain ?? 0,
    },
    grid: {
      id: grid.id,
      processorName: grid.processor_name,
      entries: gridEntries,
    },
    killSheet: killSheetForScoring,
    mlaMarketValue,
    estimatedCarcaseWeight,
    dressingPercentage: dressingPct,
    isPersonalisedData: isPersonalised,
    realisationFactor,
    freightToSaleyard,
    freightToProcessor,
    analysisMode,
  });

  // 10. Insert into grid_iq_analyses
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error } = await supabase.from("grid_iq_analyses").insert({
    id: newId,
    user_id: user.id,
    herd_id: result.herdGroupId,
    processor_grid_id: result.processorGridId,
    kill_sheet_record_id: result.killSheetRecordId,
    analysis_date: now,
    updated_at: now,
    herd_name: result.herdName,
    processor_name: result.processorName,
    analysis_mode: result.analysisMode,
    head_count: result.headCount,
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
    dentition_compliance_score: result.dentitionComplianceScore
      ? Math.round(result.dentitionComplianceScore * 10) / 10
      : null,
    is_deleted: false,
  });

  if (error) {
    return { error: `Failed to save analysis: ${error.message}` };
  }

  // 11. Payment check - audit kill sheet prices against grid (post-sale only)
  if (killSheetForScoring && killSheetForScoring.lineItems.length > 0) {
    try {
      const paymentResult = runPaymentCheck(
        killSheetForScoring.lineItems,
        killSheetForScoring.totalGrossValue,
        gridEntries,
        herd.sex,
      );
      // Store on the kill sheet record
      await supabase
        .from("kill_sheet_records")
        .update({ payment_check_result: paymentResult })
        .eq("id", killSheetForScoring.id);
    } catch (e) {
      console.error("Payment check failed (non-blocking):", e);
    }
  }

  // 12. Generate Brangus commentary asynchronously (non-blocking)
  generateBrangusCommentary({
    analysisId: newId,
    herdName: herd.name,
    herdCategory: herd.category,
    processorName: grid.processor_name,
    analysisMode,
    result,
  }).catch((e) => console.error("Commentary generation failed (non-blocking):", e));

  revalidatePath("/dashboard/tools/grid-iq");
  return { analysisId: newId };
}
