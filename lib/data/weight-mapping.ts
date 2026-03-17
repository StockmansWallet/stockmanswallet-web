/**
 * Weight-first MLA category mapping system.
 * Single source of truth for cattle master categories, sub-categories,
 * MLA category resolution, weight validation, and CSV mapping.
 *
 * Source: SW Category Mapping Spec v7.1 (March 2026)
 * Validated against MLA NLRS, AuctionsPlus, NSW DPI, FutureBeef
 */

// MARK: - Types

export type CattleMasterCategory = "Steer" | "Heifer" | "Breeder" | "Dry Cow" | "Bull";
export type BreederSubType = "Cow" | "Heifer";
export type WeightSubCategory = "Weaner" | "Yearling" | "Grown";

export interface MLACategoryResolution {
  masterCategory: CattleMasterCategory;
  subCategory: string;
  primaryMLACategory: string;
  fallbackMLACategory: string | null;
}

export type WeightValidationResult =
  | { status: "ok" }
  | { status: "warning"; message: string }
  | { status: "error"; message: string };

// Matches Supabase category_mapping_rules table
export interface CategoryMappingRule {
  species: string;
  master_category: string;
  weight_min: number | null;
  weight_max: number | null;
  sub_category: string;
  mla_preferred: string | null;
  mla_fallback: string | null;
  lookback_weeks: number;
  sort_order: number;
}

// MARK: - Master Categories

export const cattleMasterCategories: CattleMasterCategory[] = [
  "Steer",
  "Heifer",
  "Breeder",
  "Dry Cow",
  "Bull",
];

// Helper for species -> categories (replaces old categoriesForSpecies)
export function categoriesForSpecies(species: string): string[] {
  switch (species) {
    case "Cattle":
      return [...cattleMasterCategories];
    default:
      return [];
  }
}

// MARK: - Default Mapping Rules (hardcoded fallback)
// Used when Supabase category_mapping_rules table is unavailable.
// Apps should fetch rules from Supabase on launch and cache locally.
// These defaults match the seed data in 20260317100001_category_mapping_rules.sql.

export const defaultMappingRules: CategoryMappingRule[] = [
  // Steer
  { species: "Cattle", master_category: "Steer", weight_min: 0, weight_max: 330, sub_category: "Weaner", mla_preferred: "Weaner Steer", mla_fallback: "Yearling Steer", lookback_weeks: 8, sort_order: 1 },
  { species: "Cattle", master_category: "Steer", weight_min: 330, weight_max: 500, sub_category: "Yearling", mla_preferred: "Yearling Steer", mla_fallback: "Grown Steer", lookback_weeks: 8, sort_order: 2 },
  { species: "Cattle", master_category: "Steer", weight_min: 500, weight_max: null, sub_category: "Grown", mla_preferred: "Grown Steer", mla_fallback: null, lookback_weeks: 8, sort_order: 3 },
  // Heifer
  { species: "Cattle", master_category: "Heifer", weight_min: 0, weight_max: 300, sub_category: "Weaner", mla_preferred: "Heifer", mla_fallback: "Yearling Heifer", lookback_weeks: 8, sort_order: 4 },
  { species: "Cattle", master_category: "Heifer", weight_min: 300, weight_max: 450, sub_category: "Yearling", mla_preferred: "Yearling Heifer", mla_fallback: "Grown Heifer", lookback_weeks: 8, sort_order: 5 },
  { species: "Cattle", master_category: "Heifer", weight_min: 450, weight_max: null, sub_category: "Grown", mla_preferred: "Grown Heifer", mla_fallback: "Grown Heifer", lookback_weeks: 8, sort_order: 6 },
  // Breeder (user-selected sub-type, any weight)
  { species: "Cattle", master_category: "Breeder", weight_min: null, weight_max: null, sub_category: "Cow", mla_preferred: "Cows", mla_fallback: "Cows", lookback_weeks: 8, sort_order: 7 },
  { species: "Cattle", master_category: "Breeder", weight_min: null, weight_max: null, sub_category: "Heifer", mla_preferred: "Cows", mla_fallback: "Cows", lookback_weeks: 8, sort_order: 8 },
  // Dry Cow (any weight)
  { species: "Cattle", master_category: "Dry Cow", weight_min: null, weight_max: null, sub_category: "Cows", mla_preferred: "Cows", mla_fallback: "Cows", lookback_weeks: 8, sort_order: 9 },
  // Bull
  { species: "Cattle", master_category: "Bull", weight_min: 0, weight_max: 330, sub_category: "Weaner", mla_preferred: "Bulls", mla_fallback: "Bulls", lookback_weeks: 8, sort_order: 10 },
  { species: "Cattle", master_category: "Bull", weight_min: 330, weight_max: 550, sub_category: "Yearling", mla_preferred: "Bulls", mla_fallback: "Bulls", lookback_weeks: 8, sort_order: 11 },
  { species: "Cattle", master_category: "Bull", weight_min: 550, weight_max: null, sub_category: "Grown", mla_preferred: "Bulls", mla_fallback: "Bulls", lookback_weeks: 8, sort_order: 12 },
];

// MARK: - Resolve MLA Category

/**
 * Core function - resolves master category + weight to the correct MLA category.
 * Uses cached rules from Supabase if available, falls back to hardcoded defaults.
 */
export function resolveMLACategory(
  masterCategory: string,
  inputWeight: number,
  breederSubType?: string,
  rules?: CategoryMappingRule[]
): MLACategoryResolution {
  const activeRules = rules ?? defaultMappingRules;

  // For Breeder, match on sub-type (Cow/Heifer) rather than weight
  if (masterCategory === "Breeder" && breederSubType) {
    const rule = activeRules.find(
      (r) => r.master_category === masterCategory && r.sub_category === breederSubType
    );
    if (rule) {
      return {
        masterCategory: masterCategory as CattleMasterCategory,
        subCategory: rule.sub_category,
        primaryMLACategory: rule.mla_preferred ?? "Cows",
        fallbackMLACategory: rule.mla_fallback,
      };
    }
  }

  // For Dry Cow, no weight matching needed
  if (masterCategory === "Dry Cow") {
    const rule = activeRules.find((r) => r.master_category === masterCategory);
    if (rule) {
      return {
        masterCategory: "Dry Cow",
        subCategory: rule.sub_category,
        primaryMLACategory: rule.mla_preferred ?? "Cows",
        fallbackMLACategory: rule.mla_fallback,
      };
    }
  }

  // For Steer, Heifer, Bull - match weight against rules
  // weight_min is inclusive, weight_max is exclusive (null = no upper limit)
  const matchingRule = activeRules.find((rule) => {
    if (rule.master_category !== masterCategory) return false;
    const min = rule.weight_min ?? 0;
    if (inputWeight < min) return false;
    if (rule.weight_max !== null && inputWeight >= rule.weight_max) return false;
    return true;
  });

  if (matchingRule) {
    return {
      masterCategory: masterCategory as CattleMasterCategory,
      subCategory: matchingRule.sub_category,
      primaryMLACategory: matchingRule.mla_preferred ?? masterCategory,
      fallbackMLACategory: matchingRule.mla_fallback,
    };
  }

  // Fallback - should not happen with correct rules
  console.warn(`No mapping rule found for ${masterCategory} at ${inputWeight} kg`);
  return {
    masterCategory: masterCategory as CattleMasterCategory,
    subCategory: "Unknown",
    primaryMLACategory: masterCategory,
    fallbackMLACategory: null,
  };
}

// MARK: - Weight Validation

const weightValidationLimits: Record<string, { hardMin: number; hardMax: number }> = {
  Steer: { hardMin: 80, hardMax: 1000 },
  Heifer: { hardMin: 80, hardMax: 750 },
  Breeder: { hardMin: 250, hardMax: 900 },
  "Dry Cow": { hardMin: 250, hardMax: 900 },
  Bull: { hardMin: 100, hardMax: 1200 },
};

export function validateWeight(
  masterCategory: string,
  weight: number
): WeightValidationResult {
  const limits = weightValidationLimits[masterCategory];
  if (!limits) return { status: "ok" };

  if (weight < limits.hardMin) {
    return {
      status: "error",
      message: `Weight ${Math.round(weight)} kg is below the minimum of ${limits.hardMin} kg for ${masterCategory}. Please check.`,
    };
  }

  if (weight > limits.hardMax) {
    return {
      status: "error",
      message: `Weight ${Math.round(weight)} kg exceeds the maximum of ${limits.hardMax} kg for ${masterCategory}. Please check.`,
    };
  }

  // Data-thinness warning for very light steers/heifers
  if ((masterCategory === "Steer" || masterCategory === "Heifer") && weight < 150) {
    return {
      status: "warning",
      message: "MLA saleyard data may be limited below 150 kg.",
    };
  }

  return { status: "ok" };
}

// MARK: - MLA CSV Category Mapping

export const mlaCsvCategoryMapping: Record<string, string> = {
  "Yearling Steer": "Yearling Steer",
  "Yearling Heifer": "Yearling Heifer",
  "Vealer Steer": "Weaner Steer",
  "Vealer Heifer": "Heifer",
  "Grown Steer": "Grown Steer",
  "Grown Heifer": "Grown Heifer",
  Cows: "Cows",
  Bulls: "Bulls",
  "Manufacturing Steer": "Grown Steer",
  Calves: "Weaner Steer",
};

export function resolveMLACsvCategory(csvCategory: string): string {
  return mlaCsvCategoryMapping[csvCategory] ?? csvCategory;
}

// MARK: - Legacy Category Migration

/**
 * Maps old 16-category values to new master categories.
 * Used during data migration of existing herd records.
 */
export function migrateLegacyCategory(
  oldCategory: string
): { masterCategory: string; breederSubType: string | null } {
  switch (oldCategory) {
    case "Weaner Steer":
    case "Yearling Steer":
    case "Feeder Steer":
    case "Grown Steer":
      return { masterCategory: "Steer", breederSubType: null };
    case "Weaner Heifer":
    case "Yearling Heifer":
    case "Feeder Heifer":
    case "Grown Heifer (Un-Joined)":
      return { masterCategory: "Heifer", breederSubType: null };
    case "Breeder Cow":
    case "Wet Cow":
      return { masterCategory: "Breeder", breederSubType: "Cow" };
    case "Breeder Heifer":
      return { masterCategory: "Breeder", breederSubType: "Heifer" };
    case "Cull Cow":
      return { masterCategory: "Dry Cow", breederSubType: null };
    case "Weaner Bull":
    case "Yearling Bull":
    case "Grown Bull":
    case "Cull Bull":
      return { masterCategory: "Bull", breederSubType: null };
    default:
      return { masterCategory: oldCategory, breederSubType: null };
  }
}
