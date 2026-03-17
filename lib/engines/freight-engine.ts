// Core freight calculation engine
// Ported from iOS FreightEngine.swift
// Pure functions — no classes or singletons

import type { FreightCapacityCategory, FreightEstimate, BindingConstraint, CapacitySource } from "../types/models";
import { freightCategoryLibrary, findFreightCategory, headsPerDeckForWeight } from "../data/freight-categories";

// Default freight rate per deck per km
export const DEFAULT_RATE_PER_DECK_PER_KM = 3.00;

// MARK: - Category Mapping Result

interface CategoryMapping {
  category: FreightCapacityCategory;
  warning?: string;
  breederNotice?: string;
}

// MARK: - Core Calculation

export function calculateFreightEstimate(options: {
  herdGroupId?: string;
  appCategory: string;
  sex: string;
  averageWeightKg: number;
  headCount: number;
  distanceKm: number;
  ratePerDeckPerKm?: number;
  categoryOverride?: FreightCapacityCategory;
  headsPerDeckOverride?: number;
  isCustomJob?: boolean;
}): FreightEstimate {
  const {
    herdGroupId,
    appCategory,
    sex,
    averageWeightKg,
    headCount,
    distanceKm,
    ratePerDeckPerKm = DEFAULT_RATE_PER_DECK_PER_KM,
    categoryOverride,
    headsPerDeckOverride,
    isCustomJob = false,
  } = options;

  // Resolve the freight category (or use override)
  let resolvedCategory: FreightCapacityCategory;
  let capacitySource: CapacitySource;
  let categoryWarning: string | undefined;
  let breederAutoDetectNotice: string | undefined;

  if (categoryOverride) {
    resolvedCategory = categoryOverride;
    capacitySource = "user_override";
  } else {
    const mapping = resolveFreightCategory(appCategory, sex, averageWeightKg);
    resolvedCategory = mapping.category;
    capacitySource = "library";
    categoryWarning = mapping.warning;
    breederAutoDetectNotice = mapping.breederNotice;
  }

  // Calculate deck requirements — priority: user override > cow-calf fixed > weight-band lookup
  let headsPerDeck: number;
  if (headsPerDeckOverride !== undefined) {
    headsPerDeck = headsPerDeckOverride;
  } else if (resolvedCategory.id === "cow_calf_units") {
    headsPerDeck = resolvedCategory.headsPerDeck;
  } else {
    headsPerDeck = headsPerDeckForWeight(averageWeightKg);
  }

  const decksRequired = Math.max(1, Math.ceil(headCount / headsPerDeck));
  const hasPartialDeck = headCount % headsPerDeck !== 0;
  const spareSpotsOnLastDeck = hasPartialDeck ? (decksRequired * headsPerDeck) - headCount : 0;

  // Build efficiency prompt for partial decks
  let efficiencyPrompt: string | undefined;
  if (hasPartialDeck && spareSpotsOnLastDeck > 0) {
    efficiencyPrompt = `${spareSpotsOnLastDeck} spare spot${spareSpotsOnLastDeck === 1 ? "" : "s"} on the last deck. Consider adding ${spareSpotsOnLastDeck} more head to maximise freight efficiency.`;
  }

  // Calculate costs
  const totalCost = decksRequired * distanceKm * ratePerDeckPerKm;
  const costPerHead = headCount > 0 ? totalCost / headCount : 0;
  const costPerDeck = decksRequired > 0 ? totalCost / decksRequired : 0;
  const costPerKm = distanceKm > 0 ? totalCost / distanceKm : 0;

  return {
    herdGroupId,
    freightCategory: resolvedCategory,
    headCount,
    averageWeightKg,
    headsPerDeck,
    decksRequired,
    hasPartialDeck,
    spareSpotsOnLastDeck,
    bindingConstraint: "head_limit" as BindingConstraint,
    capacitySource,
    distanceKm,
    ratePerDeckPerKm,
    totalCost,
    costPerHead,
    costPerDeck,
    costPerKm,
    categoryWarning,
    breederAutoDetectNotice,
    efficiencyPrompt,
    userOverrideCategory: categoryOverride,
    isCustomJob,
  };
}

// MARK: - Category Resolution

export function resolveFreightCategory(
  appCategory: string,
  sex: string,
  weightKg: number
): CategoryMapping {
  // Debug: Uses master category (Steer, Heifer, Breeder, Dry Cow, Bull) + weight
  // to determine the correct freight tier. Weight drives escalation between tiers.
  switch (appCategory) {
    // Steers - weight determines weaner/yearling/grown/heavy freight tier
    case "Steer":
      if (weightKg < 320) return mapWithEscalation("weaner_steers", weightKg, 320, "yearling_steers", appCategory);
      if (weightKg < 475) return mapWithEscalation("yearling_steers", weightKg, 475, "grown_steers", appCategory);
      if (weightKg < 600) return mapWithEscalation("grown_steers", weightKg, 600, "heavy_grown_steers", appCategory);
      return { category: findFreightCategory("heavy_grown_steers")! };

    // Heifers - weight determines weaner/yearling/grown freight tier
    case "Heifer":
      if (weightKg < 310) return mapWithEscalation("weaner_heifers", weightKg, 310, "yearling_heifers", appCategory);
      if (weightKg < 450) return mapWithEscalation("yearling_heifers", weightKg, 450, "grown_heifers", appCategory);
      return { category: findFreightCategory("grown_heifers")! };

    // Breeder - cow & calf density assumed (calves at foot)
    case "Breeder": {
      const cowCalf = findFreightCategory("cow_calf_units")!;
      const notice = `Breeder loaded at Cow & Calf density (${cowCalf.headsPerDeck} head/deck) as calves at foot are assumed. Override to Cows if calves have not dropped yet.`;
      return { category: cowCalf, breederNotice: notice };
    }

    // Dry Cow - standard cow density
    case "Dry Cow":
      return { category: findFreightCategory("cows")! };

    // Bulls - weight determines weaner/yearling/grown freight tier
    case "Bull":
      if (weightKg < 320) return mapWithEscalation("weaner_steers", weightKg, 320, "yearling_steers", appCategory);
      if (weightKg < 600) return mapWithEscalation("yearling_bulls", weightKg, 600, "grown_bulls", appCategory);
      return { category: findFreightCategory("grown_bulls")! };

    // Fallback - sex-based weight matching (legacy categories or unknown)
    default:
      return fallbackWeightMatch(sex, weightKg);
  }
}

// MARK: - Helpers

function mapWithEscalation(
  defaultId: string,
  weightKg: number,
  escalationThreshold: number,
  escalationId: string,
  appCategory: string
): CategoryMapping {
  const defaultCategory = findFreightCategory(defaultId)!;

  if (weightKg > escalationThreshold) {
    const escalated = findFreightCategory(escalationId)!;
    const weightHpd = headsPerDeckForWeight(weightKg);
    const warning = `Your ${appCategory} at ${Math.round(weightKg)}kg are above the ${defaultCategory.displayName} weight class. Loading as ${escalated.displayName} (${weightHpd} head/deck).`;
    return { category: escalated, warning };
  }

  return { category: defaultCategory };
}

function fallbackWeightMatch(sex: string, weightKg: number): CategoryMapping {
  const isMale = sex.toLowerCase() === "male";

  if (isMale) {
    if (weightKg <= 320) return { category: findFreightCategory("weaner_steers")! };
    if (weightKg <= 475) return { category: findFreightCategory("yearling_steers")! };
    if (weightKg <= 600) return { category: findFreightCategory("grown_steers")! };
    return { category: findFreightCategory("heavy_grown_steers")! };
  } else {
    if (weightKg <= 310) return { category: findFreightCategory("weaner_heifers")! };
    if (weightKg <= 450) return { category: findFreightCategory("yearling_heifers")! };
    return { category: findFreightCategory("grown_heifers")! };
  }
}
