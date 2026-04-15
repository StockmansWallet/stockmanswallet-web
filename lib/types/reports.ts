// Report types — mirrors iOS ReportData.swift and ReportConfiguration.swift

// MARK: - Report Configuration

export type ReportType =
  | "asset-register"
  | "sales-summary"
  | "saleyard-comparison"
  | "accountant"
  | "advisor-lens";

export type DateRangePreset = "1m" | "3m" | "6m" | "1y" | "custom";

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
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  netValue: number;
  breedingAccrual: number | null;
  dailyWeightGain: number;
  mortalityRate: number;
  calvingRate: number;
  isBreeder: boolean;
  propertyId: string | null;
  propertyName: string | null;
  breedPremiumOverride: number | null;
  breedPremiumApplied: number;
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
}

// MARK: - User Details (for PDF header)

export interface UserReportDetails {
  preparedFor: string;
  propertyName: string | null;
  picCode: string | null;
  location: string | null;
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
  executiveSummary: ExecutiveSummary | null;
  herdComposition: HerdCompositionItem[];
  userDetails: UserReportDetails | null;
  generatedAt: string;
  dateRange: { start: string; end: string };
  accountantSnapshot?: AccountantSnapshot;
}
