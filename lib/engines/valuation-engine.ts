// Core valuation engine — Adjusted Market Value calculations
// Ported from iOS ValuationEngine.swift + extensions
// Pure functions — pricing/caching will be added when Supabase data layer is wired up

import { mapCategoryToMLACategory } from "../data/reference-data";

// MARK: - Constants

export const BREEDING_ACCRUAL_CYCLE_DAYS = 365;

// MARK: - Valuation Result

export interface HerdValuation {
  herdId: string;
  physicalValue: number;
  baseMarketValue: number;
  weightGainAccrual: number;
  breedingAccrual: number;
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

// MARK: - Weight Range Matching

/**
 * Determines which MLA weight bracket a given weight falls into.
 * MLA weight ranges: "200-280", "280-330", "330-400", "400+", etc.
 * Out-of-range weights clamp to nearest bracket (spec Section 1.3 Rule 3).
 */
export function matchWeightRange(weight: number, availableRanges: string[]): string | null {
  // First pass: exact bracket match
  for (const range of availableRanges) {
    if (range.endsWith("+")) {
      const min = parseFloat(range.slice(0, -1));
      if (!isNaN(min) && weight >= min) return range;
    } else if (range.includes("-")) {
      const parts = range.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        const max = parseFloat(parts[1]);
        if (!isNaN(min) && !isNaN(max) && weight >= min && weight < max) return range;
      }
    }
  }

  // Second pass: clamp to nearest bracket
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
          const distance = weight < min ? min - weight : weight - max;
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
  // Cattle categories
  else if (category.includes("Weaner") && (category.includes("Steer") || category.includes("Bull") || category.includes("Heifer"))) {
    return 3.89;
  } else if (category.includes("Yearling") && (category.includes("Steer") || category.includes("Bull") || category.includes("Heifer"))) {
    return 4.10;
  } else if (
    category.includes("Breeding") ||
    (category.includes("Breeder") && !category.includes("Doe") && !category.includes("Buck")) ||
    category.includes("Heifer") ||
    category.includes("Wet Cow")
  ) {
    return 3.80;
  } else if (category.includes("Cull Cow")) {
    return 3.14;
  } else if (category.includes("Cull Bull")) {
    return 3.14;
  } else if (category.includes("Feeder") && (category.includes("Steer") || category.includes("Heifer"))) {
    return 3.89;
  } else if (category.includes("Grown") && (category.includes("Steer") || category.includes("Bull"))) {
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
}

// Price entry with optional weight range (matches category_prices table structure)
export interface CategoryPriceEntry {
  price_per_kg: number;
  weight_range: string | null;
}

/**
 * Resolves the best price from a list of CategoryPriceEntry for a given projected weight.
 * Tries weight-range match first, then falls back to any-weight entry.
 */
function resolvePriceFromEntries(
  entries: CategoryPriceEntry[],
  projectedWeight: number
): number | null {
  if (entries.length === 0) return null;
  const weightRanges = entries
    .map((e) => e.weight_range)
    .filter((r): r is string => r !== null);
  const matchedRange =
    weightRanges.length > 0 ? matchWeightRange(projectedWeight, weightRanges) : null;
  const matchedEntry = matchedRange
    ? entries.find((e) => e.weight_range === matchedRange)
    : entries.find((e) => e.weight_range === null) ?? entries[0];
  return matchedEntry?.price_per_kg ?? null;
}

// MARK: - Detailed Valuation Result

export type PriceSource = "saleyard" | "national" | "fallback";

export interface HerdValuationResult {
  netValue: number;
  priceSource: PriceSource;
  pricePerKg: number;
  breedPremiumApplied: number;
}

/**
 * Full herd valuation matching iOS ValuationEngine formula exactly.
 * Returns detailed result including price source for UI indicators.
 *
 * Price resolution hierarchy (mirrors iOS):
 *   1. Saleyard general (breed=null) price + breed premium
 *   2. Saleyard breed-specific price (no breed premium - already baked in)
 *   3. National (breed=null) + breed premium
 *   4. Hardcoded category fallback + breed premium
 *
 * The breed premium "double-application guard" mirrors iOS resolveGeneralBasePrice():
 * breed premium is only applied to general (breed=null) base prices. When the only
 * available saleyard price is breed-specific (from MLA transaction data), it already
 * reflects that breed's market value, so applying premium again would double-count.
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
  if (head === 0) return { netValue: 0, priceSource: "fallback", pricePerKg: 0, breedPremiumApplied: 0 };

  const now = asOf;
  const createdAt = herd.created_at ? new Date(herd.created_at) : now;

  // 1. Projected weight (split DWG)
  const projectedWeight = calculateProjectedWeight(
    herd.initial_weight ?? herd.current_weight ?? 0,
    createdAt,
    herd.dwg_change_date ? new Date(herd.dwg_change_date) : null,
    now,
    herd.previous_dwg ?? null,
    herd.daily_weight_gain ?? 0
  );

  // 2. Live price - map app category to MLA category, then resolve via hierarchy
  const mlaCategory = mapCategoryToMLACategory(herd.category);
  let basePrice: number | null = null;
  let priceSource: PriceSource = "fallback";
  let skipBreedPremium = false;

  // 2a. Try saleyard general (breed=null) price first - breed premium safe
  if (saleyardPriceMap && herd.selected_saleyard) {
    const saleyardKey = `${mlaCategory}|${herd.selected_saleyard}`;
    const saleyardEntries = saleyardPriceMap.get(saleyardKey) ?? [];
    basePrice = resolvePriceFromEntries(saleyardEntries, projectedWeight);
    if (basePrice !== null) priceSource = "saleyard";
  }

  // 2b. Try saleyard breed-specific price - skip breed premium (double-application guard)
  if (basePrice === null && saleyardBreedPriceMap && herd.selected_saleyard) {
    const breedKey = `${mlaCategory}|${herd.breed}|${herd.selected_saleyard}`;
    const breedEntries = saleyardBreedPriceMap.get(breedKey) ?? [];
    basePrice = resolvePriceFromEntries(breedEntries, projectedWeight);
    if (basePrice !== null) {
      priceSource = "saleyard";
      skipBreedPremium = true;
    }
  }

  // 2c. Fall back to national price (breed=null, premium safe)
  if (basePrice === null) {
    const nationalEntries = nationalPriceMap.get(mlaCategory) ?? [];
    basePrice = resolvePriceFromEntries(nationalEntries, projectedWeight);
    if (basePrice !== null) priceSource = "national";
  }

  // 2d. Final fallback to hardcoded defaults
  if (basePrice === null) {
    basePrice = defaultFallbackPrice(herd.category);
    priceSource = "fallback";
  }

  // 3. Breed premium - only apply to general (breed=null) prices (mirrors iOS resolveGeneralBasePrice guard)
  const rawPremiumPct = skipBreedPremium ? 0 : (herd.breed_premium_override ?? premiumMap.get(herd.breed) ?? 0);
  const adjustedPrice = basePrice * (1 + rawPremiumPct / 100);

  // 3. Physical value and base market value (for mortality calculation)
  const physicalValue = head * projectedWeight * adjustedPrice;
  const baseMarketValue = head * (herd.initial_weight ?? herd.current_weight ?? 0) * adjustedPrice;

  // 4. Mortality deduction (linear, on initial weight only)
  const daysHeld = daysBetween(createdAt, now);
  const mortalityRate = herd.mortality_rate ?? 0.05;
  const mortalityDeduction = calculateMortalityDeduction(baseMarketValue, mortalityRate, daysHeld);

  // 5. Pre-birth breeding accrual (pregnant breeders with a joining date)
  let breedingAccrual = 0;
  if (herd.is_breeder && herd.is_pregnant && herd.joined_date) {
    let accrualStart: Date;
    if (
      (herd.breeding_program_type === "ai" || herd.breeding_program_type === "controlled") &&
      herd.joining_period_start &&
      herd.joining_period_end
    ) {
      const pStart = new Date(herd.joining_period_start).getTime();
      const pEnd = new Date(herd.joining_period_end).getTime();
      accrualStart = new Date((pStart + pEnd) / 2);
    } else {
      accrualStart = new Date(herd.joined_date);
    }
    const calvingDays = daysBetween(accrualStart, now);
    // calving_rate may be stored as decimal (0.85) or integer percent (85)
    const calvingRate =
      (herd.calving_rate ?? 0.85) > 1
        ? (herd.calving_rate ?? 85) / 100
        : (herd.calving_rate ?? 0.85);
    const calfBirthWeightFactor = herd.species === "Sheep" ? 0.08 : 0.07;
    const calfBirthWeight = (herd.initial_weight ?? herd.current_weight ?? 0) * calfBirthWeightFactor;
    breedingAccrual = calculatePreBirthAccrual(
      head,
      calvingRate,
      calvingDays,
      calfBirthWeight,
      adjustedPrice
    );
  }

  const netValue = physicalValue - mortalityDeduction + breedingAccrual;
  return { netValue, priceSource, pricePerKg: adjustedPrice, breedPremiumApplied: rawPremiumPct };
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
export { mapCategoryToMLACategory };
