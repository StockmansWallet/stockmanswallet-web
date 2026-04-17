// Grid IQ Analysis Engine - Saleyard vs Over-the-Hooks comparison
// Ported from iOS GridIQEngine.swift + extensions
// Pure functions - no Supabase calls, no side effects

import {
  type AnalysisMode,
  type GridEntry,
  type KillSheetForScoring,
  type KillScoreResult,
  genderedEntries,
  calculateFullKillScore,
} from "./kill-score-engine";
import { deriveSexFromCategory, normaliseHerdSex } from "@/lib/grid-iq/category-sex";

// Re-export AnalysisMode for convenience
export type { AnalysisMode } from "./kill-score-engine";

// MARK: - Types

export type SellWindowStatus = "EARLY" | "ON_TARGET" | "RISK_OF_OVERWEIGHT";
export type ProcessorFitLabel = "Strong Match" | "Good Match" | "Review Needed";

export interface GridIQAnalysisResult {
  herdGroupId: string;
  processorGridId: string;
  killSheetRecordId: string | null;
  herdName: string;
  processorName: string;
  analysisMode: AnalysisMode;
  headCount: number;
  mlaMarketValue: number;
  dressingPercentage: number;
  estimatedCarcaseWeight: number;
  isUsingPersonalisedData: boolean;
  headlineGridValue: number;
  realisationFactor: number;
  realisticGridOutcome: number;
  freightToSaleyard: number;
  freightToProcessor: number;
  netSaleyardValue: number;
  netProcessorValue: number;
  gridIQAdvantage: number;
  sellWindowStatus: SellWindowStatus;
  sellWindowDetail: string;
  daysToTarget: number | null;
  projectedCarcaseWeight: number | null;
  opportunityValue: number | null;
  opportunityDriver: string | null;
  opportunityDetail: string | null;
  processorFitScore: number | null;
  processorFitLabel: ProcessorFitLabel | null;
  gcr: number | null;
  gridRisk: number | null;
  killScore: number | null;
  gridComplianceScore: number | null;
  fatComplianceScore: number | null;
  dentitionComplianceScore: number | null;
}

export interface AnalyseParams {
  herd: {
    id: string;
    name: string;
    sex: string;
    category: string;
    headCount: number;
    dailyWeightGain: number;
  };
  grid: {
    id: string;
    processorName: string;
    entries: GridEntry[];
  };
  killSheet: KillSheetForScoring | null;
  mlaMarketValue: number;
  estimatedCarcaseWeight: number;
  dressingPercentage: number;
  isPersonalisedData: boolean;
  realisationFactor: number;
  freightToSaleyard: number;
  freightToProcessor: number;
  analysisMode: AnalysisMode;
}

// MARK: - Constants

export const BASELINE_REALISATION_FACTOR = 0.92;

// MARK: - Sex-aware kill sheet filter
//
// Kill sheets commonly contain a mix of male (steer/bull) and female
// (heifer/cow) rows. When the consignment under analysis is single-sex we must
// exclude non-matching rows so metrics (GCR, RF, processor fit, payment check)
// reflect only the relevant cattle. `Unknown` herd sex is treated as
// "no filter" to preserve legacy behaviour; `Unknown` line items are kept so
// data with blank categories is not silently dropped.
export function filterKillSheetBySex<T extends KillSheetForScoring & { id?: string }>(
  ks: T,
  herdSex: string | null | undefined
): T {
  const target = normaliseHerdSex(herdSex);
  if (target === "Unknown") return ks;

  const filtered = ks.lineItems.filter((item) => {
    const s = item.sex ?? deriveSexFromCategory(item.category);
    return s === target || s === "Unknown";
  });

  if (filtered.length === ks.lineItems.length) return ks;

  const totalGrossValue = filtered.reduce((sum, i) => sum + (i.grossValue || 0), 0);

  return {
    ...ks,
    lineItems: filtered,
    totalHeadCount: filtered.length,
    totalGrossValue,
  };
}

// MARK: - Dressing Percentage Defaults (MLA industry averages)

export function defaultDressingPercentage(category: string): number {
  const c = category.toLowerCase();
  if (c.includes("yearling") && c.includes("steer")) return 0.54;
  if ((c.includes("grown") || c.includes("steer")) && !c.includes("yearling")) return 0.56;
  if (c.includes("yearling") && c.includes("heifer")) return 0.52;
  if (c.includes("cow")) return 0.50;
  if (c.includes("bull")) return 0.58;
  if (c.includes("weaner")) return 0.50;
  return 0.54;
}

// MARK: - Main Analysis

export function analyse(params: AnalyseParams): GridIQAnalysisResult {
  const { herd, grid, analysisMode } = params;

  // Filter kill sheet rows to the consignment's sex. All downstream
  // kill-sheet-driven steps (grade estimation, opportunity, processor fit,
  // kill score, RF) use the filtered view so mixed-sex kill sheets don't
  // distort single-sex analyses.
  const killSheet = params.killSheet
    ? filterKillSheetBySex(params.killSheet, herd.sex)
    : null;

  // Step 3: Headline grid value
  const headlineGridValue = calculateHeadlineGridValue(
    grid.entries, herd.sex, herd.category, params.estimatedCarcaseWeight,
    herd.headCount, killSheet
  );

  // Step 4: Realistic grid outcome
  const realisticGridOutcome = headlineGridValue * params.realisationFactor;

  // Step 6: Net comparison
  const netSaleyardValue = params.mlaMarketValue - params.freightToSaleyard;
  const netProcessorValue = realisticGridOutcome - params.freightToProcessor;
  const gridIQAdvantage = netProcessorValue - netSaleyardValue;

  // Step 7: Sell window
  const sellWindow = evaluateSellWindow(
    herd.category, herd.sex, herd.dailyWeightGain,
    params.estimatedCarcaseWeight, params.dressingPercentage, grid.entries
  );

  // Steps 8-10: Kill history enrichment (post-sale with kill sheet)
  let opportunityValue: number | null = null;
  let opportunityDriver: string | null = null;
  let opportunityDetail: string | null = null;
  let processorFitScore: number | null = null;
  let processorFitLabel: ProcessorFitLabel | null = null;
  let killScoreResult: KillScoreResult | null = null;

  if (killSheet && killSheet.lineItems.length > 0) {
    // Step 8: Opportunity insight
    const opp = calculateOpportunity(killSheet, grid.entries, herd.sex);
    opportunityValue = opp.value;
    opportunityDriver = opp.driver;
    opportunityDetail = opp.detail;

    // Step 9: Processor fit
    const fit = calculateProcessorFit(killSheet, grid.entries, herd.sex);
    processorFitScore = fit.score;
    processorFitLabel = fit.label;

    // Step 10: Kill Score (post-sale only)
    if (analysisMode === "post_sale") {
      killScoreResult = calculateFullKillScore(
        killSheet, { entries: grid.entries },
        params.realisationFactor, herd.sex
      );
    }
  }

  return {
    herdGroupId: herd.id,
    processorGridId: grid.id,
    killSheetRecordId: killSheet ? (killSheet as { id?: string }).id ?? null : null,
    herdName: herd.name,
    processorName: grid.processorName,
    analysisMode,
    headCount: herd.headCount,
    mlaMarketValue: params.mlaMarketValue,
    dressingPercentage: params.dressingPercentage,
    estimatedCarcaseWeight: params.estimatedCarcaseWeight,
    isUsingPersonalisedData: params.isPersonalisedData,
    headlineGridValue,
    realisationFactor: params.realisationFactor,
    realisticGridOutcome,
    freightToSaleyard: params.freightToSaleyard,
    freightToProcessor: params.freightToProcessor,
    netSaleyardValue,
    netProcessorValue,
    gridIQAdvantage,
    sellWindowStatus: sellWindow.status,
    sellWindowDetail: sellWindow.detail,
    daysToTarget: sellWindow.daysToTarget,
    projectedCarcaseWeight: sellWindow.projectedWeight,
    opportunityValue,
    opportunityDriver,
    opportunityDetail,
    processorFitScore,
    processorFitLabel,
    gcr: killScoreResult?.gcr ?? null,
    gridRisk: killScoreResult?.gridRisk ?? null,
    killScore: killScoreResult?.killScore ?? null,
    gridComplianceScore: killScoreResult?.gridComplianceScore ?? null,
    fatComplianceScore: killScoreResult?.fatComplianceScore ?? null,
    dentitionComplianceScore: killScoreResult?.dentitionComplianceScore ?? null,
  };
}

// MARK: - Headline Grid Value

function calculateHeadlineGridValue(
  entries: GridEntry[],
  sex: string,
  category: string,
  carcaseWeightKg: number,
  headCount: number,
  killSheet: KillSheetForScoring | null
): number {
  const filtered = genderedEntries(entries, sex);

  // Estimate expected grade from kill history or defaults
  const expectedGrade = killSheet?.lineItems.length
    ? estimateGradeFromKillHistory(killSheet)
    : estimateDefaultGrade(category, sex, filtered);

  // Look up price for grade + weight
  const pricePerKg = findGridPrice(filtered, expectedGrade, carcaseWeightKg);
  if (pricePerKg !== null) {
    return pricePerKg * carcaseWeightKg * headCount;
  }

  // Fallback: best available price for this weight
  const bestPrice = findBestAvailablePrice(filtered, carcaseWeightKg);
  return bestPrice * carcaseWeightKg * headCount;
}

function estimateGradeFromKillHistory(killSheet: KillSheetForScoring): string {
  // Use most common left grade from line items
  const gradeCounts = new Map<string, number>();
  for (const item of killSheet.lineItems) {
    if (item.leftGrade) {
      gradeCounts.set(item.leftGrade, (gradeCounts.get(item.leftGrade) ?? 0) + 1);
    }
  }
  let bestGrade = "";
  let bestCount = 0;
  for (const [grade, count] of gradeCounts) {
    if (count > bestCount) {
      bestGrade = grade;
      bestCount = count;
    }
  }
  return bestGrade || "J";
}

export function estimateDefaultGrade(
  category: string, sex: string, entries: GridEntry[]
): string {
  const c = category.toLowerCase();
  if (c.includes("yearling") && sex === "Male") {
    return entries.find(e => e.gradeCode.startsWith("Y") && e.category.toLowerCase().includes("steer"))?.gradeCode
      ?? entries.find(e => e.gradeCode.startsWith("Y"))?.gradeCode
      ?? entries[0]?.gradeCode ?? "J";
  }
  if (c.includes("yearling") && sex === "Female") {
    return entries.find(e => e.gradeCode.startsWith("Y") && e.category.toLowerCase().includes("heifer"))?.gradeCode
      ?? entries.find(e => e.gradeCode.startsWith("Y"))?.gradeCode
      ?? entries[0]?.gradeCode ?? "J1";
  }
  if ((c.includes("grown") || c.includes("steer")) && sex === "Male") {
    return entries.find(e => e.gradeCode === "J")?.gradeCode
      ?? entries.find(e => e.gradeCode === "I")?.gradeCode
      ?? entries[0]?.gradeCode ?? "J";
  }
  if (c.includes("cow")) {
    return entries.find(e => e.gradeCode === "M")?.gradeCode
      ?? entries.find(e => e.category.toLowerCase().includes("cow"))?.gradeCode ?? "M";
  }
  if (c.includes("bull")) {
    return entries.find(e => e.gradeCode === "Q")?.gradeCode ?? "Q";
  }
  if (c.includes("heifer")) {
    return entries.find(e => e.gradeCode === "J1")?.gradeCode
      ?? entries.find(e => e.category.toLowerCase().includes("heifer"))?.gradeCode ?? "J1";
  }
  return entries[0]?.gradeCode ?? "J";
}

// Find the grid price for a specific grade and weight.
// Exported for payment check audit.
export function findGridPrice(
  entries: GridEntry[], gradeCode: string, bodyWeightKg: number
): number | null {
  const entry = entries.find(e => e.gradeCode === gradeCode);
  if (!entry) return null;
  return priceForBodyWeight(entry.weightBandPrices, bodyWeightKg);
}

// Find the highest weight band the body qualifies for
function priceForBodyWeight(
  weightBandPrices: { weightBandKg: number; pricePerKg: number }[],
  bodyWeightKg: number
): number | null {
  const sorted = [...weightBandPrices].sort((a, b) => a.weightBandKg - b.weightBandKg);
  let matched: number | null = null;
  for (const band of sorted) {
    if (bodyWeightKg >= band.weightBandKg) {
      matched = band.pricePerKg;
    }
  }
  return matched;
}

// Best available price across all entries for a given weight
function findBestAvailablePrice(entries: GridEntry[], bodyWeightKg: number): number {
  let best = 0;
  for (const entry of entries) {
    const price = priceForBodyWeight(entry.weightBandPrices, bodyWeightKg);
    if (price !== null && price > best) best = price;
  }
  return best;
}

// MARK: - Sell Window

interface SellWindowResult {
  status: SellWindowStatus;
  detail: string;
  daysToTarget: number | null;
  projectedWeight: number | null;
}

function evaluateSellWindow(
  category: string,
  sex: string,
  dailyWeightGain: number,
  estimatedCarcaseWeight: number,
  dressingPct: number,
  entries: GridEntry[]
): SellWindowResult {
  const filtered = genderedEntries(entries, sex);
  const optimal = findOptimalWeightBand(category, sex, filtered);

  if (!optimal) {
    return {
      status: "ON_TARGET",
      detail: "Unable to determine optimal weight band from grid.",
      daysToTarget: null,
      projectedWeight: estimatedCarcaseWeight,
    };
  }

  const gridCapKg = findGridWeightCap(filtered);

  // EARLY: below optimal band
  if (estimatedCarcaseWeight < optimal.minWeight) {
    const weightNeeded = optimal.minWeight - estimatedCarcaseWeight;
    const days = daysToTarget(weightNeeded, dailyWeightGain, dressingPct);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const dateStr = targetDate.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

    return {
      status: "EARLY",
      detail: `Cattle are ${Math.round(weightNeeded)} kg below target weight band (${optimal.label}). Estimated target date: ${dateStr}.`,
      daysToTarget: days,
      projectedWeight: estimatedCarcaseWeight,
    };
  }

  // RISK OF OVERWEIGHT: approaching or above grid cap
  if (gridCapKg !== null && estimatedCarcaseWeight > gridCapKg * 0.95) {
    const overBy = estimatedCarcaseWeight - gridCapKg;
    if (overBy > 0) {
      return {
        status: "RISK_OF_OVERWEIGHT",
        detail: `Cattle are ${Math.round(overBy)} kg over grid weight cap (${Math.round(gridCapKg)} kg). Consider bringing kill date forward.`,
        daysToTarget: 0,
        projectedWeight: estimatedCarcaseWeight,
      };
    }
    const headroom = gridCapKg - estimatedCarcaseWeight;
    const daysToCap = daysToTarget(headroom, dailyWeightGain, dressingPct);
    return {
      status: "RISK_OF_OVERWEIGHT",
      detail: `Cattle approaching grid weight cap (${Math.round(gridCapKg)} kg) - estimated ${daysToCap} days until cap. Consider selling soon.`,
      daysToTarget: daysToCap,
      projectedWeight: estimatedCarcaseWeight,
    };
  }

  // ON TARGET
  let detail = "Cattle within preferred weight range";
  if (gridCapKg !== null) {
    detail += ` (${Math.round(gridCapKg - estimatedCarcaseWeight)} kg headroom to grid cap)`;
  }
  detail += ".";

  return {
    status: "ON_TARGET",
    detail,
    daysToTarget: 0,
    projectedWeight: estimatedCarcaseWeight,
  };
}

function findOptimalWeightBand(
  category: string, sex: string, entries: GridEntry[]
): { minWeight: number; label: string; price: number } | null {
  const grade = estimateDefaultGrade(category, sex, entries);
  const entry = entries.find(e => e.gradeCode === grade);
  if (!entry || entry.weightBandPrices.length === 0) return null;

  const bestBand = entry.weightBandPrices.reduce((best, band) =>
    band.pricePerKg > best.pricePerKg ? band : best
  );

  return {
    minWeight: bestBand.weightBandKg,
    label: bestBand.weightBandLabel ?? `${bestBand.weightBandKg}+`,
    price: bestBand.pricePerKg,
  };
}

function findGridWeightCap(entries: GridEntry[]): number | null {
  const allBands = entries.flatMap(e => e.weightBandPrices);
  if (allBands.length === 0) return null;
  const maxWeight = Math.max(...allBands.map(b => b.weightBandKg));
  // Cap is approximately 20% above the highest weight band
  return maxWeight * 1.2;
}

function daysToTarget(weightNeededKg: number, dwgKgPerDay: number, dressingPct: number): number {
  if (dwgKgPerDay <= 0 || dressingPct <= 0) return 0;
  const liveWeightNeeded = weightNeededKg / dressingPct;
  return Math.ceil(liveWeightNeeded / dwgKgPerDay);
}

// MARK: - Opportunity Insight

interface OpportunityResult {
  value: number;
  driver: string;
  detail: string;
}

function calculateOpportunity(
  killSheet: KillSheetForScoring,
  entries: GridEntry[],
  sex: string | null
): OpportunityResult {
  if (killSheet.lineItems.length === 0) {
    return { value: 0, driver: "No kill history", detail: "Upload a kill sheet to see improvement opportunities." };
  }

  const filtered = genderedEntries(entries, sex);
  let weightDriftLoss = 0, weightDriftCount = 0;
  let gradeLoss = 0, gradeDowngradeCount = 0;
  let bruisingLoss = 0, bruisingCount = 0;
  let condemnLoss = 0, condemnCount = 0;

  const avgValue = killSheet.totalGrossValue / Math.max(1, killSheet.totalHeadCount);

  for (const item of killSheet.lineItems) {
    const bodyWeight = item.totalBodyWeight;

    // Weight drift: is the animal close to a better weight band?
    const entry = filtered.find(e => e.gradeCode === item.leftGrade);
    if (entry) {
      const achievedPrice = priceForBodyWeight(entry.weightBandPrices, bodyWeight);
      if (achievedPrice !== null) {
        const sorted = [...entry.weightBandPrices].sort((a, b) => a.weightBandKg - b.weightBandKg);
        const currentIdx = sorted.findIndex(b => bodyWeight >= b.weightBandKg);
        if (currentIdx >= 0 && currentIdx + 1 < sorted.length) {
          const nextBand = sorted[currentIdx + 1];
          if (nextBand.pricePerKg > achievedPrice) {
            const shortfall = nextBand.weightBandKg - bodyWeight;
            if (shortfall <= 30) {
              weightDriftLoss += (nextBand.pricePerKg - achievedPrice) * bodyWeight;
              weightDriftCount++;
            }
          }
        }
      }
    }

    // Grade downgrades: could the animal have achieved a better-paying grade?
    const achievedPrice = findGridPrice(filtered, item.leftGrade, bodyWeight);
    if (achievedPrice !== null) {
      const entryForGrade = filtered.find(e => e.gradeCode === item.leftGrade);
      const sameCategory = filtered.filter(e =>
        e.category.toLowerCase() === (entryForGrade?.category.toLowerCase() ?? "")
      );
      const bestPrice = Math.max(...sameCategory.map(e => priceForBodyWeight(e.weightBandPrices, bodyWeight) ?? 0));
      if (bestPrice > achievedPrice) {
        gradeLoss += (bestPrice - achievedPrice) * bodyWeight;
        gradeDowngradeCount++;
      }
    }

    // Bruising
    if (item.comments?.toLowerCase().includes("bru")) {
      bruisingCount++;
      bruisingLoss += item.grossValue * 0.02;
    }

    // Condemned
    if (item.grossValue <= 0) {
      condemnCount++;
      condemnLoss += avgValue;
    }
  }

  const total = killSheet.totalHeadCount || killSheet.lineItems.length;
  const pct = (count: number) => total > 0 ? `${Math.round((count / total) * 100)}%` : "0%";

  const drivers: { name: string; value: number; detail: string }[] = [
    {
      name: "Weight drift into lower grid band",
      value: weightDriftLoss,
      detail: `${weightDriftCount} head (${pct(weightDriftCount)}) killed below optimal weight band - moving to the next band would have returned an additional $${Math.round(weightDriftLoss / Math.max(1, weightDriftCount))}/head on average.`,
    },
    {
      name: "Grade downgrades",
      value: gradeLoss,
      detail: `${gradeDowngradeCount} head (${pct(gradeDowngradeCount)}) received a lower grade than optimal - improving conformation/fat management could recover $${Math.round(gradeLoss)}.`,
    },
    {
      name: "Bruising deductions",
      value: bruisingLoss,
      detail: `${bruisingCount} head (${pct(bruisingCount)}) had bruising deductions - improving handling and transport could recover $${Math.round(bruisingLoss)}.`,
    },
    {
      name: "Condemned carcases",
      value: condemnLoss,
      detail: `${condemnCount} carcase(s) condemned - estimated lost value of $${Math.round(condemnLoss)}.`,
    },
  ];

  const totalOpportunity = weightDriftLoss + gradeLoss + bruisingLoss + condemnLoss;
  const primary = drivers.filter(d => d.value > 0).sort((a, b) => b.value - a.value)[0];

  if (!primary || totalOpportunity <= 0) {
    return {
      value: 0,
      driver: "Strong performance",
      detail: "Your last kill performed well against the grid - no significant improvement areas identified.",
    };
  }

  return { value: totalOpportunity, driver: primary.name, detail: primary.detail };
}

// MARK: - Processor Fit

interface ProcessorFitResult {
  score: number;
  label: ProcessorFitLabel;
}

function calculateProcessorFit(
  killSheet: KillSheetForScoring,
  entries: GridEntry[],
  sex: string | null
): ProcessorFitResult {
  if (killSheet.lineItems.length === 0) {
    return { score: 50, label: "Good Match" };
  }

  const filtered = genderedEntries(entries, sex);
  const gradeScore = scoreGradeAlignment(killSheet, filtered);
  const weightScore = scoreWeightAlignment(killSheet, filtered);
  const fatScore = scoreFatAlignment(killSheet);

  // Weighted: grade 50%, weight 30%, fat 20%
  const composite = Math.min(100, Math.max(0, gradeScore * 0.5 + weightScore * 0.3 + fatScore * 0.2));
  return { score: composite, label: fitLabel(composite) };
}

function fitLabel(score: number): ProcessorFitLabel {
  if (score >= 75) return "Strong Match";
  if (score >= 50) return "Good Match";
  return "Review Needed";
}

function scoreGradeAlignment(killSheet: KillSheetForScoring, entries: GridEntry[]): number {
  if (killSheet.lineItems.length === 0) return 50;

  // Premium grades: top 50% by best price
  const withPrices = entries
    .map(e => ({ grade: e.gradeCode, best: Math.max(0, ...e.weightBandPrices.map(w => w.pricePerKg)) }))
    .filter(e => e.best > 0)
    .sort((a, b) => b.best - a.best);
  const premiumGrades = new Set(withPrices.slice(0, Math.max(1, Math.floor(withPrices.length / 2))).map(e => e.grade));

  let premiumCount = 0;
  for (const item of killSheet.lineItems) {
    if (premiumGrades.has(item.leftGrade) || premiumGrades.has(item.rightGrade)) {
      premiumCount++;
    }
  }
  return Math.min(100, (premiumCount / killSheet.lineItems.length) * 100);
}

function scoreWeightAlignment(killSheet: KillSheetForScoring, entries: GridEntry[]): number {
  if (killSheet.lineItems.length === 0) return 50;
  const allBands = entries.flatMap(e => e.weightBandPrices);
  const sorted = [...allBands].sort((a, b) => a.weightBandKg - b.weightBandKg);
  if (sorted.length === 0) return 50;

  const lo = sorted[0].weightBandKg;
  const hi = sorted[sorted.length - 1].weightBandKg * 1.2;

  let inRange = 0;
  for (const item of killSheet.lineItems) {
    if (item.totalBodyWeight >= lo && item.totalBodyWeight <= hi) inRange++;
  }
  return Math.min(100, (inRange / killSheet.lineItems.length) * 100);
}

function scoreFatAlignment(killSheet: KillSheetForScoring): number {
  if (killSheet.lineItems.length === 0) return 50;
  let inRange = 0;
  for (const item of killSheet.lineItems) {
    if (item.p8Fat >= 5 && item.p8Fat <= 22) inRange++;
  }
  return Math.min(100, (inRange / killSheet.lineItems.length) * 100);
}
