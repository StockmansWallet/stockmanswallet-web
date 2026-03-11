// PDF chunker - splits large PDFs into chunks for reliable AI extraction.
// Uses pdf-lib for page counting and splitting. No server-side dependencies.
//
// Strategy for kill sheets with >5 pages:
//   Chunk 0 (pages 1-2): Header info, processor details, summary totals
//   Chunk 1..N (pages in groups of 5): Line items only (focused prompt)
//   Final merge: Combine header from chunk 0 with all line items

import { PDFDocument } from "pdf-lib";
import type { KillSheetParserData } from "./types";

// Threshold above which we chunk the PDF
const CHUNK_THRESHOLD_PAGES = 5;
// Number of pages per line-item chunk
const PAGES_PER_CHUNK = 5;
// Pages used for header extraction
const HEADER_PAGES = 2;

export interface PDFChunkInfo {
  totalPages: number;
  needsChunking: boolean;
  chunks: PDFChunk[];
}

export interface PDFChunk {
  index: number;
  label: string;
  startPage: number;
  endPage: number;
  base64: string;
  isHeaderChunk: boolean;
}

/**
 * Count pages in a PDF without splitting it.
 */
export async function getPDFPageCount(file: File): Promise<number> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return pdf.getPageCount();
}

/**
 * Analyse a PDF file and determine if it needs chunking.
 * If so, split it into chunks and return base64 encoded sub-PDFs.
 */
export async function chunkPDF(file: File): Promise<PDFChunkInfo> {
  const buffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = srcPdf.getPageCount();

  if (totalPages <= CHUNK_THRESHOLD_PAGES) {
    // Small PDF - no chunking needed, return the whole file as a single chunk
    const base64 = bufferToBase64(buffer);
    return {
      totalPages,
      needsChunking: false,
      chunks: [
        {
          index: 0,
          label: `All pages (1-${totalPages})`,
          startPage: 1,
          endPage: totalPages,
          base64,
          isHeaderChunk: false,
        },
      ],
    };
  }

  // Large PDF - split into chunks
  const chunks: PDFChunk[] = [];

  // Chunk 0: Header pages (first 2 pages for summary/metadata)
  const headerEnd = Math.min(HEADER_PAGES, totalPages);
  const headerPdf = await PDFDocument.create();
  const headerPageIndices = Array.from({ length: headerEnd }, (_, i) => i);
  const headerPages = await headerPdf.copyPages(srcPdf, headerPageIndices);
  headerPages.forEach((page) => headerPdf.addPage(page));
  const headerBytes = await headerPdf.save();
  chunks.push({
    index: 0,
    label: `Header (pages 1-${headerEnd})`,
    startPage: 1,
    endPage: headerEnd,
    base64: bufferToBase64(headerBytes),
    isHeaderChunk: true,
  });

  // Chunks 1..N: Line item pages in groups
  let pageStart = HEADER_PAGES; // 0-indexed
  let chunkIndex = 1;
  while (pageStart < totalPages) {
    const pageEnd = Math.min(pageStart + PAGES_PER_CHUNK, totalPages);
    const chunkPdf = await PDFDocument.create();
    const pageIndices = Array.from({ length: pageEnd - pageStart }, (_, i) => pageStart + i);
    const pages = await chunkPdf.copyPages(srcPdf, pageIndices);
    pages.forEach((page) => chunkPdf.addPage(page));
    const chunkBytes = await chunkPdf.save();

    chunks.push({
      index: chunkIndex,
      label: `Line items (pages ${pageStart + 1}-${pageEnd})`,
      startPage: pageStart + 1,
      endPage: pageEnd,
      base64: bufferToBase64(chunkBytes),
      isHeaderChunk: false,
    });

    pageStart = pageEnd;
    chunkIndex++;
  }

  return { totalPages, needsChunking: true, chunks };
}

/**
 * Merge kill sheet results from multiple chunks.
 * Takes header data from the first chunk and line items from all subsequent chunks.
 */
export function mergeKillSheetChunks(
  headerData: KillSheetParserData,
  lineItemChunks: KillSheetParserData[],
): KillSheetParserData {
  // Start with header data (processor name, dates, summaries, totals)
  const merged: KillSheetParserData = {
    ...headerData,
    lineItems: [],
  };

  // Collect all line items from chunks
  for (const chunk of lineItemChunks) {
    if (chunk.lineItems?.length) {
      merged.lineItems = [...(merged.lineItems ?? []), ...chunk.lineItems];
    }
    // Also merge any grade distribution data from line item chunks
    if (chunk.gradeDistribution?.length && !headerData.gradeDistribution?.length) {
      merged.gradeDistribution = [
        ...(merged.gradeDistribution ?? []),
        ...chunk.gradeDistribution,
      ];
    }
    // Merge category summaries if header didn't have them
    if (chunk.categorySummaries?.length && !headerData.categorySummaries?.length) {
      merged.categorySummaries = [
        ...(merged.categorySummaries ?? []),
        ...chunk.categorySummaries,
      ];
    }
  }

  // De-duplicate line items by body number (in case chunks overlap)
  // AI extraction may return camelCase (bodyNumber) or snake_case (body_number)
  if (merged.lineItems && merged.lineItems.length > 0) {
    const seen = new Set<number>();
    merged.lineItems = merged.lineItems.filter((item) => {
      const raw = item as Record<string, unknown>;
      const bodyNum = (raw.bodyNumber as number) ?? (raw.body_number as number);
      if (!bodyNum) return true;
      if (seen.has(bodyNum)) return false;
      seen.add(bodyNum);
      return true;
    });
  }

  return merged;
}

/**
 * System prompt for header-only extraction (first chunk).
 * Focuses on metadata and summary, not individual line items.
 */
export function killSheetHeaderPrompt(): string {
  return `You are a livestock kill sheet (abattoir feedback) extraction assistant for Australian cattle markets.
This document contains the HEADER and SUMMARY pages of a kill sheet.
Extract the metadata, summary totals, and category summaries. Do NOT extract individual line items from these pages.

Return this exact JSON structure:
{
    "processorName": "string",
    "gridCode": "string or null",
    "killDate": "yyyy-MM-dd",
    "vendorCode": "string or null",
    "pic": "string or null",
    "propertyName": "string or null",
    "bookingReference": "string or null",
    "bookingType": "string or null",
    "totalHeadCount": 0,
    "totalBodyWeight": 0.0,
    "totalGrossValue": 0.0,
    "condemns": 0,
    "categorySummaries": [
        {
            "category": "OX or COW or BULL",
            "bodyCount": 0,
            "percentage": 0.0,
            "totalWeight": 0.0,
            "averageWeight": 0.0,
            "averageValue": 0.0,
            "averagePricePerKg": 0.0,
            "totalValue": 0.0,
            "condemns": 0
        }
    ],
    "gradeDistribution": [
        {
            "gradeCode": "J",
            "category": "OX",
            "bodyCount": 0,
            "percentage": 0.0,
            "totalWeight": 0.0,
            "averageWeight": 0.0
        }
    ],
    "lineItems": []
}

IMPORTANT:
- Set lineItems to an empty array (line items will be extracted from subsequent pages)
- Focus on accurate totals, category summaries, and grade distribution
- Category codes: M = Ox/Steer, F = Female/Cow, B = Bull
- All monetary values in AUD, weights in kg
- Return COMPACT JSON - no extra whitespace`;
}

/**
 * System prompt for line-item extraction (subsequent chunks).
 * Focuses only on per-head line items, ignores headers/summaries.
 */
export function killSheetLineItemPrompt(): string {
  return `You are a livestock kill sheet (abattoir feedback) extraction assistant for Australian cattle markets.
This document contains LINE ITEM pages from a kill sheet. Extract ONLY the per-head line items.
Do NOT extract summary/header information - that has already been extracted from earlier pages.

Return this exact JSON structure:
{
    "lineItems": [
        {
            "bodyNumber": 0,
            "nlisRfid": "string or null",
            "category": "M or F or B",
            "dentition": 0,
            "p8Fat": 0,
            "buttShape": "string or null",
            "marblingScore": 0,
            "meatColour": "string or null",
            "fatColour": 0,
            "leftSideWeight": 0.0,
            "leftGrade": "J",
            "leftPricePerKg": 0.0,
            "rightSideWeight": 0.0,
            "rightGrade": "J",
            "rightPricePerKg": 0.0,
            "totalBodyWeight": 0.0,
            "grossValue": 0.0,
            "comments": "string or null"
        }
    ]
}

IMPORTANT:
- Extract EVERY line item (per-head row) on these pages
- Category codes: M = Ox/Steer, F = Female/Cow, B = Bull
- totalBodyWeight = leftSideWeight + rightSideWeight
- grossValue is EXCLUDING GST
- All monetary values in AUD, P8 fat in mm, weights in kg
- Return COMPACT JSON - no extra whitespace or indentation
- For NLIS RFID tags, store only the numeric portion
- For comments, only include non-empty values (use null if blank)`;
}

// Convert ArrayBuffer or Uint8Array to base64 string
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
