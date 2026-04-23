// Per-report tabular builders. Each function takes the already-generated
// ReportData (from lib/services/report-service) and produces a plain
// tabular ExportWorkbook that the CSV and XLSX serialisers share.
//
// The goal is that CSV and XLSX always agree on columns, ordering, and
// formatting decisions (eg. rounding, $/kg precision) because they read
// from the same source.

import type { ReportData, HerdReportData, SaleReportData } from "@/lib/types/reports";
import type { PortfolioMovementSummary } from "@/lib/types/portfolio-movement";
import type { ExportWorkbook, ExportSheet } from "./types";
import { shortSaleyardName } from "@/lib/data/reference-data";
import { formatDateAU } from "@/lib/dates";

// Rounds to 2dp. Keeping this in one place so the two serialisers can't drift.
function money(v: number): number {
  return Math.round(v * 100) / 100;
}

function valuationSource(h: HerdReportData): string {
  const datePart = h.dataDate ? ` (${formatDateAU(h.dataDate)})` : "";
  if (h.priceSource === "saleyard" && h.saleyardUsed) {
    return `MLA saleyard: ${shortSaleyardName(h.saleyardUsed)}${datePart}`;
  }
  if (h.priceSource === "national") {
    return `MLA National indicator${datePart}`;
  }
  return "Default fallback";
}

function herdSheet(herds: HerdReportData[]): ExportSheet {
  const headers = [
    "Property",
    "Herd",
    "Livestock Owner",
    "Category",
    "Head Count",
    "Age (months)",
    "Weight (kg)",
    "DWG (kg/day)",
    "$/kg",
    "Breed Premium (%)",
    "Avg / Head",
    "Net Value",
    "Calf Accrual",
    "Calving Rate (%)",
    "Mortality (% p.a.)",
    "Valuation Source",
  ];

  const rows = herds.map((h) => {
    const calvingPct = h.calvingRate > 1 ? h.calvingRate : h.calvingRate * 100;
    const mortalityPct = h.mortalityRate > 1 ? h.mortalityRate : h.mortalityRate * 100;
    const premium = h.breedPremiumOverride ?? h.baseBreedPremium ?? 0;
    return [
      h.propertyName ?? "Unassigned",
      h.name,
      h.livestockOwner ?? "",
      h.category,
      h.headCount,
      h.ageMonths,
      Math.round(h.weight * 100) / 100,
      Math.round(h.dailyWeightGain * 100) / 100,
      Math.round(h.pricePerKg * 10000) / 10000,
      premium,
      money(h.netValue / Math.max(h.headCount, 1)),
      money(h.netValue),
      h.breedingAccrual != null ? money(h.breedingAccrual) : "",
      h.isBreeder ? Math.round(calvingPct) : "",
      Math.round(mortalityPct * 10) / 10,
      valuationSource(h),
    ];
  });

  // Lee (test user) feedback, 2026-04-23: centre headings for numeric columns,
  // format head / $ / $/head columns with comma separators, widen columns so
  // headings fit without truncating.
  //
  //  idx 0  Property              text,   left
  //      1  Herd                  text,   left
  //      2  Livestock Owner       text,   left
  //      3  Category              text,   left
  //      4  Head Count            int,    centre heading, #,##0
  //      5  Age (months)          int,    centre heading, #,##0
  //      6  Weight (kg)           2dp,    centre heading, #,##0.00
  //      7  DWG (kg/day)          2dp,    centre heading, 0.00
  //      8  $/kg                  4dp,    centre heading, $#,##0.0000
  //      9  Breed Premium (%)     0dp,    centre heading, 0"%"
  //     10  Avg / Head            money,  centre heading, $#,##0.00
  //     11  Net Value             money,  centre heading, $#,##0.00
  //     12  Calf Accrual          money,  centre heading, $#,##0.00
  //     13  Calving Rate (%)      int,    centre heading, 0"%"
  //     14  Mortality (% p.a.)    1dp,    centre heading, 0.0"%"
  //     15  Valuation Source      text,   left
  const columnFormats: (string | undefined)[] = [
    undefined, undefined, undefined, undefined,
    "#,##0",
    "#,##0",
    "#,##0.00",
    "0.00",
    "$#,##0.0000",
    "0\"%\"",
    "$#,##0.00",
    "$#,##0.00",
    "$#,##0.00",
    "0\"%\"",
    "0.0\"%\"",
    undefined,
  ];
  const headerAlignments: ("left" | "center" | "right")[] = [
    "left", "left", "left", "left",
    "center", "center", "center", "center", "center",
    "center", "center", "center", "center", "center", "center",
    "left",
  ];

  return {
    name: "Livestock Assets",
    headers,
    rows,
    columnWidths: [20, 24, 20, 24, 12, 13, 13, 14, 14, 16, 15, 15, 15, 17, 17, 36],
    columnFormats,
    headerAlignments,
  };
}

function salesSheet(sales: SaleReportData[]): ExportSheet {
  const headers = [
    "Date",
    "Herd",
    "Head Count",
    "Avg Weight (kg)",
    "$/kg",
    "$/head",
    "Sale Type",
    "Sale Location",
    "Gross Value",
    "Freight Cost",
    "Net Value",
  ];
  const rows = sales.map((s) => [
    s.date.length > 10 ? s.date.slice(0, 10) : s.date,
    s.herdName ?? "",
    s.headCount,
    Math.round(s.avgWeight * 10) / 10,
    Math.round(s.pricePerKg * 1000) / 1000,
    s.pricePerHead != null ? money(s.pricePerHead) : "",
    s.saleType ?? "",
    s.saleLocation ?? "",
    money(s.grossValue),
    money(s.freightCost),
    money(s.netValue),
  ]);
  return {
    name: "Sales",
    headers,
    rows,
    columnWidths: [12, 22, 12, 14, 10, 12, 16, 24, 14, 14, 14],
  };
}

function saleyardComparisonSheet(rows: ReportData["saleyardComparison"]): ExportSheet {
  return {
    name: "Saleyard Comparison",
    headers: [
      "Rank",
      "Saleyard",
      "State",
      "Distance (km)",
      "Avg $/kg",
      "Min $/kg",
      "Max $/kg",
      "Spread $/kg",
      "Portfolio Value",
      "Avg per Head",
      "Diff to Best ($)",
      "Diff to Best (%)",
    ],
    rows: rows.map((r) => [
      r.rank,
      shortSaleyardName(r.saleyardName),
      r.state ?? "",
      r.distanceKm != null ? Math.round(r.distanceKm) : "",
      Math.round(r.avgPrice * 1000) / 1000,
      Math.round(r.minPrice * 1000) / 1000,
      Math.round(r.maxPrice * 1000) / 1000,
      Math.round(r.spread * 1000) / 1000,
      money(r.totalPortfolioValue),
      money(r.avgPerHead),
      money(r.diffToBestDollars),
      Math.round(r.diffToBestPercent * 100) / 100,
    ]),
  };
}

function landValueSheet(rows: ReportData["landValueAnalysis"]): ExportSheet {
  return {
    name: "Value vs Land Area",
    headers: [
      "Property",
      "Acreage",
      "Head Count",
      "Livestock Value",
      "Value per Acre",
    ],
    rows: rows.map((r) => [
      r.propertyName,
      r.acreage,
      r.totalHeadCount,
      money(r.livestockValue),
      money(r.valuePerAcre),
    ]),
  };
}

function propertyComparisonSheet(rows: ReportData["propertyComparison"]): ExportSheet {
  return {
    name: "Property Comparison",
    headers: [
      "Property",
      "Head Count",
      "Avg $/kg",
      "Avg Value per Head",
      "Total Value",
    ],
    rows: rows.map((r) => [
      r.propertyName,
      r.totalHeadCount,
      Math.round(r.avgPricePerKg * 1000) / 1000,
      money(r.valuePerHead),
      money(r.totalValue),
    ]),
  };
}

function movementBridgeSheet(m: PortfolioMovementSummary): ExportSheet {
  const bridge: [string, number, number | null][] = [
    ["Opening Portfolio Value", m.openingValue, m.openingHeadCount],
    ["New Herds", m.additionsValue, m.additionsHeadCount],
    ["Removals / Sales", -m.removalsValue, -m.removalsHeadCount],
    ["Market Movement", m.marketMovement, null],
    ["Weight Gain", m.biologicalMovement.weightGain, null],
    ["Breeding Accrual", m.biologicalMovement.breedingAccrual, null],
    ["Mortality", m.biologicalMovement.mortality, null],
    ["Other / Assumptions", m.assumptionChanges, null],
    ["Closing Portfolio Value", m.closingValue, m.closingHeadCount],
  ];
  return {
    name: "Movement Bridge",
    headers: ["Line", "$ Change", "Head", "$ / Head"],
    rows: bridge.map(([label, value, head]) => [
      label,
      money(value),
      head ?? "",
      head !== null && head !== 0 ? money(value / head) : "",
    ]),
    columnWidths: [30, 18, 12, 16],
    // Per Lee's feedback: right-justify the numeric column headings, format
    // the $ columns with comma separators, bold the opening and closing rows.
    columnFormats: [undefined, "$#,##0.00", "#,##0", "$#,##0.00"],
    headerAlignments: ["left", "right", "right", "right"],
    boldRows: [0, bridge.length - 1],
  };
}

// ---------------------------------------------------------------------------
// Public entry: transform ReportData into an ExportWorkbook
// ---------------------------------------------------------------------------

interface BuildWorkbookArgs {
  reportType: string;
  reportData: ReportData;
  /** Optional portfolio movement data. When present a "Movement Bridge" sheet is appended. */
  movement?: PortfolioMovementSummary | null;
}

export function buildWorkbook({ reportType, reportData, movement }: BuildWorkbookArgs): ExportWorkbook {
  const title = titleForReport(reportType);

  const metadata: { label: string; value: string }[] = [];
  if (reportData.userDetails?.preparedFor) {
    metadata.push({ label: "Prepared for", value: reportData.userDetails.preparedFor });
  }
  if (reportData.userDetails?.propertyName) {
    metadata.push({ label: "Property", value: reportData.userDetails.propertyName });
  }
  if (reportData.dateRange) {
    metadata.push({
      label: "Report period",
      value: `${formatDateAU(reportData.dateRange.start)} to ${formatDateAU(reportData.dateRange.end)}`,
    });
  }
  if (reportData.executiveSummary) {
    metadata.push({ label: "Valuation date", value: formatDateAU(reportData.executiveSummary.valuationDate) });
    metadata.push({ label: "Total portfolio value", value: money(reportData.executiveSummary.totalPortfolioValue).toLocaleString("en-AU", { style: "currency", currency: "AUD" }) });
    metadata.push({ label: "Head count", value: reportData.executiveSummary.totalHeadCount.toLocaleString("en-AU") });
  }

  const sheets: ExportSheet[] = [];

  switch (reportType) {
    case "asset-report":
    case "lender-report":
      sheets.push(herdSheet(reportData.herdData));
      if (movement) sheets.push(movementBridgeSheet(movement));
      break;
    case "sales-summary":
      sheets.push(salesSheet(reportData.salesData));
      break;
    case "saleyard-comparison":
      sheets.push(saleyardComparisonSheet(reportData.saleyardComparison));
      break;
    case "value-vs-land-area":
      sheets.push(landValueSheet(reportData.landValueAnalysis));
      break;
    case "property-comparison":
      sheets.push(propertyComparisonSheet(reportData.propertyComparison));
      break;
    default:
      // Accountant is bespoke and ships as PDF only for now.
      sheets.push({ name: "Summary", headers: ["Note"], rows: [["This report type is only available as a PDF."]] });
  }

  const filenameStem = filenameStemFor(reportType, reportData.dateRange);

  return { title, metadata, sheets, filenameStem };
}

function titleForReport(reportType: string): string {
  switch (reportType) {
    case "asset-report": return "Asset Report";
    case "lender-report": return "Lender Report";
    case "sales-summary": return "Sales Summary";
    case "saleyard-comparison": return "Saleyard Comparison";
    case "value-vs-land-area": return "Value vs Land Area";
    case "property-comparison": return "Property Comparison";
    default: return "Report";
  }
}

function filenameStemFor(reportType: string, range: ReportData["dateRange"]): string {
  const pascal: Record<string, string> = {
    "asset-report": "AssetReport",
    "lender-report": "LenderReport",
    "sales-summary": "SalesSummary",
    "saleyard-comparison": "SaleyardComparison",
    "value-vs-land-area": "ValueVsLandArea",
    "property-comparison": "PropertyComparison",
  };
  const slug = pascal[reportType] ?? "Report";
  if (range?.start && range?.end) {
    return `${slug}_${range.start}_to_${range.end}`;
  }
  return slug;
}
