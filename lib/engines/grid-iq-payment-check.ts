// Grid IQ payment check - audits kill sheet payments against grid pricing.
// Port of iOS GridIQEngine+PaymentCheck.swift.
// Compares per-head actual $/kg with expected $/kg from grid for each grade x weight band.

import { findGridPrice } from "./grid-iq-engine";
import type { GridEntry, KillSheetLineItem } from "./kill-score-engine";
import { deriveSexFromCategory, normaliseHerdSex } from "@/lib/grid-iq/category-sex";

// Result of a full payment check across all line items
export interface PaymentCheckResult {
  totalExpectedValue: number;
  totalActualValue: number;
  matchCount: number;
  lineDiscrepancies: PaymentLineDiscrepancy[];
}

// A single line item where actual price differs from grid price
export interface PaymentLineDiscrepancy {
  bodyNumber: number;
  gradeCode: string;
  weightBandKg: number;
  expectedPricePerKg: number;
  actualPricePerKg: number;
  expectedGrossValue: number;
  actualGrossValue: number;
  reason: string | null;
}

// Internal - result of checking one side (left or right)
interface SideCheckResult {
  expectedPrice: number;
  expectedValue: number;
  priceDiff: number;
}

/**
 * Audit kill sheet payments against the matching processor grid.
 * Optional sex parameter routes lookups to gender-appropriate grid entries.
 */
export function runPaymentCheck(
  lineItems: KillSheetLineItem[],
  totalGrossValue: number,
  gridEntries: GridEntry[],
  sex?: string | null,
): PaymentCheckResult {
  if (lineItems.length === 0) {
    return {
      totalExpectedValue: 0,
      totalActualValue: totalGrossValue,
      matchCount: 0,
      lineDiscrepancies: [],
    };
  }

  // Filter line items by sex first - a steer consignment's payment audit must
  // not flag heifer/cow rows as "underpaid" against the steer grid.
  const target = normaliseHerdSex(sex);
  const filteredLineItems =
    target === "Unknown"
      ? lineItems
      : lineItems.filter((item) => {
          const s = item.sex ?? deriveSexFromCategory(item.category);
          return s === target || s === "Unknown";
        });

  if (filteredLineItems.length === 0) {
    return {
      totalExpectedValue: 0,
      totalActualValue: 0,
      matchCount: 0,
      lineDiscrepancies: [],
    };
  }

  // Filter entries by gender if specified (mirrors genderedEntries in kill-score-engine)
  const filtered = sex ? filterEntriesBySex(gridEntries, sex) : gridEntries;

  let totalExpected = 0;
  let totalActual = 0;
  let matchCount = 0;
  const discrepancies: PaymentLineDiscrepancy[] = [];

  for (const item of filteredLineItems) {
    const bodyWeight = item.totalBodyWeight;

    // Check left side
    const leftResult = checkSide(
      item.leftSideWeight,
      item.leftGrade,
      item.leftPricePerKg,
      bodyWeight,
      filtered,
    );

    // Check right side
    const rightResult = checkSide(
      item.rightSideWeight,
      item.rightGrade,
      item.rightPricePerKg,
      bodyWeight,
      filtered,
    );

    const expectedValue = leftResult.expectedValue + rightResult.expectedValue;
    const actualValue =
      item.leftSideWeight * item.leftPricePerKg +
      item.rightSideWeight * item.rightPricePerKg;

    totalExpected += expectedValue;
    totalActual += actualValue;

    // Tolerance: $0.01/kg
    const priceTolerance = 0.01;
    const leftMatch = Math.abs(leftResult.priceDiff) <= priceTolerance;
    const rightMatch = Math.abs(rightResult.priceDiff) <= priceTolerance;

    if (leftMatch && rightMatch) {
      matchCount++;
    } else {
      // Record discrepancy - use the side with the larger difference
      const useLeft = Math.abs(leftResult.priceDiff) >= Math.abs(rightResult.priceDiff);
      const mainGrade = useLeft ? item.leftGrade : item.rightGrade;
      const mainExpectedPrice = useLeft ? leftResult.expectedPrice : rightResult.expectedPrice;
      const mainActualPrice = useLeft ? item.leftPricePerKg : item.rightPricePerKg;

      const reason = identifyReason(item, leftResult, rightResult);

      discrepancies.push({
        bodyNumber: item.bodyNumber,
        gradeCode: mainGrade,
        weightBandKg: bodyWeight,
        expectedPricePerKg: mainExpectedPrice,
        actualPricePerKg: mainActualPrice,
        expectedGrossValue: expectedValue,
        actualGrossValue: actualValue,
        reason,
      });
    }
  }

  return {
    totalExpectedValue: totalExpected,
    totalActualValue: totalActual,
    matchCount,
    lineDiscrepancies: discrepancies,
  };
}

// Check a single side's pricing against the grid
function checkSide(
  sideWeight: number,
  gradeCode: string,
  actualPricePerKg: number,
  bodyWeight: number,
  entries: GridEntry[],
): SideCheckResult {
  const expectedPrice = findGridPrice(entries, gradeCode, bodyWeight) ?? 0;
  const expectedValue = expectedPrice * sideWeight;
  const priceDiff = actualPricePerKg - expectedPrice;
  return { expectedPrice, expectedValue, priceDiff };
}

// Try to identify why a payment differs from grid pricing
function identifyReason(
  item: KillSheetLineItem,
  leftResult: SideCheckResult,
  rightResult: SideCheckResult,
): string | null {
  // Check for known adjustment types from comments
  const comments = item.comments?.toLowerCase();
  if (comments) {
    if (comments.includes("bru")) return "Bruising deduction";
    if (comments.includes("fat col")) return "Fat colour penalty";
    if (comments.includes("cond")) return "Condemned carcase";
    if (comments.includes("scar")) return "Scar tissue removal";
    if (comments.includes("meat col")) return "Meat colour penalty";
  }

  // Check if gross value is zero (condemned)
  if (item.grossValue <= 0) return "Condemned carcase";

  // Check if it's a split grade (different grades on each side)
  if (item.leftGrade && item.rightGrade && item.leftGrade !== item.rightGrade) {
    return "Split grade - sides graded differently";
  }

  // Check if actual price is lower (underpaid) or higher (possible premium)
  const avgDiff = (leftResult.priceDiff + rightResult.priceDiff) / 2;
  if (avgDiff > 0.05) return "Premium applied";
  if (avgDiff < -0.05) return "Price adjustment - worth querying with processor";

  return null;
}

// Filter grid entries by sex (gender-aware routing)
function filterEntriesBySex(entries: GridEntry[], sex: string): GridEntry[] {
  const sexLower = sex.toLowerCase();
  const isMale = sexLower === "male" || sexLower === "steer" || sexLower === "bull";
  const genderTag = isMale ? "male" : "female";

  // If entries have gender tags, filter to matching gender
  const hasGenderTags = entries.some((e) => e.gender);
  if (hasGenderTags) {
    const filtered = entries.filter((e) => e.gender === genderTag);
    return filtered.length > 0 ? filtered : entries;
  }
  return entries;
}
