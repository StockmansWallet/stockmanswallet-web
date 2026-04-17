// Kill Score engine - GCR, Grid Risk, Kill Score, and compliance metrics
// Ported from iOS GridIQEngine+KillScore.swift
// Pure functions for post-sale scorecard calculation

// MARK: - Types

export type AnalysisMode = "pre_sale" | "post_sale";

export interface KillScoreResult {
  killScore: number;
  gcr: number;
  gridRisk: number;
  gridComplianceScore: number;
  fatComplianceScore: number;
  dentitionComplianceScore: number;
}

export type KillScoreLabel = "Excellent" | "Good" | "Fair" | "Poor";

// Grid entry with weight band prices (matches grid-iq types)
export interface GridEntry {
  gradeCode: string;
  category: string;
  fatRange: string | null;
  dentitionRange: string | null;
  shapeRange: string | null;
  gender: string | null;
  weightBandPrices: WeightBandPrice[];
}

export interface WeightBandPrice {
  weightBandKg: number;
  weightBandLabel: string;
  pricePerKg: number;
}

// Kill sheet line item (matches kill sheet types)
export interface KillSheetLineItem {
  bodyNumber: number;
  category: string;
  // Derived/stamped at save time. Used to filter kill sheet rows to the
  // consignment's sex before feeding into analysis. Optional for legacy rows
  // without it; fall back to deriving from `category`.
  sex?: "Male" | "Female" | "Unknown";
  dentition: number;
  p8Fat: number;
  leftSideWeight: number;
  leftGrade: string;
  leftPricePerKg: number;
  rightSideWeight: number;
  rightGrade: string;
  rightPricePerKg: number;
  totalBodyWeight: number;
  grossValue: number;
  comments: string | null;
}

// Minimal kill sheet for scoring
export interface KillSheetForScoring {
  totalHeadCount: number;
  totalGrossValue: number;
  lineItems: KillSheetLineItem[];
}

// Minimal grid for scoring
export interface GridForScoring {
  entries: GridEntry[];
}

// MARK: - Kill Score Label

export function killScoreLabelFromScore(score: number): KillScoreLabel {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

export function killScoreLabelIcon(label: KillScoreLabel): string {
  switch (label) {
    case "Excellent":
      return "star";
    case "Good":
      return "check-circle";
    case "Fair":
      return "minus-circle";
    case "Poor":
      return "alert-circle";
  }
}

// MARK: - Gender-Aware Entry Filtering

/**
 * Filter grid entries by herd sex. Returns gender-matched + unisex entries,
 * or all entries if no gendered entries exist (backward compatible).
 * sex should be "Male" or "Female" (HerdGroup.sex format).
 */
export function genderedEntries(
  entries: GridEntry[],
  sex: string | null | undefined
): GridEntry[] {
  if (!sex) return entries;

  const hasGendered = entries.some((e) => e.gender !== null);
  if (!hasGendered) return entries;

  const genderTag = sex.toLowerCase() === "female" ? "female" : "male";
  const matched = entries.filter((e) => e.gender === genderTag);
  const unisex = entries.filter((e) => e.gender === null);

  // Prefer gendered entries + unisex fallback. If no gendered match, return all.
  if (matched.length > 0) {
    return [...matched, ...unisex];
  }
  return entries;
}

// MARK: - Weight Band Price Lookup

/**
 * Find the price for a given body weight from a list of weight band prices.
 * Matches the highest weight band the animal qualifies for.
 */
function priceForBodyWeight(
  weightBandPrices: WeightBandPrice[],
  bodyWeightKg: number
): number | null {
  const sorted = [...weightBandPrices].sort(
    (a, b) => a.weightBandKg - b.weightBandKg
  );
  let matchedPrice: number | null = null;
  for (const band of sorted) {
    if (bodyWeightKg >= band.weightBandKg) {
      matchedPrice = band.pricePerKg;
    }
  }
  return matchedPrice;
}

// MARK: - GCR (Grid Capture Ratio)

/**
 * GCR = Actual revenue / Maximum possible grid revenue.
 * sex parameter filters to gender-appropriate entries when gendered grids are used.
 * Returns 0-100 scale score.
 */
export function calculateGCR(
  killSheet: KillSheetForScoring,
  grid: GridForScoring,
  sex?: string | null
): number {
  if (
    killSheet.lineItems.length === 0 ||
    killSheet.totalGrossValue <= 0
  ) {
    return 0;
  }

  // Find the maximum possible revenue from gender-appropriate grid entries
  const filtered = genderedEntries(grid.entries, sex);
  let maxPossibleRevenue = 0;

  for (const item of killSheet.lineItems) {
    const bodyWeight = item.totalBodyWeight;

    // Find the best price available for this body weight across filtered entries
    let bestPriceForWeight = 0;
    for (const entry of filtered) {
      const price = priceForBodyWeight(entry.weightBandPrices, bodyWeight);
      if (price !== null && price > bestPriceForWeight) {
        bestPriceForWeight = price;
      }
    }

    maxPossibleRevenue += bestPriceForWeight * bodyWeight;
  }

  if (maxPossibleRevenue <= 0) return 0;

  const ratio = killSheet.totalGrossValue / maxPossibleRevenue;
  return Math.min(100, Math.max(0, ratio * 100));
}

// MARK: - Grid Risk

/**
 * Grid Risk = 100 - GCR. Higher = more revenue left on the table.
 */
export function calculateGridRisk(gcr: number): number {
  return Math.max(0, 100 - gcr);
}

// MARK: - Grid Compliance

/**
 * Percentage of animals that achieved a grade listed on the grid.
 * sex parameter filters to gender-appropriate entries when gendered grids are used.
 */
export function calculateGridCompliance(
  killSheet: KillSheetForScoring,
  grid: GridForScoring,
  sex?: string | null
): number {
  if (killSheet.lineItems.length === 0) return 0;

  const filtered = genderedEntries(grid.entries, sex);
  const gridGradeCodes = new Set(filtered.map((e) => e.gradeCode));
  let compliantCount = 0;

  for (const item of killSheet.lineItems) {
    const leftOnGrid = gridGradeCodes.has(item.leftGrade);
    const rightOnGrid = gridGradeCodes.has(item.rightGrade);
    if (leftOnGrid || rightOnGrid) {
      compliantCount++;
    }
  }

  const pct = (compliantCount / killSheet.lineItems.length) * 100;
  return Math.min(100, pct);
}

// MARK: - Fat Compliance

/**
 * Percentage of animals with P8 fat within the grid's specified fat range.
 * sex parameter filters to gender-appropriate entries when gendered grids are used.
 */
export function calculateFatCompliance(
  killSheet: KillSheetForScoring,
  grid: GridForScoring,
  sex?: string | null
): number {
  if (killSheet.lineItems.length === 0) return 0;

  const fatBounds = parseFatBounds(grid, sex);
  const minFat = fatBounds.min ?? 5;
  const maxFat = fatBounds.max ?? 22;

  let compliantCount = 0;
  for (const item of killSheet.lineItems) {
    if (item.p8Fat >= minFat && item.p8Fat <= maxFat) {
      compliantCount++;
    }
  }

  const pct = (compliantCount / killSheet.lineItems.length) * 100;
  return Math.min(100, pct);
}

/**
 * Parse min/max fat bounds from gender-appropriate grid entry fatRange fields.
 */
function parseFatBounds(
  grid: GridForScoring,
  sex?: string | null
): {
  min: number | null;
  max: number | null;
} {
  const filtered = genderedEntries(grid.entries, sex);
  const allMins: number[] = [];
  const allMaxes: number[] = [];

  for (const entry of filtered) {
    const range = entry.fatRange?.trim();
    if (!range) continue;

    // Parse ranges like "5-22", "5 - 22", "5 to 22"
    const parts = range
      .split(/[-\s]+/)
      .map((s) => s.trim())
      .map(Number)
      .filter((n) => !isNaN(n));

    if (parts.length >= 2) {
      allMins.push(parts[0]);
      allMaxes.push(parts[1]);
    } else if (parts.length === 1) {
      allMins.push(parts[0]);
    }
  }

  return {
    min: allMins.length > 0 ? Math.min(...allMins) : null,
    max: allMaxes.length > 0 ? Math.max(...allMaxes) : null,
  };
}

// MARK: - Dentition Compliance

/**
 * Percentage of animals with dentition within the grid's specified range.
 * sex parameter filters to gender-appropriate entries when gendered grids are used.
 */
export function calculateDentitionCompliance(
  killSheet: KillSheetForScoring,
  grid: GridForScoring,
  sex?: string | null
): number {
  if (killSheet.lineItems.length === 0) return 0;

  const dentBounds = parseDentitionBounds(grid, sex);

  // No dentition range on grid - count all as compliant
  if (dentBounds.min === null || dentBounds.max === null) return 100;

  let compliantCount = 0;
  for (const item of killSheet.lineItems) {
    if (item.dentition >= dentBounds.min && item.dentition <= dentBounds.max) {
      compliantCount++;
    }
  }

  const pct = (compliantCount / killSheet.lineItems.length) * 100;
  return Math.min(100, pct);
}

/**
 * Parse min/max dentition bounds from gender-appropriate grid entry dentitionRange fields.
 */
function parseDentitionBounds(
  grid: GridForScoring,
  sex?: string | null
): {
  min: number | null;
  max: number | null;
} {
  const filtered = genderedEntries(grid.entries, sex);
  const allMins: number[] = [];
  const allMaxes: number[] = [];

  for (const entry of filtered) {
    const range = entry.dentitionRange?.trim();
    if (!range) continue;

    const parts = range
      .split(/[-\s]+/)
      .map((s) => s.trim())
      .map(Number)
      .filter((n) => !isNaN(n));

    if (parts.length >= 2) {
      allMins.push(parts[0]);
      allMaxes.push(parts[1]);
    } else if (parts.length === 1) {
      allMins.push(parts[0]);
    }
  }

  return {
    min: allMins.length > 0 ? Math.min(...allMins) : null,
    max: allMaxes.length > 0 ? Math.max(...allMaxes) : null,
  };
}

// MARK: - Kill Score (Composite)

/**
 * Calculate composite Kill Score (0-100) from individual metrics.
 * Weights: GCR 40%, Grid Compliance 20%, RF 20%, Fat Compliance 10%, Dentition Compliance 10%
 */
export function calculateKillScore(
  gcr: number,
  gridCompliance: number,
  realisationFactor: number,
  fatCompliance: number,
  dentitionCompliance: number
): number {
  // Normalise RF to 0-100 scale. Perfect RF = 1.0 = 100
  const rfScore = Math.min(100, Math.max(0, realisationFactor * 100));

  const weighted =
    gcr * 0.4 +
    gridCompliance * 0.2 +
    rfScore * 0.2 +
    fatCompliance * 0.1 +
    dentitionCompliance * 0.1;

  return Math.min(100, Math.max(0, weighted));
}

// MARK: - Full Kill Score Calculation

/**
 * Calculate all post-sale metrics in one pass and return a KillScoreResult.
 * sex parameter filters to gender-appropriate entries when gendered grids are used.
 */
export function calculateFullKillScore(
  killSheet: KillSheetForScoring,
  grid: GridForScoring,
  realisationFactor: number,
  sex?: string | null
): KillScoreResult {
  const gcr = calculateGCR(killSheet, grid, sex);
  const gridRisk = calculateGridRisk(gcr);
  const gridComplianceScore = calculateGridCompliance(killSheet, grid, sex);
  const fatComplianceScore = calculateFatCompliance(killSheet, grid, sex);
  const dentitionComplianceScore = calculateDentitionCompliance(killSheet, grid, sex);

  const killScore = calculateKillScore(
    gcr,
    gridComplianceScore,
    realisationFactor,
    fatComplianceScore,
    dentitionComplianceScore
  );

  return {
    killScore,
    gcr,
    gridRisk,
    gridComplianceScore,
    fatComplianceScore,
    dentitionComplianceScore,
  };
}

// MARK: - Analysis Mode Helpers

export function analysisModeLabel(mode: AnalysisMode): string {
  switch (mode) {
    case "pre_sale":
      return "Planning a Sale";
    case "post_sale":
      return "Reviewing a Kill";
  }
}
