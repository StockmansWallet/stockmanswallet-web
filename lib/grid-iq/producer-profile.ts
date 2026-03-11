// Producer performance profile - aggregates historical kill data into a cumulative profile.
// Port of iOS ProducerProfileService.swift.
// Used by analysis engine for personalisation and by commentary service for historical context.

import { createClient } from "@/lib/supabase/server";

// Confidence tiers based on kill sheet count
export type ConfidenceTier = "baseline" | "provisional" | "personalised" | "expert";

export interface GradeFrequency {
  gradeCode: string;
  bodyCount: number;
  percentage: number;
}

export interface ProducerProfile {
  killSheetCount: number;
  totalHeadProcessed: number;
  averageDressingPct: number | null;
  averageRF: number | null;
  latestRF: number | null;
  averageGCR: number | null;
  averageKillScore: number | null;
  topGrades: GradeFrequency[];
  averageP8Fat: number | null;
  averageDentition: number | null;
  averageBodyWeight: number | null;
  confidenceTier: ConfidenceTier;
  computedAt: string;
}

/**
 * Compute the producer performance profile from all historical kill sheets and analyses.
 * Returns null if the user has no data.
 */
export async function computeProducerProfile(userId: string): Promise<ProducerProfile> {
  const supabase = await createClient();

  // Fetch all kill sheets (sorted newest first)
  const { data: killSheets } = await supabase
    .from("kill_sheet_records")
    .select("id, total_head_count, total_body_weight, total_gross_value, realisation_factor, line_items, grade_distribution, kill_date")
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .order("kill_date", { ascending: false });

  // Fetch all post-sale analyses
  const { data: analyses } = await supabase
    .from("grid_iq_analyses")
    .select("id, head_count, gcr, kill_score, analysis_mode")
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .eq("analysis_mode", "post_sale");

  const kills = killSheets ?? [];
  const postSaleAnalyses = analyses ?? [];

  const killSheetCount = kills.length;
  const totalHeadProcessed = kills.reduce(
    (sum, ks) => sum + ((ks.total_head_count as number) ?? 0),
    0,
  );

  // Confidence tier
  const confidenceTier = getConfidenceTier(killSheetCount);

  // Weighted average realisation factor
  const averageRF = weightedAverageRF(kills);
  const latestRF = kills.length > 0 ? (kills[0].realisation_factor as number | null) : null;

  // Post-sale metrics (GCR, Kill Score) - head-weighted averages
  const averageGCR = headWeightedAverage(
    postSaleAnalyses.map((a) => a.gcr as number | null),
    postSaleAnalyses.map((a) => (a.head_count as number) ?? 0),
  );
  const averageKillScore = headWeightedAverage(
    postSaleAnalyses.map((a) => a.kill_score as number | null),
    postSaleAnalyses.map((a) => (a.head_count as number) ?? 0),
  );

  // Top grades from grade distribution
  const topGrades = computeTopGrades(kills);

  // Line item aggregates
  const { avgP8Fat, avgDentition, avgBodyWeight } = computeLineItemAverages(kills);

  return {
    killSheetCount,
    totalHeadProcessed,
    averageDressingPct: null, // Cannot calculate without live weights
    averageRF,
    latestRF,
    averageGCR,
    averageKillScore,
    topGrades,
    averageP8Fat: avgP8Fat,
    averageDentition: avgDentition,
    averageBodyWeight: avgBodyWeight,
    confidenceTier,
    computedAt: new Date().toISOString(),
  };
}

function getConfidenceTier(killSheetCount: number): ConfidenceTier {
  if (killSheetCount >= 10) return "expert";
  if (killSheetCount >= 3) return "personalised";
  if (killSheetCount >= 1) return "provisional";
  return "baseline";
}

function getConfidenceLabel(tier: ConfidenceTier): string {
  switch (tier) {
    case "expert":
      return "Expert - Strong historical data. Predictions are highly tuned to your operation.";
    case "personalised":
      return "Personalised - Based on your kill history. Predictions are tailored to your operation.";
    case "provisional":
      return "Provisional - Based on limited kill history. More data will improve accuracy.";
    case "baseline":
      return "Industry Baseline - Using industry defaults. Upload kill sheets to personalise.";
  }
}

// Weighted average RF: multiply each RF by head count, sum, divide by total heads
function weightedAverageRF(
  kills: Record<string, unknown>[],
): number | null {
  let totalWeighted = 0;
  let totalHeads = 0;

  for (const ks of kills) {
    const rf = ks.realisation_factor as number | null;
    const heads = (ks.total_head_count as number) ?? 0;
    if (rf != null && rf > 0 && heads > 0) {
      totalWeighted += rf * heads;
      totalHeads += heads;
    }
  }

  return totalHeads > 0 ? totalWeighted / totalHeads : null;
}

// Generic head-weighted average (for GCR, Kill Score)
function headWeightedAverage(
  values: (number | null)[],
  weights: number[],
): number | null {
  if (values.length !== weights.length || values.length === 0) return null;

  let totalWeighted = 0;
  let totalWeight = 0;

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const weight = weights[i];
    if (val != null && weight > 0) {
      totalWeighted += val * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? totalWeighted / totalWeight : null;
}

// Compute top grades from grade_distribution across all kill sheets
function computeTopGrades(
  kills: Record<string, unknown>[],
  limit = 5,
): GradeFrequency[] {
  const gradeMap = new Map<string, number>();
  let totalBodies = 0;

  for (const ks of kills) {
    const distribution = ks.grade_distribution as Record<string, unknown>[] | null;
    if (!distribution) continue;
    for (const entry of distribution) {
      const code = (entry.grade_code ?? entry.gradeCode) as string;
      const count = (entry.body_count ?? entry.bodyCount) as number ?? 0;
      if (code && count > 0) {
        gradeMap.set(code, (gradeMap.get(code) ?? 0) + count);
        totalBodies += count;
      }
    }
  }

  const grades: GradeFrequency[] = [];
  for (const [gradeCode, bodyCount] of gradeMap) {
    grades.push({
      gradeCode,
      bodyCount,
      percentage: totalBodies > 0 ? (bodyCount / totalBodies) * 100 : 0,
    });
  }

  // Sort by body count descending, take top N
  grades.sort((a, b) => b.bodyCount - a.bodyCount);
  return grades.slice(0, limit);
}

// Compute average P8 fat, dentition, and body weight from all line items
function computeLineItemAverages(
  kills: Record<string, unknown>[],
): { avgP8Fat: number | null; avgDentition: number | null; avgBodyWeight: number | null } {
  let p8Sum = 0;
  let p8Count = 0;
  let dentSum = 0;
  let dentCount = 0;
  let weightSum = 0;
  let weightCount = 0;

  for (const ks of kills) {
    const items = ks.line_items as Record<string, unknown>[] | null;
    if (!items) continue;

    for (const item of items) {
      const p8 = (item.p8Fat ?? item.p8_fat_mm ?? item.p8_fat) as number | null;
      if (p8 != null && p8 > 0) {
        p8Sum += p8;
        p8Count++;
      }

      const dent = item.dentition as number | null;
      if (dent != null && dent >= 0) {
        dentSum += dent;
        dentCount++;
      }

      const weight = (item.totalBodyWeight ?? item.total_body_weight ?? item.hscw_kg) as number | null;
      if (weight != null && weight > 0) {
        weightSum += weight;
        weightCount++;
      }
    }
  }

  return {
    avgP8Fat: p8Count > 0 ? p8Sum / p8Count : null,
    avgDentition: dentCount > 0 ? dentSum / dentCount : null,
    avgBodyWeight: weightCount > 0 ? weightSum / weightCount : null,
  };
}

// Export for use in commentary service and analysis engine
export { getConfidenceLabel };
