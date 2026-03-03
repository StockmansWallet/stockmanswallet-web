// Freight transport capacity library — 11 categories with weight-based loading rates
// Ported from iOS FreightCapacityCategory.swift

import type { FreightCapacityCategory } from "../types/models";

// All 11 transport categories — source of truth for deck calculations
export const freightCategoryLibrary: FreightCapacityCategory[] = [
  // Male — Steers
  {
    id: "weaner_steers",
    displayName: "Weaner Steers",
    avgWeightKg: 250,
    sqmPerHead: 0.65,
    headsPerDeck: 40,
    weightFloorKg: 0,
    weightCeilingKg: 320,
    sexFilter: "male",
  },
  {
    id: "yearling_steers",
    displayName: "Yearling Steers",
    avgWeightKg: 400,
    sqmPerHead: 0.88,
    headsPerDeck: 28,
    weightFloorKg: 320,
    weightCeilingKg: 475,
    sexFilter: "male",
  },
  {
    id: "grown_steers",
    displayName: "Grown Steers",
    avgWeightKg: 550,
    sqmPerHead: 1.15,
    headsPerDeck: 22,
    weightFloorKg: 475,
    weightCeilingKg: 600,
    sexFilter: "male",
  },
  {
    id: "heavy_grown_steers",
    displayName: "Heavy Grown Steers",
    avgWeightKg: 650,
    sqmPerHead: 1.36,
    headsPerDeck: 18,
    weightFloorKg: 600,
    weightCeilingKg: Infinity,
    sexFilter: "male",
  },

  // Male — Bulls
  {
    id: "yearling_bulls",
    displayName: "Yearling Bulls",
    avgWeightKg: 500,
    sqmPerHead: 1.25,
    headsPerDeck: 24,
    weightFloorKg: 0,
    weightCeilingKg: 600,
    sexFilter: "male",
  },
  {
    id: "grown_bulls",
    displayName: "Grown Bulls",
    avgWeightKg: 800,
    sqmPerHead: 1.67,
    headsPerDeck: 18,
    weightFloorKg: 600,
    weightCeilingKg: Infinity,
    sexFilter: "male",
  },

  // Female — Heifers
  {
    id: "weaner_heifers",
    displayName: "Weaner Heifers",
    avgWeightKg: 240,
    sqmPerHead: 0.65,
    headsPerDeck: 40,
    weightFloorKg: 0,
    weightCeilingKg: 310,
    sexFilter: "female",
  },
  {
    id: "yearling_heifers",
    displayName: "Yearling Heifers",
    avgWeightKg: 380,
    sqmPerHead: 1.0,
    headsPerDeck: 32,
    weightFloorKg: 310,
    weightCeilingKg: 450,
    sexFilter: "female",
  },
  {
    id: "grown_heifers",
    displayName: "Grown Heifers",
    avgWeightKg: 520,
    sqmPerHead: 1.25,
    headsPerDeck: 24,
    weightFloorKg: 450,
    weightCeilingKg: Infinity,
    sexFilter: "female",
  },

  // Female — Cows
  {
    id: "cows",
    displayName: "Cows",
    avgWeightKg: 600,
    sqmPerHead: 1.25,
    headsPerDeck: 20,
    weightFloorKg: 0,
    weightCeilingKg: Infinity,
    sexFilter: "female",
  },
  {
    id: "cow_calf_units",
    displayName: "Cow & Calf Units",
    avgWeightKg: 700,
    sqmPerHead: 1.67,
    headsPerDeck: 18,
    weightFloorKg: 0,
    weightCeilingKg: Infinity,
    sexFilter: "female",
  },
];

// Quick lookup by ID
export function findFreightCategory(id: string): FreightCapacityCategory | undefined {
  return freightCategoryLibrary.find((c) => c.id === id);
}

// MARK: - Weight-Based Heads Per Deck

const weightBands: { maxWeight: number; headsPerDeck: number }[] = [
  { maxWeight: 300, headsPerDeck: 40 },
  { maxWeight: 350, headsPerDeck: 36 },
  { maxWeight: 400, headsPerDeck: 32 },
  { maxWeight: 450, headsPerDeck: 28 },
  { maxWeight: 500, headsPerDeck: 26 },
  { maxWeight: 550, headsPerDeck: 24 },
  { maxWeight: 600, headsPerDeck: 22 },
  { maxWeight: 650, headsPerDeck: 20 },
];

// Primary heads-per-deck resolver — uses weight bands instead of category-fixed values
export function headsPerDeckForWeight(weightKg: number): number {
  for (const band of weightBands) {
    if (weightKg < band.maxWeight) {
      return band.headsPerDeck;
    }
  }
  // 650+ kg falls through to heaviest tier
  return 18;
}
