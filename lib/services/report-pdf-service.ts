// PDF export service for reports — uses pdf-lib for client-side generation
// Port of iOS EnhancedReportExportService layout patterns

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import type { ReportData } from "@/lib/types/reports";

// MARK: - Constants

const PAGE_WIDTH = 595; // A4
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Colors
const BLACK = rgb(0, 0, 0);
const DARK_GRAY = rgb(0.3, 0.3, 0.3);
const GRAY = rgb(0.5, 0.5, 0.5);
const LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const AMBER = rgb(0.96, 0.62, 0.04);

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

// MARK: - Main Export Function

export async function generateReportPDF(
  data: ReportData,
  reportType: string,
  title: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  doc.setTitle(title);
  doc.setCreator("Stockman's Wallet");
  doc.setProducer("Stockman's Wallet Web");

  const ctx: DrawContext = { doc, font, fontBold, pageNum: 0, y: 0, page: null as unknown as PDFPage };

  // Add title page header
  newPage(ctx);
  drawHeader(ctx, title, data);

  switch (reportType) {
    case "asset-register":
      drawAssetRegister(ctx, data);
      break;
    case "sales-summary":
      drawSalesSummary(ctx, data);
      break;
    case "saleyard-comparison":
      drawSaleyardComparison(ctx, data);
      break;
    case "accountant":
      drawAccountantReport(ctx, data);
      break;
  }

  // Add page numbers
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const text = `Page ${i + 1} of ${pages.length}`;
    const tw = ctx.font.widthOfTextAtSize(text, 8);
    p.drawText(text, { x: PAGE_WIDTH - MARGIN - tw, y: 25, size: 8, font: ctx.font, color: GRAY });
  }

  return doc.save();
}

// MARK: - Draw Context

interface DrawContext {
  doc: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  page: PDFPage;
  y: number;
  pageNum: number;
}

function newPage(ctx: DrawContext) {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
  ctx.pageNum++;
}

function ensureSpace(ctx: DrawContext, needed: number) {
  if (ctx.y - needed < MARGIN + 30) {
    newPage(ctx);
  }
}

// MARK: - Header

function drawHeader(ctx: DrawContext, title: string, data: ReportData) {
  ctx.page.drawText(title, { x: MARGIN, y: ctx.y, size: 18, font: ctx.fontBold, color: BLACK });
  ctx.y -= 18;

  if (data.farmName) {
    ctx.page.drawText(data.farmName, { x: MARGIN, y: ctx.y, size: 10, font: ctx.font, color: DARK_GRAY });
    ctx.y -= 14;
  }

  const dateRange = `${fmtDate(data.dateRange.start)} — ${fmtDate(data.dateRange.end)}`;
  ctx.page.drawText(dateRange, { x: MARGIN, y: ctx.y, size: 9, font: ctx.font, color: GRAY });
  ctx.y -= 10;

  const generated = `Generated ${new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" })}`;
  ctx.page.drawText(generated, { x: MARGIN, y: ctx.y, size: 8, font: ctx.font, color: GRAY });
  ctx.y -= 20;

  // Separator line
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_WIDTH - MARGIN, y: ctx.y }, thickness: 0.5, color: LIGHT_GRAY });
  ctx.y -= 20;
}

// MARK: - Section Header

function drawSectionTitle(ctx: DrawContext, title: string) {
  ensureSpace(ctx, 30);
  ctx.page.drawText(title, { x: MARGIN, y: ctx.y, size: 12, font: ctx.fontBold, color: BLACK });
  ctx.y -= 18;
}

// MARK: - Table Row

function drawTableRow(ctx: DrawContext, cells: { text: string; width: number; align?: "left" | "right"; bold?: boolean }[], rowHeight = 16) {
  ensureSpace(ctx, rowHeight);
  let x = MARGIN;
  for (const cell of cells) {
    const f = cell.bold ? ctx.fontBold : ctx.font;
    const textWidth = f.widthOfTextAtSize(cell.text, 8);
    const drawX = cell.align === "right" ? x + cell.width - textWidth : x;
    ctx.page.drawText(cell.text, { x: drawX, y: ctx.y, size: 8, font: f, color: cell.bold ? BLACK : DARK_GRAY });
    x += cell.width;
  }
  ctx.y -= rowHeight;
}

function drawTableHeader(ctx: DrawContext, cells: { text: string; width: number; align?: "left" | "right" }[]) {
  ensureSpace(ctx, 20);
  let x = MARGIN;
  for (const cell of cells) {
    const textWidth = ctx.fontBold.widthOfTextAtSize(cell.text, 7);
    const drawX = cell.align === "right" ? x + cell.width - textWidth : x;
    ctx.page.drawText(cell.text, { x: drawX, y: ctx.y, size: 7, font: ctx.fontBold, color: GRAY });
    x += cell.width;
  }
  ctx.y -= 4;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_WIDTH - MARGIN, y: ctx.y }, thickness: 0.3, color: LIGHT_GRAY });
  ctx.y -= 10;
}

// MARK: - Asset Register

function drawAssetRegister(ctx: DrawContext, data: ReportData) {
  // Executive Summary
  if (data.executiveSummary) {
    const es = data.executiveSummary;
    drawSectionTitle(ctx, "Executive Summary");
    drawTableRow(ctx, [
      { text: "Total Portfolio Value:", width: 180 },
      { text: fmt(es.totalPortfolioValue), width: 120, align: "right", bold: true },
      { text: "Total Head Count:", width: 100 },
      { text: es.totalHeadCount.toLocaleString(), width: 95, align: "right", bold: true },
    ]);
    drawTableRow(ctx, [
      { text: "Average Value Per Head:", width: 180 },
      { text: fmt(es.averageValuePerHead), width: 120, align: "right", bold: true },
      { text: "Valuation Date:", width: 100 },
      { text: fmtDate(es.valuationDate), width: 95, align: "right", bold: true },
    ]);
    ctx.y -= 10;
  }

  // Herd cards (matching iOS layout)
  drawSectionTitle(ctx, "Livestock Assets");

  for (const h of data.herdData) {
    // Each herd card needs ~60-80px
    ensureSpace(ctx, 80);

    // Card header: name + value
    const nameWidth = ctx.fontBold.widthOfTextAtSize(h.name, 10);
    ctx.page.drawText(h.name, { x: MARGIN, y: ctx.y, size: 10, font: ctx.fontBold, color: BLACK });
    const valStr = fmt(h.netValue);
    const valWidth = ctx.fontBold.widthOfTextAtSize(valStr, 10);
    ctx.page.drawText(valStr, { x: PAGE_WIDTH - MARGIN - valWidth, y: ctx.y, size: 10, font: ctx.fontBold, color: BLACK });
    ctx.y -= 12;
    ctx.page.drawText(h.category, { x: MARGIN, y: ctx.y, size: 8, font: ctx.font, color: GRAY });
    ctx.y -= 14;

    // Main stats row: Head, Age, Weight, Price
    const statW = CONTENT_WIDTH / 4;
    const statLabels = ["HEAD COUNT", "AGE", "WEIGHT", "PRICE"];
    const statValues = [`${h.headCount} head`, `${h.ageMonths} months`, `${h.weight.toFixed(0)} kg`, `$${h.pricePerKg.toFixed(2)}/kg`];
    for (let i = 0; i < 4; i++) {
      const sx = MARGIN + i * statW;
      ctx.page.drawText(statLabels[i], { x: sx, y: ctx.y, size: 6, font: ctx.fontBold, color: GRAY });
      ctx.page.drawText(statValues[i], { x: sx, y: ctx.y - 10, size: 8, font: ctx.fontBold, color: DARK_GRAY });
    }
    ctx.y -= 24;

    // Breeding & risk row (conditional)
    const riskFields: { label: string; value: string }[] = [];
    if (h.breedPremiumOverride != null) {
      riskFields.push({ label: "BREED ADJ.", value: `${h.breedPremiumOverride >= 0 ? "+" : ""}${h.breedPremiumOverride}% vs. avg` });
    }
    if (h.dailyWeightGain > 0) {
      riskFields.push({ label: "DWG ALLOCATION", value: `${h.dailyWeightGain.toFixed(2)} kg/day` });
    }
    if (h.isBreeder && h.calvingRate > 0) {
      const calvPct = h.calvingRate > 1 ? h.calvingRate : h.calvingRate * 100;
      riskFields.push({ label: "CALVING %", value: `${calvPct.toFixed(0)}%` });
    }
    if (h.mortalityRate > 0) {
      const mortPct = h.mortalityRate > 1 ? h.mortalityRate : h.mortalityRate * 100;
      riskFields.push({ label: "MORTALITY", value: `${mortPct.toFixed(1)}% p.a.` });
    }
    if (h.breedingAccrual != null && h.breedingAccrual > 0) {
      riskFields.push({ label: "CALF ACCRUAL", value: fmt(h.breedingAccrual) });
    }

    if (riskFields.length > 0) {
      const riskW = CONTENT_WIDTH / Math.min(riskFields.length, 4);
      for (let i = 0; i < riskFields.length; i++) {
        const rx = MARGIN + (i % 4) * riskW;
        ctx.page.drawText(riskFields[i].label, { x: rx, y: ctx.y, size: 6, font: ctx.fontBold, color: GRAY });
        ctx.page.drawText(riskFields[i].value, { x: rx, y: ctx.y - 10, size: 8, font: ctx.font, color: DARK_GRAY });
      }
      ctx.y -= 24;
    }

    // Divider between cards
    ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_WIDTH - MARGIN, y: ctx.y }, thickness: 0.3, color: LIGHT_GRAY });
    ctx.y -= 12;
  }

  // Total row
  ctx.y -= 4;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_WIDTH - MARGIN, y: ctx.y }, thickness: 0.5, color: LIGHT_GRAY });
  ctx.y -= 12;
  const totalHead = data.herdData.reduce((s, h) => s + h.headCount, 0);
  drawTableRow(ctx, [
    { text: "TOTAL", width: 110, bold: true },
    { text: "", width: 100 },
    { text: totalHead.toString(), width: 50, align: "right", bold: true },
    { text: "", width: 60 },
    { text: "", width: 55 },
    { text: fmt(data.totalValue), width: 80, align: "right", bold: true },
    { text: "", width: 40 },
  ]);
}

// MARK: - Sales Summary

function drawSalesSummary(ctx: DrawContext, data: ReportData) {
  drawSectionTitle(ctx, "Sales Overview");
  const totalGross = data.salesData.reduce((s, r) => s + r.grossValue, 0);
  const totalFreight = data.salesData.reduce((s, r) => s + r.freightCost, 0);

  drawTableRow(ctx, [
    { text: "Net Sales Revenue:", width: 180 },
    { text: fmt(data.totalSales), width: 120, align: "right", bold: true },
  ]);
  drawTableRow(ctx, [
    { text: "Gross Sales:", width: 180 },
    { text: fmt(totalGross), width: 120, align: "right" },
  ]);
  drawTableRow(ctx, [
    { text: "Total Freight:", width: 180 },
    { text: fmt(totalFreight), width: 120, align: "right" },
  ]);
  drawTableRow(ctx, [
    { text: "Total Records:", width: 180 },
    { text: data.salesData.length.toString(), width: 120, align: "right" },
  ]);
  ctx.y -= 10;

  // Sales table
  drawSectionTitle(ctx, "Sales Records");
  const cols = [
    { text: "Date", width: 70 },
    { text: "Herd", width: 90 },
    { text: "Head", width: 40, align: "right" as const },
    { text: "Avg Wt", width: 55, align: "right" as const },
    { text: "Type", width: 65 },
    { text: "Location", width: 75 },
    { text: "Net Value", width: 80, align: "right" as const },
  ];
  drawTableHeader(ctx, cols);

  for (const s of data.salesData) {
    drawTableRow(ctx, [
      { text: fmtDate(s.date), width: 70 },
      { text: (s.herdName ?? "—").substring(0, 16), width: 90 },
      { text: s.headCount.toString(), width: 40, align: "right" },
      { text: `${s.avgWeight.toFixed(0)} kg`, width: 55, align: "right" },
      { text: (s.saleType ?? "—").substring(0, 12), width: 65 },
      { text: (s.saleLocation ?? "—").substring(0, 14), width: 75 },
      { text: fmt(s.netValue), width: 80, align: "right", bold: true },
    ]);
  }
}

// MARK: - Saleyard Comparison

function drawSaleyardComparison(ctx: DrawContext, data: ReportData) {
  drawSectionTitle(ctx, "Saleyard Price Comparison");

  if (data.saleyardComparison.length > 0) {
    drawTableRow(ctx, [
      { text: "Best Average Price:", width: 180 },
      { text: `$${data.saleyardComparison[0].avgPrice.toFixed(2)}/kg`, width: 120, align: "right", bold: true },
    ]);
    drawTableRow(ctx, [
      { text: "Best Saleyard:", width: 180 },
      { text: data.saleyardComparison[0].saleyardName.substring(0, 30), width: 200 },
    ]);
    drawTableRow(ctx, [
      { text: "Saleyards Compared:", width: 180 },
      { text: data.saleyardComparison.length.toString(), width: 120, align: "right" },
    ]);
    ctx.y -= 10;
  }

  const cols = [
    { text: "#", width: 25 },
    { text: "Saleyard", width: 200 },
    { text: "Avg $/kg", width: 70, align: "right" as const },
    { text: "Min $/kg", width: 70, align: "right" as const },
    { text: "Max $/kg", width: 70, align: "right" as const },
  ];
  drawTableHeader(ctx, cols);

  for (let i = 0; i < data.saleyardComparison.length; i++) {
    const s = data.saleyardComparison[i];
    drawTableRow(ctx, [
      { text: (i + 1).toString(), width: 25 },
      { text: s.saleyardName.substring(0, 40), width: 200 },
      { text: `$${s.avgPrice.toFixed(2)}`, width: 70, align: "right", bold: i === 0 },
      { text: `$${s.minPrice.toFixed(2)}`, width: 70, align: "right" },
      { text: `$${s.maxPrice.toFixed(2)}`, width: 70, align: "right" },
    ]);
  }
}

// MARK: - Accountant Report

function drawAccountantReport(ctx: DrawContext, data: ReportData) {
  // Executive summary
  if (data.executiveSummary) {
    drawSectionTitle(ctx, "Portfolio Summary");
    drawTableRow(ctx, [
      { text: "Total Portfolio Value:", width: 200 },
      { text: fmt(data.executiveSummary.totalPortfolioValue), width: 120, align: "right", bold: true },
    ]);
    drawTableRow(ctx, [
      { text: "Total Head Count:", width: 200 },
      { text: data.executiveSummary.totalHeadCount.toLocaleString(), width: 120, align: "right", bold: true },
    ]);
    drawTableRow(ctx, [
      { text: "Sales Revenue (Period):", width: 200 },
      { text: fmt(data.totalSales), width: 120, align: "right", bold: true },
    ]);
    ctx.y -= 10;
  }

  // Asset register
  if (data.herdData.length > 0) {
    drawAssetRegister(ctx, data);
    ctx.y -= 15;
  }

  // Sales summary
  if (data.salesData.length > 0) {
    drawSalesSummary(ctx, data);
  }
}
