// Core valuation engine — Adjusted Market Value calculations
// Ported from iOS ValuationEngine.swift + extensions
// Pure functions — pricing/caching will be added when Supabase data layer is wired up

import { resolveMLASaleyardName, saleyardToState } from "../data/reference-data";
import { parseLocalDate as parseLocal } from "../dates";
import { resolveMLACategory, defaultMappingRules } from "../data/weight-mapping";
import { nearestSaleyards as nearestSaleyardsFn } from "../data/saleyard-proximity";

// MARK: - Category Fallback
// Debug: Returns an alternate MLA category when the primary has no price data.
// Uses the fallback from the weight-first mapping rules.
export function categoryFallback(mlaCategory: string): string | null {
  const rule = defaultMappingRules.find(
    (r) => r.mla_preferred === mlaCategory && r.mla_fallback && r.mla_fallback !== mlaCategory
  );
  return rule?.mla_fallback ?? null;
}

// MARK: - Constants

export const BREEDING_ACCRUAL_CYCLE_DAYS = 365;
const STALE_DATA_THRESHOLD_DAYS = 56;   // 8 weeks — auto-switch to nearest saleyard
export const STALE_WARNING_THRESHOLD_DAYS = 42; // 6 weeks — amber UI warning

// MARK: - Valuation Result

export interface HerdValuation {
  herdId: string;
  physicalValue: number;
  baseMarketValue: number;
  weightGainAccrual: number;
  breedingAccrual: number;
  preBirthAccrual: number;
  calvesAtFootValue: number;
  grossValue: number;
  mortalityDeduction: number;
  netValue: number;
  netRealizableValue: number;
  pricePerKg: number;
  priceSource: string;
  projectedWeight: number;
  valuationDate: string;
  breedPremiumApplied?: number;
}

// MARK: - Weight Gain Calculation (Split Approach)

/**
 * Calculates projected weight using Scenario B: Split Calculation
 * Formula: ProjectedWeight = WeightInitial + (DWG_Old x DaysPhase1) + (DWG_New x DaysPhase2)
 */
export function calculateProjectedWeight(
  initialWeight: number,
  dateStart: Date,
  dateChange: Date | null,
  dateCurrent: Date,
  dwgOld: number | null,
  dwgNew: number
): number {
  if (dateChange && dwgOld !== null) {
    const daysPhase1 = Math.max(0, (dateChange.getTime() - dateStart.getTime()) / 86400000);
    const daysPhase2 = Math.max(0, (dateCurrent.getTime() - dateChange.getTime()) / 86400000);
    return initialWeight + (dwgOld * daysPhase1) + (dwgNew * daysPhase2);
  } else {
    const daysPhase2 = Math.max(0, (dateCurrent.getTime() - dateStart.getTime()) / 86400000);
    return initialWeight + (dwgNew * daysPhase2);
  }
}

// MARK: - Pre-Birth Accrual (Progressive Valuation)

/**
 * Calculates accrued value of pregnant stock per spec Section 2
 * Formula: (Head x CalvingRate) x (DaysElapsed / 365) x CalfBirthWeight x BreedAdjCKg / 100
 */
export function calculatePreBirthAccrual(
  headCount: number,
  calvingRate: number,
  daysElapsed: number,
  calfBirthWeight: number,
  pricePerKg: number
): number {
  const accruedPct = Math.min(1.0, daysElapsed / BREEDING_ACCRUAL_CYCLE_DAYS);
  const expectedProgeny = headCount * calvingRate;
  return expectedProgeny * accruedPct * calfBirthWeight * pricePerKg;
}

// MARK: - Mortality Accrual

/**
 * Calculates mortality deduction per spec Section 5
 * Formula: MortalityDeduction = MarketValue x (DaysElapsed / 365) x MortalityRate
 */
export function calculateMortalityDeduction(
  marketValue: number,
  mortalityRateAnnual: number,
  daysHeld: number
): number {
  if (mortalityRateAnnual <= 0 || daysHeld <= 0) return 0;
  return marketValue * (daysHeld / 365) * mortalityRateAnnual;
}

// MARK: - Calves at Foot (spec Section 3)

/**
 * Parses "Calves at Foot: X head, Y months[, Z kg]" from additional_info string.
 * Matches iOS HerdGroup+CalvesAtFoot.swift parsing logic.
 */
export function parseCalvesAtFoot(additionalInfo: string | null): { headCount: number; ageMonths: number; averageWeight: number | null } | null {
  if (!additionalInfo) return null;
  const match = additionalInfo.match(/Calves at Foot: ([^|\n]+)/);
  if (!match) return null;

  const parts = match[1].split(", ");
  let headCount: number | null = null;
  let ageMonths: number | null = null;
  let averageWeight: number | null = null;

  for (const part of parts) {
    if (part.includes("head")) {
      headCount = parseInt(part.replace(" head", "").trim(), 10);
    } else if (part.includes("months")) {
      ageMonths = parseInt(part.replace(" months", "").trim(), 10);
    } else if (part.includes("kg")) {
      averageWeight = parseFloat(part.replace(" kg", "").trim());
    }
  }

  if (headCount == null || headCount <= 0 || ageMonths == null) return null;
  return { headCount, ageMonths, averageWeight };
}

/**
 * Calculates calves at foot value per spec Section 3.
 * Uses species-specific DWG (Cattle 0.9, Sheep 0.25 kg/day).
 * If user provided a weight, applies ongoing DWG from recording date.
 * Otherwise estimates from age.
 */
export function calculateCalfAtFootValue(
  calvesData: { headCount: number; ageMonths: number; averageWeight: number | null },
  weightRecordedAt: Date,
  species: string,
  pricePerKg: number,
  asOfDate: Date
): number {
  const dwg = species === "Cattle" ? 0.9 : 0.25;
  let currentCalfWeight: number;

  if (calvesData.averageWeight != null && calvesData.averageWeight > 0) {
    // Per spec Section 3.2 - apply ongoing DWG from calf weight recording date
    const daysSinceRecorded = Math.max(0, Math.floor((asOfDate.getTime() - weightRecordedAt.getTime()) / 86400000));
    currentCalfWeight = calvesData.averageWeight + dwg * daysSinceRecorded;
  } else {
    // No user weight - estimate from age (fallback)
    const daysOld = calvesData.ageMonths * 30;
    currentCalfWeight = dwg * daysOld;
  }

  return calvesData.headCount * currentCalfWeight * pricePerKg;
}

// MARK: - Weight Range Matching

/**
 * Returns ALL weight brackets that a given weight could fit into (inclusive bounds).
 * Ranged brackets (e.g. "330-400"): lower <= weight <= upper
 * Open-ended brackets (e.g. "400+"): weight >= lower
 * A boundary weight like 400 can match both "330-400" and "400+".
 */
export function findCandidateBrackets(weight: number, availableRanges: string[]): string[] {
  const candidates: string[] = [];
  for (const range of availableRanges) {
    if (range.endsWith("+")) {
      const min = parseFloat(range.slice(0, -1));
      if (!isNaN(min) && weight >= min) candidates.push(range);
    } else if (range.includes("-")) {
      const parts = range.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        const max = parseFloat(parts[1]);
        if (!isNaN(min) && !isNaN(max) && weight >= min && weight <= max) candidates.push(range);
      }
    }
  }
  return candidates;
}

/**
 * Clamps to the nearest bracket when no candidate brackets exist.
 * Used as a last resort when the weight falls outside all available ranges.
 */
export function clampToNearestBracket(weight: number, availableRanges: string[]): string | null {
  if (availableRanges.length === 0) return null;
  let nearestRange: string | null = null;
  let smallestDistance = Infinity;

  for (const range of availableRanges) {
    if (range.endsWith("+")) {
      const min = parseFloat(range.slice(0, -1));
      if (!isNaN(min)) {
        const distance = Math.abs(weight - min);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          nearestRange = range;
        }
      }
    } else if (range.includes("-")) {
      const parts = range.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        const max = parseFloat(parts[1]);
        if (!isNaN(min) && !isNaN(max)) {
          const distance = weight < min ? min - weight : Math.max(0, weight - max);
          if (distance < smallestDistance) {
            smallestDistance = distance;
            nearestRange = range;
          }
        }
      }
    }
  }

  return nearestRange;
}

/**
 * Backward-compatible wrapper. Returns the single best bracket match.
 */
export function matchWeightRange(weight: number, availableRanges: string[]): string | null {
  const candidates = findCandidateBrackets(weight, availableRanges);
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    // Prefer open-ended bracket on boundary (e.g. "400+" over "330-400")
    const openEnded = candidates.find((r) => r.endsWith("+"));
    if (openEnded) return openEnded;
    // On boundary between two ranged brackets (e.g. "330-400" and "400-500"),
    // prefer the upper bracket (where weight matches the lower bound).
    // This is deterministic regardless of query result ordering.
    const upper = candidates.find((r) => {
      const parts = r.split("-");
      return parts.length === 2 && parseFloat(parts[0]) === weight;
    });
    return upper ?? candidates[0];
  }
  return clampToNearestBracket(weight, availableRanges);
}

// MARK: - Default Fallback Prices

/**
 * Category-specific default prices based on realistic market rates.
 * Used when no Supabase market data is available.
 */
export function defaultFallbackPrice(category: string): number {
  // Sheep categories
  if (category.includes("Breeding Ewe") || category.includes("Maiden Ewe") || category.includes("Dry Ewe")) {
    return 10.56;
  } else if (category.includes("Cull Ewe") || category.includes("Slaughter Ewe")) {
    return 9.24;
  } else if (category.includes("Wether Lamb") || category.includes("Weaner Lamb") || category.includes("Feeder Lamb")) {
    return 11.55;
  } else if (category.includes("Slaughter Lamb") || category.includes("Lambs")) {
    return 10.89;
  }
  // Pig categories
  else if ((category.includes("Breeder") || category.includes("Dry Sow")) && category.includes("Sow")) {
    return 2.18;
  } else if (category.includes("Cull Sow")) {
    return 1.98;
  } else if (category.includes("Weaner Pig") || category.includes("Feeder Pig")) {
    return 2.31;
  } else if (category.includes("Grower") || category.includes("Finisher")) {
    return 2.15;
  } else if (category.includes("Porker") || category.includes("Baconer")) {
    return 2.18;
  }
  // Goat categories
  else if (category.includes("Breeder Doe") || category.includes("Dry Doe")) {
    return 4.29;
  } else if (category.includes("Cull Doe")) {
    return 3.96;
  } else if (category.includes("Breeder Buck") || category.includes("Sale Buck")) {
    return 4.46;
  } else if (category.includes("Mature Wether") || category.includes("Rangeland Goat")) {
    return 4.29;
  } else if (category.includes("Capretto")) {
    return 5.05;
  } else if (category.includes("Chevon")) {
    return 4.13;
  }
  // Cattle categories (receives resolved MLA category names from DB)
  // DB canonical names: Weaner Steer, Yearling Steer, Grown Steer, Heifer, Yearling Heifer, Grown Heifer, Cows, Grown Bull
  else if (category === "Weaner Steer") {
    return 3.89;
  } else if (category === "Yearling Steer") {
    return 4.10;
  } else if (category === "Grown Steer") {
    return 3.30;
  } else if (category === "Heifer") {
    return 3.89;
  } else if (category === "Yearling Heifer") {
    return 4.10;
  } else if (category === "Grown Heifer") {
    return 3.30;
  } else if (category === "Cows") {
    return 3.80;
  } else if (category === "Grown Bull") {
    return 3.30;
  }

  // Default fallback
  return 3.30;
}

// MARK: - Helper: Days Between Dates

export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
}

// MARK: - Full Herd Valuation (mirrors iOS ValuationEngine+HerdValuation.swift)

export interface HerdForValuation {
  head_count: number;
  initial_weight: number;
  current_weight: number;
  daily_weight_gain: number;
  dwg_change_date: string | null;
  previous_dwg: number | null;
  created_at: string;
  species: "Cattle" | "Sheep" | "Pig" | "Goat";
  category: string;
  breed: string;
  breed_premium_override: number | null;
  mortality_rate: number | null;
  is_breeder: boolean;
  is_pregnant: boolean;
  joined_date: string | null;
  calving_rate: number;
  breeding_program_type: "ai" | "controlled" | "uncontrolled" | null;
  joining_period_start: string | null;
  joining_period_end: string | null;
  selected_saleyard: string | null;
  additional_info: string | null;
  calf_weight_recorded_date: string | null;
  updated_at: string;
  breeder_sub_type?: string | null;
}

// Price entry with optional weight range (matches category_prices table structure)
export interface CategoryPriceEntry {
  price_per_kg: number;
  weight_range: string | null;
  data_date?: string;
}

/**
 * Resolves the best price from a list of CategoryPriceEntry for a given projected weight.
 *
 * Uses the newest date's brackets only. If the weight fits a bracket on that date, use it.
 * If the weight is on a boundary (e.g. exactly 400 matching both "330-400" and "400+"),
 * prefer the upper bracket. If no bracket fits on the newest date, clamp to nearest.
 * Never fall back to stale dates - brackets may not exist in newer data.
 */
interface PriceResolution {
  price: number;
  matchedRange: string | null;
  dataDate: string | null;
}

function resolvePriceFromEntries(
  entries: CategoryPriceEntry[],
  projectedWeight: number
): PriceResolution | null {
  if (entries.length === 0) return null;

  // Find the newest date with data
  const dates = [...new Set(
    entries.filter((e) => e.data_date).map((e) => e.data_date as string)
  )].sort((a, b) => b.localeCompare(a));

  const newestDate = dates[0] ?? null;

  // Work with newest-date entries (or all entries if none have dates)
  const relevantEntries = newestDate
    ? entries.filter((e) => e.data_date === newestDate)
    : entries;

  const availableRanges = [...new Set(
    relevantEntries.map((e) => e.weight_range).filter((r): r is string => r !== null)
  )];

  // Try exact bracket match (with boundary preference for upper bracket)
  const matched = matchWeightRange(projectedWeight, availableRanges);
  if (matched) {
    const match = relevantEntries.find((e) => e.weight_range === matched);
    if (match) return { price: match.price_per_kg, matchedRange: matched, dataDate: newestDate };
  }

  // Final fallback: any-weight entries (weight_range is null)
  const nullRange = relevantEntries.filter((e) => e.weight_range === null);
  if (nullRange.length > 0) return { price: Math.max(...nullRange.map((e) => e.price_per_kg)), matchedRange: null, dataDate: newestDate };

  // Absolute fallback: max price from relevant entries
  if (relevantEntries.length > 0) return { price: Math.max(...relevantEntries.map((e) => e.price_per_kg)), matchedRange: null, dataDate: newestDate };
  return null;
}

// MARK: - Staleness Check

/** Returns true if dataDate is older than thresholdDays from today */
function isDataStale(dataDate: string | null | undefined, thresholdDays: number): boolean {
  if (!dataDate) return false;
  const date = new Date(dataDate);
  const daysSince = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  return daysSince > thresholdDays;
}

// MARK: - Detailed Valuation Result

export type PriceSource = "saleyard" | "national" | "fallback";

export interface HerdValuationResult {
  herdId?: string;
  netValue: number;
  priceSource: PriceSource;
  pricePerKg: number;
  breedPremiumApplied: number;
  // Full breakdown (always populated)
  projectedWeight: number;
  basePrice: number;
  physicalValue: number;
  baseMarketValue: number;
  weightGainAccrual: number;
  breedingAccrual: number;
  preBirthAccrual: number;
  calvesAtFootValue: number;
  grossValue: number;
  mortalityDeduction: number;
  daysHeld: number;
  mortalityRate: number;
  matchedWeightRange: string | null;
  mlaCategory: string;
  valuationDate: string;
  initialWeight: number;
  dataDate: string | null;
  nearestSaleyardUsed: string | null;
}

/**
 * Full herd valuation matching iOS ValuationEngine formula exactly.
 * Returns detailed result including price source for UI indicators.
 *
 * Price resolution hierarchy (mirrors iOS resolveGeneralBasePrice + getMarketPrice):
 *   1. Saleyard general (breed=null) price + breed premium
 *   2. National general (breed=null) price + breed premium
 *   3. Saleyard breed-specific price (no breed premium - already baked in)
 *   4. Hardcoded category fallback + breed premium
 *
 * iOS first resolves a "general base price" (saleyard general -> national general)
 * via resolveGeneralBasePrice(). If found, breed premium is applied to it. Only when
 * NO general base exists at any level does iOS fall through to the raw price from
 * getMarketPrice() (which may be breed-specific) without breed premium.
 */
export function calculateHerdValuation(
  herd: HerdForValuation,
  nationalPriceMap: Map<string, CategoryPriceEntry[]>,
  premiumMap: Map<string, number>,
  asOf: Date = new Date(),
  saleyardPriceMap?: Map<string, CategoryPriceEntry[]>,
  saleyardBreedPriceMap?: Map<string, CategoryPriceEntry[]>
): HerdValuationResult {
  const head = herd.head_count ?? 0;
  if (head === 0) return {
    netValue: 0, priceSource: "fallback", pricePerKg: 0, breedPremiumApplied: 0,
    projectedWeight: 0, basePrice: 0, physicalValue: 0, baseMarketValue: 0,
    weightGainAccrual: 0, breedingAccrual: 0, preBirthAccrual: 0, calvesAtFootValue: 0, grossValue: 0, mortalityDeduction: 0,
    daysHeld: 0, mortalityRate: 0, matchedWeightRange: null, mlaCategory: "",
    valuationDate: new Date().toISOString(), initialWeight: 0, dataDate: null, nearestSaleyardUsed: null,
  };

  const now = asOf;
  const createdAt = herd.created_at ? new Date(herd.created_at) : now;

  // 1. Projected weight (split DWG)
  const projectedWeight = calculateProjectedWeight(
    herd.initial_weight ?? herd.current_weight ?? 0,
    createdAt,
    herd.dwg_change_date ? parseLocal(herd.dwg_change_date) : null,
    now,
    herd.previous_dwg ?? null,
    herd.daily_weight_gain ?? 0
  );

  // 2. Live price - map app category to MLA category, then resolve via hierarchy
  const mlaCategory = resolveMLACategory(herd.category, herd.initial_weight ?? herd.current_weight ?? 0, herd.breeder_sub_type ?? undefined).primaryMLACategory;
  let resolved: PriceResolution | null = null;
  let priceSource: PriceSource = "fallback";
  let skipBreedPremium = false;
  let matchedWeightRange: string | null = null;

  // Resolve short saleyard name to full MLA name (e.g. "Charters Towers" -> "Charters Towers Dalrymple Saleyards")
  const resolvedSaleyard = herd.selected_saleyard ? resolveMLASaleyardName(herd.selected_saleyard) : null;

  // 2a. Try saleyard general (breed=null) price first - breed premium safe
  if (saleyardPriceMap && resolvedSaleyard) {
    const saleyardKey = `${mlaCategory}|${resolvedSaleyard}`;
    const saleyardEntries = saleyardPriceMap.get(saleyardKey) ?? [];
    resolved = resolvePriceFromEntries(saleyardEntries, projectedWeight);
    // Debug: Skip stale saleyard data (>8 weeks) — fall through to nearest saleyard
    if (resolved && isDataStale(resolved.dataDate, STALE_DATA_THRESHOLD_DAYS)) {
      resolved = null;
    }
    if (resolved) { priceSource = "saleyard"; matchedWeightRange = resolved.matchedRange; }
  }

  // 2b. Try saleyard breed-specific (skip breed premium - already baked in)
  if (!resolved && saleyardBreedPriceMap && resolvedSaleyard) {
    const breedKey = `${mlaCategory}|${herd.breed}|${resolvedSaleyard}`;
    const breedEntries = saleyardBreedPriceMap.get(breedKey) ?? [];
    resolved = resolvePriceFromEntries(breedEntries, projectedWeight);
    // Debug: Skip stale saleyard breed data (>8 weeks)
    if (resolved && isDataStale(resolved.dataDate, STALE_DATA_THRESHOLD_DAYS)) {
      resolved = null;
    }
    if (resolved) {
      priceSource = "saleyard";
      skipBreedPremium = true;
      matchedWeightRange = resolved.matchedRange;
    }
  }

  // 2b2. Try nearest saleyards in same state (proximity fallback)
  let nearestSaleyardUsed: string | null = null;
  if (!resolved && saleyardPriceMap && resolvedSaleyard && herd.selected_saleyard) {
    const state = saleyardToState[resolvedSaleyard] ?? "";
    const nearYards = nearestSaleyardsFn(resolvedSaleyard, state, 3);
    for (const nearYard of nearYards) {
      const nearKey = `${mlaCategory}|${nearYard}`;
      const nearEntries = saleyardPriceMap.get(nearKey) ?? [];
      resolved = resolvePriceFromEntries(nearEntries, projectedWeight);
      // Debug: Skip stale nearest saleyard data too
      if (resolved && isDataStale(resolved.dataDate, STALE_DATA_THRESHOLD_DAYS)) {
        resolved = null;
        continue;
      }
      if (resolved) { priceSource = "saleyard"; nearestSaleyardUsed = nearYard; matchedWeightRange = resolved.matchedRange; break; }
    }
  }

  // 2c. Try national general (breed=null) price - breed premium safe
  if (!resolved) {
    const nationalEntries = nationalPriceMap.get(mlaCategory) ?? [];
    resolved = resolvePriceFromEntries(nationalEntries, projectedWeight);
    if (resolved) { priceSource = "national"; matchedWeightRange = resolved.matchedRange; }
  }

  // 2d. Try fallback category if primary found nothing (e.g. "Yearling Heifer" -> "Heifer")
  if (!resolved) {
    const fallbackCat = categoryFallback(mlaCategory);
    if (fallbackCat) {
      // Try saleyard general for fallback
      if (saleyardPriceMap && resolvedSaleyard) {
        const fbSyKey = `${fallbackCat}|${resolvedSaleyard}`;
        const fbSyEntries = saleyardPriceMap.get(fbSyKey) ?? [];
        resolved = resolvePriceFromEntries(fbSyEntries, projectedWeight);
        if (resolved) { priceSource = "saleyard"; matchedWeightRange = resolved.matchedRange; }
      }
      // Try saleyard breed-specific for fallback
      if (!resolved && saleyardBreedPriceMap && resolvedSaleyard) {
        const fbBreedKey = `${fallbackCat}|${herd.breed}|${resolvedSaleyard}`;
        const fbBreedEntries = saleyardBreedPriceMap.get(fbBreedKey) ?? [];
        resolved = resolvePriceFromEntries(fbBreedEntries, projectedWeight);
        if (resolved) { priceSource = "saleyard"; skipBreedPremium = true; matchedWeightRange = resolved.matchedRange; }
      }
      // Try national for fallback
      if (!resolved) {
        const fbNatEntries = nationalPriceMap.get(fallbackCat) ?? [];
        resolved = resolvePriceFromEntries(fbNatEntries, projectedWeight);
        if (resolved) { priceSource = "national"; matchedWeightRange = resolved.matchedRange; }
      }
    }
  }

  // 2e. Final fallback to hardcoded defaults (use resolved MLA category, not master category)
  const basePrice = resolved ? resolved.price : defaultFallbackPrice(mlaCategory);

  // 3. Breed premium - only apply to general (breed=null) prices (mirrors iOS resolveGeneralBasePrice guard)
  const rawPremiumPct = skipBreedPremium ? 0 : (herd.breed_premium_override ?? premiumMap.get(herd.breed) ?? 0);
  const adjustedPrice = basePrice * (1 + rawPremiumPct / 100);

  // 3. Physical value and base market value (for mortality calculation)
  const physicalValue = head * projectedWeight * adjustedPrice;
  const baseMarketValue = head * (herd.initial_weight ?? herd.current_weight ?? 0) * adjustedPrice;

  // 4. Mortality deduction (linear, on physical value / projected weight)
  const daysHeld = daysBetween(createdAt, now);
  const mortalityRate = herd.mortality_rate ?? 0.05;
  const mortalityDeduction = calculateMortalityDeduction(physicalValue, mortalityRate, daysHeld);

  // 5. Pre-birth breeding accrual (pregnant breeders with a joining date)
  let preBirthAccrual = 0;
  if (herd.is_breeder && herd.is_pregnant && herd.joined_date) {
    let accrualStart: Date;
    const isUncontrolled = herd.breeding_program_type === "uncontrolled";
    if (isUncontrolled) {
      // Uncontrolled: start from herd entry date (matches iOS spec Section 2.3)
      accrualStart = new Date(herd.created_at);
    } else if (
      (herd.breeding_program_type === "ai" || herd.breeding_program_type === "controlled") &&
      herd.joining_period_start &&
      herd.joining_period_end
    ) {
      const pStart = parseLocal(herd.joining_period_start).getTime();
      const pEnd = parseLocal(herd.joining_period_end).getTime();
      accrualStart = new Date((pStart + pEnd) / 2);
    } else {
      // Fallback: use joinedDate if period dates not available
      accrualStart = parseLocal(herd.joined_date);
    }
    const calvingDays = daysBetween(accrualStart, now);
    // calving_rate may be stored as decimal (0.85) or integer percent (85)
    const calvingRate =
      (herd.calving_rate ?? 0.85) > 1
        ? (herd.calving_rate ?? 85) / 100
        : (herd.calving_rate ?? 0.85);
    const calfBirthWeightFactor = herd.species === "Sheep" ? 0.08 : 0.07;
    const calfBirthWeight = (herd.initial_weight ?? herd.current_weight ?? 0) * calfBirthWeightFactor;
    preBirthAccrual = calculatePreBirthAccrual(
      head,
      calvingRate,
      calvingDays,
      calfBirthWeight,
      adjustedPrice
    );
  }

  // 6. Calves at Foot Value per spec Section 3 (breeders only)
  let calvesAtFootValue = 0;
  const calvesData = parseCalvesAtFoot(herd.additional_info);
  if (calvesData) {
    const weightRecordDate = herd.calf_weight_recorded_date
      ? parseLocal(herd.calf_weight_recorded_date)
      : new Date(herd.updated_at);
    calvesAtFootValue = calculateCalfAtFootValue(
      calvesData,
      weightRecordDate,
      herd.species,
      adjustedPrice,
      now
    );
  }

  // Combined breeding accrual (pre-birth + calves at foot)
  const breedingAccrual = preBirthAccrual + calvesAtFootValue;

  const weightGainAccrual = physicalValue - baseMarketValue;
  const grossValue = physicalValue + breedingAccrual;
  const netValue = physicalValue - mortalityDeduction + breedingAccrual;
  const initWeight = herd.initial_weight ?? herd.current_weight ?? 0;

  return {
    netValue,
    priceSource,
    pricePerKg: adjustedPrice,
    breedPremiumApplied: rawPremiumPct,
    projectedWeight,
    basePrice: basePrice ?? 0,
    physicalValue,
    baseMarketValue,
    weightGainAccrual,
    breedingAccrual,
    preBirthAccrual,
    calvesAtFootValue,
    grossValue,
    mortalityDeduction,
    daysHeld,
    mortalityRate,
    matchedWeightRange,
    mlaCategory,
    valuationDate: now.toISOString(),
    initialWeight: initWeight,
    dataDate: resolved?.dataDate ?? null,
    nearestSaleyardUsed,
  };
}

/**
 * Convenience wrapper - returns just the net value (backward compatible).
 */
export function calculateHerdValue(
  herd: HerdForValuation,
  nationalPriceMap: Map<string, CategoryPriceEntry[]>,
  premiumMap: Map<string, number>,
  asOf: Date = new Date(),
  saleyardPriceMap?: Map<string, CategoryPriceEntry[]>,
  saleyardBreedPriceMap?: Map<string, CategoryPriceEntry[]>
): number {
  return calculateHerdValuation(herd, nationalPriceMap, premiumMap, asOf, saleyardPriceMap, saleyardBreedPriceMap).netValue;
}

// Re-export for convenience
export { resolveMLACategory };
