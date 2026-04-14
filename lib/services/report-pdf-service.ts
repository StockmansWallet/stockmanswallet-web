// PDF export service for reports - matches iOS EnhancedReportExportService layout
// Uses pdf-lib for client-side generation with card-based design

import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from "pdf-lib";
import type { ReportData } from "@/lib/types/reports";

// MARK: - Page Constants (US Letter, matching iOS)

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 72;
const CW = PAGE_W - MARGIN * 2; // content width = 468

// MARK: - Colours (greyscale, print-optimised)

const BLACK = rgb(0, 0, 0);
const SECONDARY = rgb(0.4, 0.4, 0.4);
const TERTIARY = rgb(0.6, 0.6, 0.6);
const CARD_FILL = rgb(0.98, 0.98, 0.98);
const BORDER = rgb(0.9, 0.9, 0.9);

// MARK: - Typography Sizes (matching iOS SF Rounded hierarchy)

const FONT_HERO = 36;
const FONT_TITLE = 32;
const FONT_LARGE_TITLE = 28;
const FONT_SECTION = 18;
const FONT_HEADLINE = 15;
const FONT_VALUE = 16;
const FONT_EXEC_VALUE = 14;
const FONT_BODY = 13;
const FONT_CAPTION = 11;
const FONT_TABLE_ROW = 11;
const FONT_LABEL = 9;
const FONT_FOOTER = 7.5;

// MARK: - Spacing Constants (matching iOS)

const CARD_PADDING = 20;
const CARD_CORNER_RADIUS = 12;
const CARD_SPACING = 12;
const SECTION_SPACING = 24;

// MARK: - Formatting Helpers

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }).format(v);
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

// MARK: - Draw Context

interface Ctx {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
  pageNum: number;
  logo: PDFImage | null;
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
  ctx.pageNum++;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN + 40) {
    newPage(ctx);
  }
}

// MARK: - Rounded Rect

function drawRoundedRect(
  page: PDFPage,
  x: number, y: number, w: number, h: number,
  _r: number,
  options: { fill?: ReturnType<typeof rgb>; borderColor?: ReturnType<typeof rgb>; borderWidth?: number }
) {
  // pdf-lib does not have native rounded rect, draw as filled rect + border lines
  if (options.fill) {
    page.drawRectangle({ x, y, width: w, height: h, color: options.fill });
  }
  if (options.borderColor && options.borderWidth) {
    page.drawRectangle({ x, y, width: w, height: h, borderColor: options.borderColor, borderWidth: options.borderWidth });
  }
}

// MARK: - Report Header (title, logo, user details)

function drawReportHeader(ctx: Ctx, title: string, data: ReportData) {
  // Title left, logo right
  ctx.page.drawText(title, { x: MARGIN, y: ctx.y, size: FONT_TITLE, font: ctx.bold, color: BLACK });

  if (ctx.logo) {
    const logoH = 70;
    const aspect = ctx.logo.width / ctx.logo.height;
    const logoW = logoH * aspect;
    ctx.page.drawImage(ctx.logo, {
      x: PAGE_W - MARGIN - logoW,
      y: ctx.y - logoH + 32,
      width: logoW,
      height: logoH,
    });
  }

  ctx.y -= 40;

  // Period
  const period = `${fmtDate(data.dateRange.start)} to ${fmtDate(data.dateRange.end)}`;
  ctx.page.drawText(period, { x: MARGIN, y: ctx.y, size: FONT_BODY, font: ctx.font, color: SECONDARY });
  ctx.y -= 20;

  // Divider
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.5, color: BORDER });
  ctx.y -= 24;

  // User details grid (2 columns, up to 2 rows)
  const ud = data.userDetails;
  if (ud) {
    const colW = CW / 2;
    const details: [string, string | null][] = [
      ["PREPARED FOR", ud.preparedFor],
      ["PROPERTY", ud.propertyName],
      ["PIC CODE", ud.picCode],
      ["LOCATION", ud.location],
    ];

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const idx = row * 2 + col;
        const [label, value] = details[idx];
        if (!value) continue;
        const x = MARGIN + col * colW;

        ctx.page.drawText(label, { x, y: ctx.y, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
        ctx.page.drawText(value, { x, y: ctx.y - 14, size: FONT_BODY, font: ctx.font, color: BLACK });
      }
      ctx.y -= 40;
    }

    ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.5, color: BORDER });
    ctx.y -= 24;
  }
}

// MARK: - Hero Card

function drawHeroCard(ctx: Ctx, label: string, value: string) {
  ensureSpace(ctx, 100);
  const cardH = 90;
  const cardY = ctx.y - cardH;

  drawRoundedRect(ctx.page, MARGIN, cardY, CW, cardH, CARD_CORNER_RADIUS, { fill: CARD_FILL, borderColor: BORDER, borderWidth: 1 });

  // Label centred
  const labelW = ctx.bold.widthOfTextAtSize(label, FONT_LABEL);
  ctx.page.drawText(label, { x: MARGIN + (CW - labelW) / 2, y: cardY + cardH - 28, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });

  // Value centred
  const valW = ctx.bold.widthOfTextAtSize(value, FONT_HERO);
  ctx.page.drawText(value, { x: MARGIN + (CW - valW) / 2, y: cardY + cardH - 64, size: FONT_HERO, font: ctx.bold, color: BLACK });

  ctx.y = cardY - SECTION_SPACING;
}

// MARK: - Executive Summary Card

function drawExecutiveSummary(ctx: Ctx, data: ReportData) {
  if (!data.executiveSummary) return;
  const es = data.executiveSummary;

  ensureSpace(ctx, 240);

  // Section label
  ctx.page.drawText("EXECUTIVE SUMMARY", { x: MARGIN, y: ctx.y, size: FONT_CAPTION, font: ctx.bold, color: TERTIARY });
  ctx.y -= 22;

  const hasChange = es.changeDollars != null && es.changePercent != null;
  const numRows = hasChange ? 3 : 2;

  const rows: [string, string][][] = [
    [["TOTAL PORTFOLIO VALUE", fmt(es.totalPortfolioValue)], ["TOTAL HEAD COUNT", es.totalHeadCount.toLocaleString()]],
    [["AVERAGE VALUE PER HEAD", fmt(es.averageValuePerHead)], ["VALUATION DATE", fmtDate(es.valuationDate)]],
  ];

  if (hasChange) {
    const sign = es.changeDollars! >= 0 ? "+" : "";
    const arrow = es.changeDollars! >= 0 ? "\u25B2" : "\u25BC";
    const changeText = `${arrow} ${sign}${fmt(es.changeDollars!)}  (${sign}${es.changePercent!.toFixed(1)}%)`;
    const sinceText = es.previousDate ? `since ${fmtDate(es.previousDate)}` : "";
    rows.push([["CHANGE SINCE LAST REPORT", changeText], ["", sinceText]]);
  }

  const rowHeight = 46;
  const verticalPad = 24;
  const cardH = verticalPad + numRows * rowHeight + verticalPad;
  const cardY = ctx.y - cardH;

  drawRoundedRect(ctx.page, MARGIN, cardY, CW, cardH, CARD_CORNER_RADIUS, { fill: CARD_FILL, borderColor: BORDER, borderWidth: 1 });

  let rowY = ctx.y - verticalPad;
  const colW = (CW - 40) / 2;

  for (const row of rows) {
    for (let col = 0; col < row.length; col++) {
      const [label, value] = row[col];
      if (!label && !value) continue;
      const x = MARGIN + CARD_PADDING + col * colW;

      if (label) {
        ctx.page.drawText(label, { x, y: rowY, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
      }
      if (value) {
        ctx.page.drawText(value, { x, y: rowY - 16, size: FONT_EXEC_VALUE, font: ctx.bold, color: BLACK });
      }
    }
    rowY -= rowHeight;
  }

  ctx.y = cardY - SECTION_SPACING;
}

// MARK: - Section Header

function drawSectionHeader(ctx: Ctx, title: string) {
  ensureSpace(ctx, 50);
  ctx.page.drawText(title, { x: MARGIN, y: ctx.y, size: FONT_SECTION, font: ctx.bold, color: BLACK });
  ctx.y -= 36;
}

// MARK: - Property Group Header

function drawPropertyHeader(ctx: Ctx, name: string) {
  ensureSpace(ctx, 30);
  ctx.y -= 12;
  ctx.page.drawText(name, { x: MARGIN, y: ctx.y, size: FONT_HEADLINE, font: ctx.bold, color: BLACK });
  ctx.y -= 24;
}

// MARK: - Herd Asset Card

function drawHerdCard(ctx: Ctx, h: ReportData["herdData"][0]) {
  const riskFields = buildRiskFields(h);
  const cardH = riskFields.length > 0 ? 170 : 130;
  ensureSpace(ctx, cardH + 16);

  const cardY = ctx.y - cardH;
  drawRoundedRect(ctx.page, MARGIN, cardY, CW, cardH, CARD_CORNER_RADIUS, { fill: CARD_FILL, borderColor: BORDER, borderWidth: 0.5 });

  const pad = CARD_PADDING;
  const innerW = CW - pad * 2;
  let iy = ctx.y - pad;

  // Header: name left, value right
  ctx.page.drawText(h.name, { x: MARGIN + pad, y: iy, size: FONT_HEADLINE, font: ctx.bold, color: BLACK });
  const valStr = fmt(h.netValue);
  const valW = ctx.bold.widthOfTextAtSize(valStr, FONT_VALUE);
  ctx.page.drawText(valStr, { x: PAGE_W - MARGIN - pad - valW, y: iy, size: FONT_VALUE, font: ctx.bold, color: BLACK });
  iy -= 22;

  // Category
  ctx.page.drawText(h.category, { x: MARGIN + pad, y: iy, size: FONT_CAPTION, font: ctx.font, color: SECONDARY });
  iy -= 28;

  // Stats grid: 4 columns
  const statW = innerW / 4;
  const labels = ["HEAD COUNT", "AGE", "WEIGHT", "PRICE"];
  const values = [
    `${h.headCount} head`,
    `${h.ageMonths} months`,
    `${h.weight.toFixed(0)} kg`,
    `$${h.pricePerKg.toFixed(2)}/kg`,
  ];

  for (let i = 0; i < 4; i++) {
    const sx = MARGIN + pad + i * statW;
    ctx.page.drawText(labels[i], { x: sx, y: iy, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
    ctx.page.drawText(values[i], { x: sx, y: iy - 14, size: FONT_BODY, font: ctx.font, color: BLACK });
  }
  iy -= 28;

  // Breeding/risk row
  if (riskFields.length > 0) {
    ctx.page.drawLine({
      start: { x: MARGIN + pad, y: iy },
      end: { x: PAGE_W - MARGIN - pad, y: iy },
      thickness: 0.5, color: BORDER,
    });
    iy -= 16;

    const riskW = innerW / Math.min(riskFields.length, 4);
    for (let i = 0; i < riskFields.length; i++) {
      const rx = MARGIN + pad + (i % 4) * riskW;
      ctx.page.drawText(riskFields[i].label, { x: rx, y: iy, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
      ctx.page.drawText(riskFields[i].value, { x: rx, y: iy - 14, size: FONT_BODY, font: ctx.font, color: SECONDARY });
    }
  }

  ctx.y = cardY - CARD_SPACING;
}

function buildRiskFields(h: ReportData["herdData"][0]): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [];
  if (h.breedPremiumOverride != null) {
    fields.push({ label: "BREED ADJ.", value: `${h.breedPremiumOverride >= 0 ? "+" : ""}${h.breedPremiumOverride}% vs. avg` });
  }
  if (h.breedingAccrual != null && h.breedingAccrual > 0) {
    fields.push({ label: "CALF ACCRUAL", value: fmt(h.breedingAccrual) });
  }
  if (h.dailyWeightGain > 0) {
    fields.push({ label: "DWG ALLOCATION", value: `${h.dailyWeightGain.toFixed(2)} kg/day` });
  }
  if (h.isBreeder && h.calvingRate > 0) {
    const pct = h.calvingRate > 1 ? h.calvingRate : h.calvingRate * 100;
    fields.push({ label: "CALVING %", value: `${pct.toFixed(0)}%` });
  }
  if (h.mortalityRate > 0) {
    const pct = h.mortalityRate > 1 ? h.mortalityRate : h.mortalityRate * 100;
    fields.push({ label: "MORTALITY", value: `${pct.toFixed(1)}% p.a.` });
  }
  return fields;
}

// MARK: - Sale Data Card (matching iOS drawSaleData)

function drawSaleCard(ctx: Ctx, s: ReportData["salesData"][0]) {
  const cardH = 120;
  ensureSpace(ctx, cardH + 16);

  const cardY = ctx.y - cardH;
  drawRoundedRect(ctx.page, MARGIN, cardY, CW, cardH, CARD_CORNER_RADIUS, { fill: CARD_FILL, borderColor: BORDER, borderWidth: 0.5 });

  const pad = CARD_PADDING;
  let iy = ctx.y - pad;
  const leftX = MARGIN + pad;
  const rightX = MARGIN + (CW * 0.55);

  // Header: date left, net value right
  ctx.page.drawText(fmtDate(s.date), { x: leftX, y: iy, size: FONT_HEADLINE, font: ctx.bold, color: BLACK });
  const valStr = fmt(s.netValue);
  const valW = ctx.bold.widthOfTextAtSize(valStr, FONT_VALUE);
  ctx.page.drawText(valStr, { x: PAGE_W - MARGIN - pad - valW, y: iy, size: FONT_VALUE, font: ctx.bold, color: BLACK });
  iy -= 22;

  // Subtitle: pricing type
  ctx.page.drawText(s.pricingType ?? "-", { x: leftX, y: iy, size: FONT_CAPTION, font: ctx.font, color: SECONDARY });
  iy -= 18;

  // 2-column grid: left side (HEAD COUNT, AVG WEIGHT), right side (PRICE)
  let leftY = iy;
  let rightY = iy;

  ctx.page.drawText("HEAD COUNT", { x: leftX, y: leftY, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
  leftY -= 14;
  ctx.page.drawText(`${s.headCount} head`, { x: leftX, y: leftY, size: FONT_BODY, font: ctx.font, color: BLACK });
  leftY -= 18;
  ctx.page.drawText("AVG WEIGHT", { x: leftX, y: leftY, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
  leftY -= 14;
  ctx.page.drawText(`${s.avgWeight.toFixed(0)} kg`, { x: leftX, y: leftY, size: FONT_BODY, font: ctx.font, color: BLACK });

  ctx.page.drawText("PRICE", { x: rightX, y: rightY, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
  rightY -= 14;
  ctx.page.drawText(`$${s.pricePerKg.toFixed(2)}/kg`, { x: rightX, y: rightY, size: FONT_BODY, font: ctx.font, color: BLACK });

  ctx.y = cardY - CARD_SPACING;
}

// MARK: - Saleyard Comparison Card (matching iOS drawSaleyardComparisonData)

function drawSaleyardCard(ctx: Ctx, s: ReportData["saleyardComparison"][0]) {
  const cardH = 120;
  ensureSpace(ctx, cardH + 16);

  const cardY = ctx.y - cardH;
  drawRoundedRect(ctx.page, MARGIN, cardY, CW, cardH, CARD_CORNER_RADIUS, { fill: CARD_FILL, borderColor: BORDER, borderWidth: 0.5 });

  const pad = CARD_PADDING;
  const innerW = CW - pad * 2;
  let iy = ctx.y - pad;
  const leftX = MARGIN + pad;

  // Header: saleyard name
  ctx.page.drawText(s.saleyardName, { x: leftX, y: iy, size: FONT_HEADLINE, font: ctx.bold, color: BLACK });
  iy -= 22;

  // Subtitle: head count
  ctx.page.drawText(`${s.totalHeadCount} head in portfolio`, { x: leftX, y: iy, size: FONT_CAPTION, font: ctx.font, color: SECONDARY });
  iy -= 18;

  // 3-column grid: AVG PRICE, MIN PRICE, MAX PRICE
  const col1X = leftX;
  const col2X = leftX + (innerW * 0.33);
  const col3X = leftX + (innerW * 0.66);

  ctx.page.drawText("AVG PRICE", { x: col1X, y: iy, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
  ctx.page.drawText("MIN PRICE", { x: col2X, y: iy, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
  ctx.page.drawText("MAX PRICE", { x: col3X, y: iy, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
  iy -= 14;

  ctx.page.drawText(`$${s.avgPrice.toFixed(2)}/kg`, { x: col1X, y: iy, size: FONT_BODY, font: ctx.font, color: BLACK });
  ctx.page.drawText(`$${s.minPrice.toFixed(2)}/kg`, { x: col2X, y: iy, size: FONT_BODY, font: ctx.font, color: BLACK });
  ctx.page.drawText(`$${s.maxPrice.toFixed(2)}/kg`, { x: col3X, y: iy, size: FONT_BODY, font: ctx.font, color: BLACK });

  ctx.y = cardY - CARD_SPACING;
}

// MARK: - Herd Composition Section (matching iOS legend table)

function drawHerdComposition(ctx: Ctx, composition: ReportData["herdComposition"]) {
  if (!composition || composition.length === 0) return;

  drawSectionHeader(ctx, "Herd Composition");

  // Table header
  const cols = [
    { text: "ASSET CLASS", width: 180 },
    { text: "VALUE", width: 110, align: "right" as const },
    { text: "HEAD COUNT", width: 90, align: "right" as const },
    { text: "%", width: 88, align: "right" as const },
  ];

  ensureSpace(ctx, 22);
  let x = MARGIN;
  for (const col of cols) {
    const tw = ctx.bold.widthOfTextAtSize(col.text, FONT_LABEL);
    const dx = col.align === "right" ? x + col.width - tw : x;
    ctx.page.drawText(col.text, { x: dx, y: ctx.y, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
    x += col.width;
  }
  ctx.y -= 6;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.3, color: BORDER });
  ctx.y -= 14;

  // Table rows
  for (const item of composition) {
    ensureSpace(ctx, 18);
    let rx = MARGIN;
    const rowData = [
      { text: item.assetClass, width: 180, align: "left" as const, isBold: false },
      { text: fmt(item.value), width: 110, align: "right" as const, isBold: false },
      { text: item.headCount.toLocaleString(), width: 90, align: "right" as const, isBold: false },
      { text: `${item.percentage.toFixed(1)}%`, width: 88, align: "right" as const, isBold: false },
    ];
    for (const col of rowData) {
      const f = col.isBold ? ctx.bold : ctx.font;
      const tw = f.widthOfTextAtSize(col.text, FONT_TABLE_ROW);
      const dx = col.align === "right" ? rx + col.width - tw : rx;
      ctx.page.drawText(col.text, { x: dx, y: ctx.y, size: FONT_TABLE_ROW, font: f, color: SECONDARY });
      rx += col.width;
    }
    ctx.y -= 18;
  }

  ctx.y -= CARD_SPACING;
}

// MARK: - Table Helpers (for advisor lens tables)

function drawTableHeader(ctx: Ctx, cols: { text: string; width: number; align?: "left" | "right" }[]) {
  ensureSpace(ctx, 22);
  let x = MARGIN;
  for (const col of cols) {
    const tw = ctx.bold.widthOfTextAtSize(col.text, FONT_LABEL);
    const dx = col.align === "right" ? x + col.width - tw : x;
    ctx.page.drawText(col.text, { x: dx, y: ctx.y, size: FONT_LABEL, font: ctx.bold, color: TERTIARY });
    x += col.width;
  }
  ctx.y -= 6;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.3, color: BORDER });
  ctx.y -= 14;
}

function drawTableRow(ctx: Ctx, cols: { text: string; width: number; align?: "left" | "right"; bold?: boolean }[]) {
  ensureSpace(ctx, 18);
  let x = MARGIN;
  for (const col of cols) {
    const f = col.bold ? ctx.bold : ctx.font;
    const tw = f.widthOfTextAtSize(col.text, FONT_TABLE_ROW);
    const dx = col.align === "right" ? x + col.width - tw : x;
    ctx.page.drawText(col.text, { x: dx, y: ctx.y, size: FONT_TABLE_ROW, font: f, color: col.bold ? BLACK : SECONDARY });
    x += col.width;
  }
  ctx.y -= 18;
}

// MARK: - Page Footer

function drawAllFooters(ctx: Ctx) {
  const pages = ctx.doc.getPages();
  const total = pages.length;
  const brandText = "Stockman's Wallet   |   Intelligent Livestock Valuation   |   www.stockmanswallet.com.au";

  for (let i = 0; i < total; i++) {
    const p = pages[i];

    // Divider
    p.drawLine({ start: { x: MARGIN, y: MARGIN - 14 }, end: { x: PAGE_W - MARGIN, y: MARGIN - 14 }, thickness: 0.3, color: BORDER });

    // Brand text left
    p.drawText(brandText, { x: MARGIN, y: MARGIN - 28, size: FONT_FOOTER, font: ctx.font, color: TERTIARY });

    // Page number right
    const pageText = `Page ${i + 1} of ${total}`;
    const pw = ctx.font.widthOfTextAtSize(pageText, FONT_FOOTER);
    p.drawText(pageText, { x: PAGE_W - MARGIN - pw, y: MARGIN - 28, size: FONT_FOOTER, font: ctx.font, color: TERTIARY });
  }
}

// MARK: - Asset Register

function drawAssetRegister(ctx: Ctx, data: ReportData) {
  drawHeroCard(ctx, "TOTAL PORTFOLIO VALUE", fmt(data.totalValue));
  drawExecutiveSummary(ctx, data);

  // Herd composition section (matching iOS composition page)
  if (data.herdComposition && data.herdComposition.length > 0) {
    drawHerdComposition(ctx, data.herdComposition);
  }

  drawSectionHeader(ctx, "Livestock Assets");

  // Group herds by property
  const byProperty = new Map<string, typeof data.herdData>();
  for (const h of data.herdData) {
    const key = h.propertyName ?? "Unassigned";
    const arr = byProperty.get(key) ?? [];
    arr.push(h);
    byProperty.set(key, arr);
  }

  for (const [propName, herds] of byProperty) {
    if (byProperty.size > 1) {
      drawPropertyHeader(ctx, propName);
    }
    for (const h of herds) {
      drawHerdCard(ctx, h);
    }
  }

  // Total row
  ensureSpace(ctx, 30);
  ctx.y -= 8;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.5, color: BORDER });
  ctx.y -= 16;

  const totalHead = data.herdData.reduce((s, h) => s + h.headCount, 0);
  ctx.page.drawText("TOTAL", { x: MARGIN, y: ctx.y, size: FONT_CAPTION, font: ctx.bold, color: BLACK });
  ctx.page.drawText(`${totalHead.toLocaleString()} head`, { x: MARGIN + 140, y: ctx.y, size: FONT_CAPTION, font: ctx.font, color: SECONDARY });
  const totalStr = fmt(data.totalValue);
  const totalW = ctx.bold.widthOfTextAtSize(totalStr, FONT_BODY);
  ctx.page.drawText(totalStr, { x: PAGE_W - MARGIN - totalW, y: ctx.y, size: FONT_BODY, font: ctx.bold, color: BLACK });
  ctx.y -= SECTION_SPACING;
}

// MARK: - Sales Summary

function drawSalesSummary(ctx: Ctx, data: ReportData) {
  drawHeroCard(ctx, "TOTAL SALES VALUE", fmt(data.totalSales));

  // Sales overview stats
  const totalGross = data.salesData.reduce((s, r) => s + r.grossValue, 0);
  const totalFreight = data.salesData.reduce((s, r) => s + r.freightCost, 0);

  drawSectionHeader(ctx, "Sales Overview");

  const overviewRows: [string, string][] = [
    ["Net Sales Revenue", fmt(data.totalSales)],
    ["Gross Sales", fmt(totalGross)],
    ["Total Freight", fmt(totalFreight)],
    ["Total Records", data.salesData.length.toString()],
  ];

  for (const [label, value] of overviewRows) {
    ensureSpace(ctx, 18);
    ctx.page.drawText(label, { x: MARGIN, y: ctx.y, size: FONT_BODY, font: ctx.font, color: SECONDARY });
    const vw = ctx.bold.widthOfTextAtSize(value, FONT_BODY);
    ctx.page.drawText(value, { x: MARGIN + 300 - vw + 100, y: ctx.y, size: FONT_BODY, font: ctx.bold, color: BLACK });
    ctx.y -= 18;
  }
  ctx.y -= CARD_SPACING;

  // Sales records as cards (matching iOS)
  drawSectionHeader(ctx, "Sales History");

  for (const s of data.salesData) {
    drawSaleCard(ctx, s);
  }
}

// MARK: - Saleyard Comparison

function drawSaleyardComparison(ctx: Ctx, data: ReportData) {
  if (data.saleyardComparison.length > 0) {
    drawHeroCard(ctx, "BEST AVERAGE PRICE", `$${data.saleyardComparison[0].avgPrice.toFixed(2)}/kg`);

    ensureSpace(ctx, 30);
    ctx.page.drawText(`Best Saleyard: ${data.saleyardComparison[0].saleyardName}`, {
      x: MARGIN, y: ctx.y, size: FONT_BODY, font: ctx.font, color: SECONDARY,
    });
    ctx.y -= 16;
    ctx.page.drawText(`${data.saleyardComparison.length} saleyards compared`, {
      x: MARGIN, y: ctx.y, size: FONT_CAPTION, font: ctx.font, color: TERTIARY,
    });
    ctx.y -= SECTION_SPACING;
  }

  drawSectionHeader(ctx, "Saleyard Price Comparison");

  for (const s of data.saleyardComparison) {
    drawSaleyardCard(ctx, s);
  }
}

// MARK: - Accountant Report

function drawAccountantReport(ctx: Ctx, data: ReportData) {
  // Portfolio summary
  if (data.executiveSummary) {
    drawSectionHeader(ctx, "Portfolio Summary");
    const stats: [string, string][] = [
      ["Total Portfolio Value", fmt(data.executiveSummary.totalPortfolioValue)],
      ["Total Head Count", data.executiveSummary.totalHeadCount.toLocaleString()],
      ["Sales Revenue (Period)", fmt(data.totalSales)],
    ];
    for (const [label, value] of stats) {
      ensureSpace(ctx, 18);
      ctx.page.drawText(label, { x: MARGIN, y: ctx.y, size: FONT_BODY, font: ctx.font, color: SECONDARY });
      const vw = ctx.bold.widthOfTextAtSize(value, FONT_BODY);
      ctx.page.drawText(value, { x: MARGIN + 300 - vw + 100, y: ctx.y, size: FONT_BODY, font: ctx.bold, color: BLACK });
      ctx.y -= 18;
    }
    ctx.y -= 16;
  }

  if (data.herdData.length > 0) {
    drawAssetRegister(ctx, data);
    ctx.y -= 16;
  }

  if (data.salesData.length > 0) {
    drawSalesSummary(ctx, data);
  }
}

// MARK: - Main Export

export async function generateReportPDF(
  data: ReportData,
  reportType: string,
  title: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // Embed standard fonts (pdf-lib does not support custom fonts without embedding)
  const font = await doc.embedFont("Helvetica");
  const bold = await doc.embedFont("Helvetica-Bold");

  doc.setTitle(title);
  doc.setCreator("Stockman's Wallet");
  doc.setProducer("Stockman's Wallet Web");

  // Embed logo
  let logo: PDFImage | null = null;
  try {
    const logoRes = await fetch("/images/sw-logo.png");
    if (logoRes.ok) {
      const logoBytes = await logoRes.arrayBuffer();
      logo = await doc.embedPng(new Uint8Array(logoBytes));
    }
  } catch {
    // Logo fetch failed, continue without it
  }

  const ctx: Ctx = { doc, font, bold, page: null as unknown as PDFPage, y: 0, pageNum: 0, logo };

  newPage(ctx);
  drawReportHeader(ctx, title, data);

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

  drawAllFooters(ctx);

  return doc.save();
}

// MARK: - Advisor Lens Report PDF

import type { AdvisorLensReportData, LensHerdSummary } from "@/lib/types/lens-report";

export async function generateAdvisorLensPDF(
  reportData: AdvisorLensReportData
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont("Helvetica");
  const bold = await doc.embedFont("Helvetica-Bold");

  const title = `Advisor Lens: ${reportData.lens_name}`;
  doc.setTitle(title);
  doc.setCreator("Stockman's Wallet");
  doc.setProducer("Stockman's Wallet Web");

  let logo: PDFImage | null = null;
  try {
    const logoRes = await fetch("/images/sw-logo.png");
    if (logoRes.ok) {
      const logoBytes = await logoRes.arrayBuffer();
      logo = await doc.embedPng(new Uint8Array(logoBytes));
    }
  } catch {
    // continue without logo
  }

  const ctx: Ctx = { doc, font, bold, page: null as unknown as PDFPage, y: 0, pageNum: 0, logo };
  newPage(ctx);

  // Title and logo
  ctx.page.drawText("Valuation Assessment", { x: MARGIN, y: ctx.y, size: FONT_LARGE_TITLE, font: bold, color: BLACK });
  if (logo) {
    const logoH = 70;
    const aspect = logo.width / logo.height;
    const logoW = logoH * aspect;
    ctx.page.drawImage(logo, {
      x: PAGE_W - MARGIN - logoW,
      y: ctx.y - logoH + 28,
      width: logoW,
      height: logoH,
    });
  }
  ctx.y -= 36;

  // Subtitle
  ctx.page.drawText(reportData.lens_name, { x: MARGIN, y: ctx.y, size: FONT_EXEC_VALUE, font: bold, color: SECONDARY });
  ctx.y -= 20;

  // Date and advisor/client
  const dateStr = new Date(reportData.generated_at).toLocaleDateString("en-AU", {
    day: "2-digit", month: "short", year: "numeric",
  });
  ctx.page.drawText(`Prepared by ${reportData.advisor_name} for ${reportData.client_name}  |  ${dateStr}`, {
    x: MARGIN, y: ctx.y, size: FONT_CAPTION, font, color: SECONDARY,
  });
  ctx.y -= 16;

  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.5, color: BORDER });
  ctx.y -= SECTION_SPACING;

  // Hero card: shaded value
  drawHeroCard(ctx, "SHADED PORTFOLIO VALUE (LENDING)", fmt(reportData.totals.shaded_value));

  // Summary stats
  drawSectionHeader(ctx, "Portfolio Summary");
  const summaryRows: [string, string][] = [
    ["Baseline Value", fmt(reportData.totals.baseline_value)],
    ["Adjusted Value", fmt(reportData.totals.adjusted_value)],
    ["Shaded Value", fmt(reportData.totals.shaded_value)],
    ["Total Head (Original)", reportData.totals.total_original_head.toLocaleString()],
    ["Total Head (Adjusted)", reportData.totals.total_head.toLocaleString()],
  ];
  for (const [label, value] of summaryRows) {
    ensureSpace(ctx, 18);
    ctx.page.drawText(label, { x: MARGIN, y: ctx.y, size: FONT_BODY, font, color: SECONDARY });
    const vw = bold.widthOfTextAtSize(value, FONT_BODY);
    ctx.page.drawText(value, { x: MARGIN + 300 - vw + 100, y: ctx.y, size: FONT_BODY, font: bold, color: BLACK });
    ctx.y -= 18;
  }
  ctx.y -= 16;

  // Per-herd breakdown table
  drawSectionHeader(ctx, "Individual Herd Assessments");

  const herdCols = [
    { text: "HERD", width: 120 },
    { text: "HEAD", width: 50, align: "right" as const },
    { text: "BASELINE", width: 90, align: "right" as const },
    { text: "ADJUSTED", width: 90, align: "right" as const },
    { text: "SHADING", width: 48, align: "right" as const },
    { text: "SHADED", width: 70, align: "right" as const },
  ];
  drawTableHeader(ctx, herdCols);

  for (const h of reportData.herds) {
    drawTableRow(ctx, [
      { text: h.herd_name.substring(0, 20), width: 120 },
      { text: h.head_count.toString(), width: 50, align: "right" },
      { text: fmt(h.baseline_value), width: 90, align: "right" },
      { text: fmt(h.adjusted_value), width: 90, align: "right" },
      { text: `${h.shading_percentage}%`, width: 48, align: "right" },
      { text: fmt(h.shaded_value), width: 70, align: "right", bold: true },
    ]);
  }

  // Total row
  ensureSpace(ctx, 30);
  ctx.y -= 4;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.5, color: BORDER });
  ctx.y -= 16;
  ctx.page.drawText("TOTAL", { x: MARGIN, y: ctx.y, size: FONT_CAPTION, font: bold, color: BLACK });
  const totalShadedStr = fmt(reportData.totals.shaded_value);
  const tsw = bold.widthOfTextAtSize(totalShadedStr, FONT_BODY);
  ctx.page.drawText(totalShadedStr, { x: PAGE_W - MARGIN - tsw, y: ctx.y, size: FONT_BODY, font: bold, color: BLACK });
  ctx.y -= SECTION_SPACING;

  // Per-herd detail cards with overrides and notes
  for (const h of reportData.herds) {
    drawLensHerdDetail(ctx, h);
  }

  // Narrative section
  if (reportData.narrative) {
    drawSectionHeader(ctx, "Valuation Assessment Narrative");
    drawNarrativeText(ctx, reportData.narrative);
  }

  drawAllFooters(ctx);
  return doc.save();
}

function drawLensHerdDetail(ctx: Ctx, h: LensHerdSummary) {
  ensureSpace(ctx, 140);

  const cardH = 120;
  const cardY = ctx.y - cardH;
  drawRoundedRect(ctx.page, MARGIN, cardY, CW, cardH, 8, { fill: CARD_FILL, borderColor: BORDER, borderWidth: 0.5 });

  let iy = cardY + cardH - 18;
  const px = MARGIN + 12;

  // Herd name and breed
  ctx.page.drawText(h.herd_name, { x: px, y: iy, size: 12, font: ctx.bold, color: BLACK });
  const breedStr = `${h.breed} ${h.category}  |  ${h.head_count} head  |  ${h.initial_weight} kg`;
  ctx.page.drawText(breedStr, { x: px + 160, y: iy, size: FONT_LABEL, font: ctx.font, color: SECONDARY });
  iy -= 18;

  // Overrides
  const overrides: string[] = [];
  if (h.overrides.breed_premium_override != null) overrides.push(`Breed Premium: ${h.overrides.breed_premium_override}%`);
  if (h.overrides.adwg_override != null) overrides.push(`DWG: ${h.overrides.adwg_override} kg/day`);
  if (h.overrides.calving_rate_override != null) overrides.push(`Calving Rate: ${Math.round(h.overrides.calving_rate_override * 100)}%`);
  if (h.overrides.mortality_rate_override != null) overrides.push(`Mortality: ${Math.round(h.overrides.mortality_rate_override * 100)}%`);
  if (h.overrides.head_count_adjustment != null) overrides.push(`Head Adj: ${h.overrides.head_count_adjustment > 0 ? "+" : ""}${h.overrides.head_count_adjustment}`);

  if (overrides.length > 0) {
    ctx.page.drawText("Overrides: " + overrides.join("  |  "), { x: px, y: iy, size: 8, font: ctx.font, color: SECONDARY });
    iy -= 14;
  }

  ctx.page.drawText(`Shading: ${h.shading_percentage}%`, { x: px, y: iy, size: 8, font: ctx.font, color: SECONDARY });
  iy -= 14;

  // Values row
  ctx.page.drawText(`Baseline: ${fmt(h.baseline_value)}`, { x: px, y: iy, size: FONT_LABEL, font: ctx.font, color: SECONDARY });
  ctx.page.drawText(`Adjusted: ${fmt(h.adjusted_value)}`, { x: px + 140, y: iy, size: FONT_LABEL, font: ctx.font, color: SECONDARY });
  ctx.page.drawText(`Shaded: ${fmt(h.shaded_value)}`, { x: px + 280, y: iy, size: FONT_LABEL, font: ctx.bold, color: BLACK });
  iy -= 16;

  // Notes (truncated)
  if (h.advisor_notes) {
    const notesStr = h.advisor_notes.substring(0, 120) + (h.advisor_notes.length > 120 ? "..." : "");
    ctx.page.drawText(`Notes: ${notesStr}`, { x: px, y: iy, size: 8, font: ctx.font, color: TERTIARY });
  }

  ctx.y = cardY - CARD_SPACING;
}

function drawNarrativeText(ctx: Ctx, narrative: string) {
  const lines = narrative.split("\n");
  const maxLineWidth = CW;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      ctx.y -= 8;
      continue;
    }

    // Check if heading (short, no period, starts with uppercase)
    const isHeading = trimmed.length < 80 && !trimmed.endsWith(".") && /^[A-Z]/.test(trimmed);

    if (isHeading) {
      ensureSpace(ctx, 30);
      ctx.y -= 8;
      ctx.page.drawText(trimmed, { x: MARGIN, y: ctx.y, size: FONT_CAPTION, font: ctx.bold, color: BLACK });
      ctx.y -= 18;
    } else {
      // Wrap long paragraphs
      const words = trimmed.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.font.widthOfTextAtSize(testLine, 10);

        if (testWidth > maxLineWidth && currentLine) {
          ensureSpace(ctx, 14);
          ctx.page.drawText(currentLine, { x: MARGIN, y: ctx.y, size: 10, font: ctx.font, color: SECONDARY });
          ctx.y -= 14;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        ensureSpace(ctx, 14);
        ctx.page.drawText(currentLine, { x: MARGIN, y: ctx.y, size: 10, font: ctx.font, color: SECONDARY });
        ctx.y -= 14;
      }
      ctx.y -= 4;
    }
  }
}
