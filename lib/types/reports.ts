// Report types  -  mirrors iOS ReportData.swift and ReportConfiguration.swift

// MARK: - Report Configuration

export type ReportType =
  | "asset-register"
  | "sales-summary"
  | "saleyard-comparison"
  | "accountant"
  | "value-vs-land-area"
  | "property-comparison"
  | "advisor-lens";

export type DateRangePreset = "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "custom";

export interface ReportConfiguration {
  reportType: ReportType;
  startDate: string; // ISO date string
  endDate: string;
  selectedPropertyIds: string[]; // empty = all properties
}

// MARK: - Executive Summary

export interface ExecutiveSummary {
  totalPortfolioValue: number;
  totalHeadCount: number;
  averageValuePerHead: number;
  valuationDate: string;
  changeDollars?: number;
  changePercent?: number;
  previousDate?: string;
}

// MARK: - Herd Composition Item (for donut chart)

export interface HerdCompositionItem {
  assetClass: string;
  value: number;
  percentage: number;
  headCount: number;
}

// MARK: - Herd Report Data

export interface HerdReportData {
  id: string;
  name: string;
  category: string;
  headCount: number;
  ageMonths: number;
  weight: number;
  pricePerKg: number;
  netValue: number;
  breedingAccrual: number | null;
  dailyWeightGain: number;
  mortalityRate: number;
  calvingRate: number;
  isBreeder: boolean;
  propertyId: string | null;
  propertyName: string | null;
  livestockOwner: string | null;
  baseBreedPremium: number;
  breedPremiumOverride: number | null;
  breedPremiumApplied: number;
  breedPremiumJustification: string | null;
  priceSource: string;
  dataDate: string | null;
}

// MARK: - Sale Report Data

export interface SaleReportData {
  id: string;
  date: string;
  headCount: number;
  avgWeight: number;
  pricePerKg: number;
  pricePerHead: number | null;
  pricingType: string;
  saleType: string | null;
  saleLocation: string | null;
  netValue: number;
  grossValue: number;
  freightCost: number;
  herdName?: string;
}

// MARK: - Saleyard Comparison Data

export interface SaleyardComparisonData {
  saleyardName: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalHeadCount: number;
  totalPortfolioValue: number;
  avgPerHead: number;
  spread: number;
  rank: number;
  diffToBestDollars: number;
  diffToBestPercent: number;
  state: string | null;
  // Haversine distance (km) from the user's origin property. Null when the
  // origin property or the saleyard is missing coordinates.
  distanceKm: number | null;
}

// MARK: - User Details (for PDF header)

export interface UserReportDetails {
  preparedFor: string;
  propertyName: string | null;
  picCode: string | null;
  location: string | null;
}

// MARK: - Property Details (for report header)

export interface ReportPropertyDetails {
  name: string;
  picCode: string | null;
  state: string | null;
}

// MARK: - Value vs Land Area (iOS parity)

export interface LandValueAnalysisData {
  propertyName: string;
  acreage: number;
  livestockValue: number;
  valuePerAcre: number;
  totalHeadCount: number;
}

// MARK: - Property vs Property (iOS parity)

export interface PropertyComparisonData {
  propertyName: string;
  totalValue: number;
  totalHeadCount: number;
  avgPricePerKg: number;
  valuePerHead: number;
}

// MARK: - Accountant Report Snapshot (mirrors iOS AccountantReportSnapshot)

export interface AccountantSnapshot {
  financialYearLabel: string;
  financialYearShortTitle: string;
  periodStart: string;
  periodEnd: string;
  openingBookValue: number;
  purchasesRecorded: number;
  salesRecorded: number;
  modelledClosingBookPosition: number;
  marketValuationAtYearEnd: number;
  marketMinusBookDifference: number;
  generatedAt: string;
}

// MARK: - Main Report Data Container

export interface ReportData {
  farmName: string | null;
  totalValue: number;
  totalSales: number;
  herdData: HerdReportData[];
  salesData: SaleReportData[];
  saleyardComparison: SaleyardComparisonData[];
  /** Populated by the Value vs Land Area report; empty for others. */
  landValueAnalysis: LandValueAnalysisData[];
  /** Populated by the Property vs Property report; empty for others. */
  propertyComparison: PropertyComparisonData[];
  executiveSummary: ExecutiveSummary | null;
  herdComposition: HerdCompositionItem[];
  userDetails: UserReportDetails | null;
  properties: ReportPropertyDetails[];
  generatedAt: string;
  dateRange: { start: string; end: string };
  accountantSnapshot?: AccountantSnapshot;
}
