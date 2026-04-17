// Portfolio movement types  -  mirrors iOS PortfolioMovement.swift

// MARK: - Movement Period
export type MovementPeriodPreset = "1D" | "1W" | "1M" | "6M" | "1Y";

export interface MovementPeriod {
  preset: MovementPeriodPreset | "custom";
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  label: string;
}

export const MOVEMENT_PRESETS: MovementPeriodPreset[] = ["1D", "1W", "1M", "6M", "1Y"];

export function createMovementPeriod(preset: MovementPeriodPreset | "custom", customStart?: string, customEnd?: string): MovementPeriod {
  const now = new Date();
  const endDate = customEnd ?? now.toISOString().split("T")[0];
  let startDate: string;
  let label: string;

  switch (preset) {
    case "1D":
      startDate = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
      label = "1 Day";
      break;
    case "1W":
      startDate = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
      label = "1 Week";
      break;
    case "1M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      startDate = d.toISOString().split("T")[0];
      label = "1 Month";
      break;
    }
    case "6M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      startDate = d.toISOString().split("T")[0];
      label = "6 Months";
      break;
    }
    case "1Y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      startDate = d.toISOString().split("T")[0];
      label = "1 Year";
      break;
    }
    case "custom":
      startDate = customStart ?? endDate;
      label = "Custom";
      break;
  }

  return { preset, startDate, endDate, label };
}

// MARK: - Movement Driver
export type MovementDriver =
  | "New Herd"
  | "Removed/Sold"
  | "Market"
  | "Weight Gain"
  | "Calf Accrual"
  | "Mortality"
  | "Assumption";

// MARK: - Herd Movement Detail
export interface HerdMovementDetail {
  id: string;
  herdName: string;
  category: string;
  propertyName?: string;
  openingValue: number | null;
  closingValue: number | null;
  dollarChange: number;
  percentChange: number | null;
  openingHeadCount: number;
  closingHeadCount: number;
  mainDriver: MovementDriver;
  marketComponent: number;
  weightGainComponent: number;
  breedingComponent: number;
  mortalityComponent: number;
  // Effective breed premium applied in the closing valuation (base or custom override).
  // Surfaced in the Movement by Herd table so users can compare premium assumptions per herd.
  currentBreedPremium: number;
}

// MARK: - Biological Movement Breakdown
export interface BiologicalMovementBreakdown {
  weightGain: number;
  breedingAccrual: number;
  mortality: number;
  total: number;
}

// MARK: - Portfolio Movement Summary
export interface PortfolioMovementSummary {
  openingDate: string;
  closingDate: string;
  openingValue: number;
  closingValue: number;
  netChangeDollars: number;
  netChangePercent: number | null;
  openingHeadCount: number;
  closingHeadCount: number;
  netHeadCountChange: number;
  additionsValue: number;
  additionsHeadCount: number;
  removalsValue: number;
  removalsHeadCount: number;
  marketMovement: number;
  biologicalMovement: BiologicalMovementBreakdown;
  assumptionChanges: number;
  likeForLikeOpeningValue: number;
  likeForLikeClosingValue: number;
  likeForLikeChangeDollars: number;
  likeForLikeChangePercent: number | null;
  herdMovements: HerdMovementDetail[];
}
