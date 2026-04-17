// Portfolio movement calculation service — mirrors iOS PortfolioMovementService.swift
// Uses three-valuation decomposition: Opening/Historical, Opening/Current, Closing/Current

import { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateHerdValuation,
  type CategoryPriceEntry,
  type HerdForValuation,
  type HerdValuationResult,
} from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { resolveMLASaleyardName } from "@/lib/data/reference-data";
import { buildPriceMaps, buildPremiumMap } from "@/lib/services/report-service";
import type {
  MovementPeriod,
  PortfolioMovementSummary,
  HerdMovementDetail,
  BiologicalMovementBreakdown,
  MovementDriver,
} from "@/lib/types/portfolio-movement";

// MARK: - Herd columns needed for movement calculation
const HERD_SELECT = `id, name, species, breed, category, head_count,
  initial_weight, current_weight, daily_weight_gain, age_months,
  dwg_change_date, previous_dwg, created_at,
  is_breeder, is_pregnant, joined_date, calving_rate,
  breeding_program_type, joining_period_start, joining_period_end,
  breed_premium_override, breed_premium_justification, mortality_rate,
  is_sold, sold_date, selected_saleyard,
  additional_info, calf_weight_recorded_date, updated_at,
  breeder_sub_type, sub_category, property_id`;

// MARK: - Historical Price Lookup

interface HistoricalPriceRow {
  price_per_kg: number;
  price_date: string;
  category: string;
  saleyard: string;
}

/** Fetch historical prices for a set of categories at a given date.
 *  Returns a Map of "category|saleyard" -> price_per_kg. */
async function fetchHistoricalPrices(
  supabase: SupabaseClient,
  categories: string[],
  saleyards: string[],
  priceDate: string
): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();

  const { data: rows } = await supabase
    .from("historical_market_prices")
    .select("category, saleyard, price_per_kg, price_date")
    .in("category", categories)
    .lte("price_date", priceDate)
    .order("price_date", { ascending: false })
    .limit(500);

  if (!rows || rows.length === 0) return priceMap;

  // For each category+saleyard combo, take the most recent price on or before priceDate
  const seen = new Set<string>();
  for (const row of rows as HistoricalPriceRow[]) {
    const key = `${row.category}|${row.saleyard}`;
    if (!seen.has(key)) {
      priceMap.set(key, row.price_per_kg);
      seen.add(key);
    }
    // Also store national average per category
    const catKey = `${row.category}|national`;
    if (!seen.has(catKey)) {
      // Approximate national by averaging all saleyards for the latest date
      const sameDateRows = (rows as HistoricalPriceRow[]).filter(
        (r) => r.category === row.category && r.price_date === row.price_date
      );
      const avg = sameDateRows.reduce((s, r) => s + r.price_per_kg, 0) / sameDateRows.length;
      priceMap.set(catKey, avg);
      seen.add(catKey);
    }
  }

  return priceMap;
}

/** Get historical price for a specific category and saleyard from the pre-fetched map.
 *  Falls back to national average if saleyard price not available. */
function getHistoricalPrice(
  priceMap: Map<string, number>,
  category: string,
  saleyard: string | null
): number | null {
  if (saleyard) {
    const resolved = resolveMLASaleyardName(saleyard);
    const price = priceMap.get(`${category}|${resolved}`);
    if (price && price > 0) return price;
  }
  const national = priceMap.get(`${category}|national`);
  return national && national > 0 ? national : null;
}

// MARK: - Main Movement Calculation

export async function calculatePortfolioMovement(
  supabase: SupabaseClient,
  userId: string,
  period: MovementPeriod,
  propertyFilter: string[] = []
): Promise<PortfolioMovementSummary> {
  const openingDate = period.startDate;
  const closingDate = period.endDate;

  // Fetch ALL herds including sold (for removal tracking)
  const { data: allHerdsRaw } = await supabase
    .from("herds")
    .select(HERD_SELECT)
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .order("name");

  let allHerds = allHerdsRaw ?? [];

  // Filter by property if requested
  if (propertyFilter.length > 0) {
    allHerds = allHerds.filter(
      (h: { property_id: string | null }) => h.property_id && propertyFilter.includes(h.property_id)
    );
  }

  // Classify herds
  const openingHerds = allHerds.filter((h: { created_at: string; is_sold: boolean; sold_date: string | null }) => {
    const created = h.created_at.split("T")[0];
    if (created > openingDate) return false;
    if (h.is_sold && h.sold_date) {
      return h.sold_date.split("T")[0] > openingDate;
    }
    return true;
  });

  const closingHerds = allHerds.filter((h: { created_at: string; is_sold: boolean; sold_date: string | null }) => {
    const created = h.created_at.split("T")[0];
    if (created > closingDate) return false;
    if (h.is_sold && h.sold_date) {
      return h.sold_date.split("T")[0] > closingDate;
    }
    return true;
  });

  const openingIds = new Set(openingHerds.map((h: { id: string }) => h.id));
  const closingIds = new Set(closingHerds.map((h: { id: string }) => h.id));

  const continuingHerds = allHerds.filter((h: { id: string }) => openingIds.has(h.id) && closingIds.has(h.id));
  const addedHerds = closingHerds.filter((h: { id: string }) => !openingIds.has(h.id));
  const removedHerds = openingHerds.filter((h: { id: string }) => !closingIds.has(h.id));

  // Build current price maps + premium map
  const [{ nationalPriceMap, saleyardPriceMap, saleyardBreedPriceMap }, premiumMap] = await Promise.all([
    buildPriceMaps(supabase, allHerds),
    buildPremiumMap(supabase),
  ]);

  // Fetch historical prices for opening date
  const allCategories = [...new Set(allHerds.map((h: { category: string; initial_weight: number; breeder_sub_type?: string }) =>
    resolveMLACategory(h.category, h.initial_weight ?? 0, h.breeder_sub_type ?? undefined).primaryMLACategory
  ))];
  const allSaleyardNames = [...new Set(allHerds.map((h: { selected_saleyard: string | null }) => h.selected_saleyard).filter(Boolean) as string[])];
  const historicalPrices = await fetchHistoricalPrices(supabase, allCategories, allSaleyardNames, openingDate);

  // Helper: valuate a herd at a given date with either current or historical prices
  function valuateHerd(herd: HerdForValuation, asOfDate: Date, useHistorical: boolean): HerdValuationResult {
    if (useHistorical) {
      const mlaCategory = resolveMLACategory(
        herd.category, herd.initial_weight ?? herd.current_weight ?? 0, herd.breeder_sub_type ?? undefined
      ).primaryMLACategory;
      const histPrice = getHistoricalPrice(historicalPrices, mlaCategory, herd.selected_saleyard ?? null);

      if (histPrice) {
        // Build a simple price map with the historical price for this category
        const histPriceMap = new Map<string, CategoryPriceEntry[]>();
        histPriceMap.set(mlaCategory, [{ price_per_kg: histPrice, weight_range: null, data_date: openingDate }]);
        return calculateHerdValuation(herd, histPriceMap, premiumMap, asOfDate);
      }
    }
    return calculateHerdValuation(herd, nationalPriceMap, premiumMap, asOfDate, saleyardPriceMap, saleyardBreedPriceMap);
  }

  // Compute valuations
  const openingDateObj = new Date(openingDate);
  const closingDateObj = new Date(closingDate);

  let totalOpeningValue = 0;
  let totalClosingValue = 0;
  let additionsValue = 0;
  let removalsValue = 0;
  let marketMovement = 0;
  let weightGainMovement = 0;
  let breedingMovement = 0;
  let mortalityMovement = 0;
  let l4lOpening = 0;
  let l4lClosing = 0;
  const herdMovements: HerdMovementDetail[] = [];

  // Continuing herds: three valuations each
  for (const herd of continuingHerds) {
    const h = herd as HerdForValuation;
    const openHist = valuateHerd(h, openingDateObj, true);
    const openCurr = valuateHerd(h, openingDateObj, false);
    const closeCurr = valuateHerd(h, closingDateObj, false);

    totalOpeningValue += openHist.netValue;
    totalClosingValue += closeCurr.netValue;
    l4lOpening += openHist.netValue;
    l4lClosing += closeCurr.netValue;

    const mkt = openCurr.netValue - openHist.netValue;
    const wg = closeCurr.weightGainAccrual - openCurr.weightGainAccrual;
    const br = closeCurr.breedingAccrual - openCurr.breedingAccrual;
    const mort = -(closeCurr.mortalityDeduction - openCurr.mortalityDeduction);

    marketMovement += mkt;
    weightGainMovement += wg;
    breedingMovement += br;
    mortalityMovement += mort;

    const change = closeCurr.netValue - openHist.netValue;
    const pct = openHist.netValue !== 0 ? (change / openHist.netValue) * 100 : null;
    const driver = determineMainDriver(mkt, wg, br, mort);

    herdMovements.push({
      id: (herd as { id: string }).id,
      herdName: (herd as { name: string }).name,
      category: `${(herd as { breed: string }).breed} ${(herd as { category: string }).category}`,
      openingValue: openHist.netValue,
      closingValue: closeCurr.netValue,
      dollarChange: change,
      percentChange: pct,
      openingHeadCount: (herd as { head_count: number }).head_count,
      closingHeadCount: (herd as { head_count: number }).head_count,
      mainDriver: driver,
      marketComponent: mkt,
      weightGainComponent: wg,
      breedingComponent: br,
      mortalityComponent: mort,
      currentBreedPremium: closeCurr.breedPremiumApplied,
    });
  }

  // Added herds
  for (const herd of addedHerds) {
    const h = herd as HerdForValuation;
    const closeCurr = valuateHerd(h, closingDateObj, false);
    totalClosingValue += closeCurr.netValue;
    additionsValue += closeCurr.netValue;

    herdMovements.push({
      id: (herd as { id: string }).id,
      herdName: (herd as { name: string }).name,
      category: `${(herd as { breed: string }).breed} ${(herd as { category: string }).category}`,
      openingValue: null,
      closingValue: closeCurr.netValue,
      dollarChange: closeCurr.netValue,
      percentChange: null,
      openingHeadCount: 0,
      closingHeadCount: (herd as { head_count: number }).head_count,
      mainDriver: "Added",
      marketComponent: 0, weightGainComponent: 0, breedingComponent: 0, mortalityComponent: 0,
      currentBreedPremium: closeCurr.breedPremiumApplied,
    });
  }

  // Removed herds
  for (const herd of removedHerds) {
    const h = herd as HerdForValuation;
    const openHist = valuateHerd(h, openingDateObj, true);
    totalOpeningValue += openHist.netValue;
    removalsValue += openHist.netValue;

    herdMovements.push({
      id: (herd as { id: string }).id,
      herdName: (herd as { name: string }).name,
      category: `${(herd as { breed: string }).breed} ${(herd as { category: string }).category}`,
      openingValue: openHist.netValue,
      closingValue: null,
      dollarChange: -openHist.netValue,
      percentChange: null,
      openingHeadCount: (herd as { head_count: number }).head_count,
      closingHeadCount: 0,
      mainDriver: "Removed/Sold",
      marketComponent: 0, weightGainComponent: 0, breedingComponent: 0, mortalityComponent: 0,
      currentBreedPremium: openHist.breedPremiumApplied,
    });
  }

  // Sort by absolute dollar change
  herdMovements.sort((a, b) => Math.abs(b.dollarChange) - Math.abs(a.dollarChange));

  const biologicalTotal = weightGainMovement + breedingMovement + mortalityMovement;
  const biologicalMovement: BiologicalMovementBreakdown = {
    weightGain: weightGainMovement,
    breedingAccrual: breedingMovement,
    mortality: mortalityMovement,
    total: biologicalTotal,
  };

  // Assumption changes = residual to balance the bridge
  const assumptionChanges = totalClosingValue - totalOpeningValue - additionsValue + removalsValue
    - marketMovement - biologicalTotal;

  const openingHeadCount = openingHerds.reduce((s: number, h: { head_count: number }) => s + (h.head_count ?? 0), 0);
  const closingHeadCount = closingHerds.reduce((s: number, h: { head_count: number }) => s + (h.head_count ?? 0), 0);

  const netChange = totalClosingValue - totalOpeningValue;
  const netPercent = totalOpeningValue !== 0 ? (netChange / totalOpeningValue) * 100 : null;

  const l4lChange = l4lClosing - l4lOpening;
  const l4lPercent = l4lOpening !== 0 ? (l4lChange / l4lOpening) * 100 : null;

  return {
    openingDate,
    closingDate,
    openingValue: totalOpeningValue,
    closingValue: totalClosingValue,
    netChangeDollars: netChange,
    netChangePercent: netPercent,
    openingHeadCount,
    closingHeadCount,
    netHeadCountChange: closingHeadCount - openingHeadCount,
    additionsValue,
    additionsHeadCount: addedHerds.reduce((s: number, h: { head_count: number }) => s + (h.head_count ?? 0), 0),
    removalsValue,
    removalsHeadCount: removedHerds.reduce((s: number, h: { head_count: number }) => s + (h.head_count ?? 0), 0),
    marketMovement,
    biologicalMovement,
    assumptionChanges,
    likeForLikeOpeningValue: l4lOpening,
    likeForLikeClosingValue: l4lClosing,
    likeForLikeChangeDollars: l4lChange,
    likeForLikeChangePercent: l4lPercent,
    herdMovements,
  };
}

// MARK: - Main Driver Determination

function determineMainDriver(
  market: number,
  weightGain: number,
  breeding: number,
  mortality: number
): MovementDriver {
  const components: [MovementDriver, number][] = [
    ["Market", Math.abs(market)],
    ["Weight Gain", Math.abs(weightGain)],
    ["Calf Accrual", Math.abs(breeding)],
    ["Mortality", Math.abs(mortality)],
  ];
  components.sort((a, b) => b[1] - a[1]);
  return components[0]?.[1] > 0 ? components[0][0] : "Assumption";
}
