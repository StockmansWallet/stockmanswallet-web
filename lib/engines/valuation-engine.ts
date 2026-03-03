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

// Re-export for convenience
export { mapCategoryToMLACategory };
