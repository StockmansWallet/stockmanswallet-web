// Grid IQ extraction service - handles file upload, parsing, and AI extraction
// Calls grid-iq-parser Edge Function for structured files (Excel, CSV, TXT)
// Calls claude-proxy Edge Function for images/PDFs requiring AI interpretation

import { createClient } from "@/lib/supabase/client";
import type {
  ParserResponse,
  ExtractionResult,
  GridParserData,
  KillSheetParserData,
  HeadCountReconciliation,
} from "./types";
import { compressImage, isCompressibleImage } from "./image-utils";
import {
  chunkPDF,
  mergeKillSheetChunks,
  killSheetHeaderPrompt,
  killSheetLineItemPrompt,
} from "./pdf-chunker";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

// Text file extensions that can be read as plain text for AI extraction
const TEXT_EXTENSIONS = new Set(["csv", "txt", "tsv"]);

// File extensions that go through grid-iq-parser for structured parsing
const PARSER_EXTENSIONS = new Set(["xlsx", "xls", "csv", "txt", "tsv"]);

/**
 * Extract grid or kill sheet data from an uploaded file.
 * Routes to the appropriate Edge Function based on file type.
 */
export async function extractDocument(
  file: File,
  uploadType: "grid" | "killsheet"
): Promise<ExtractionResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  // Get auth session
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  // Route by file type
  if (PARSER_EXTENSIONS.has(ext)) {
    // Structured files - parse directly via grid-iq-parser (no AI needed)
    return await extractViaParser(file, uploadType, session.access_token);
  } else if (ext === "pdf") {
    // PDFs - try text extraction first via parser, fall back to AI vision
    return await extractPDF(file, uploadType, session.access_token);
  } else {
    // Images (jpg, png, heic) - always need AI vision
    return await extractViaAI(file, uploadType, session.access_token);
  }
}

/**
 * Send structured file to grid-iq-parser Edge Function for direct parsing.
 * Used for Excel, CSV, and TXT files.
 * Falls back to AI extraction if parser returns empty data.
 */
async function extractViaParser(
  file: File,
  uploadType: "grid" | "killsheet",
  accessToken: string
): Promise<ExtractionResult> {
  const base64 = await fileToBase64(file);

  const response = await callGridIQParser(
    { file_data: base64, file_name: file.name },
    accessToken
  );

  if (response.error) {
    throw new Error(response.error);
  }

  // If parser explicitly says AI is needed and has text content, use AI
  if (response.requires_ai && response.text_content) {
    console.log("Grid IQ: Parser requires AI, using text fallback");
    return await extractViaTextAI(response.text_content, uploadType, accessToken);
  }

  if (response.requires_ai) {
    throw new Error(
      "This file format requires AI extraction. Please try a different format or use the iOS app."
    );
  }

  const result = buildResult(response, uploadType, false);

  // Check if parser returned empty data - fall back to AI if text content available
  const isEmpty = isExtractionEmpty(result);
  if (isEmpty && response.text_content) {
    console.warn("Grid IQ: Parser returned empty data, falling back to AI extraction");
    return await extractViaTextAI(response.text_content, uploadType, accessToken);
  }

  return result;
}

/**
 * Handle PDF files - chunk large kill sheet PDFs, send smaller ones directly.
 * Grids are always sent as a single document (they're rarely multi-page).
 */
async function extractPDF(
  file: File,
  uploadType: "grid" | "killsheet",
  accessToken: string,
  onProgress?: (message: string) => void
): Promise<ExtractionResult> {
  // Grids: always single-shot extraction
  if (uploadType === "grid") {
    return await extractViaAI(file, uploadType, accessToken);
  }

  // Kill sheets: check if chunking is needed
  const chunkInfo = await chunkPDF(file);

  if (!chunkInfo.needsChunking) {
    // Small PDF - extract as single document
    return await extractViaAI(file, uploadType, accessToken);
  }

  // Large PDF - chunked extraction
  console.log(`Grid IQ: PDF has ${chunkInfo.totalPages} pages, splitting into ${chunkInfo.chunks.length} chunks`);
  onProgress?.(`Processing ${chunkInfo.totalPages}-page PDF in ${chunkInfo.chunks.length} chunks...`);

  // Step 1: Extract header/summary from first chunk
  const headerChunk = chunkInfo.chunks[0];
  onProgress?.(`Extracting header and summaries (pages 1-${headerChunk.endPage})...`);

  const headerData = await extractChunkViaAI(
    headerChunk.base64,
    killSheetHeaderPrompt(),
    accessToken,
  );
  const headerParsed = JSON.parse(extractJSON(headerData)) as KillSheetParserData;

  // Step 2: Extract line items from remaining chunks
  const lineItemChunks: KillSheetParserData[] = [];
  const dataChunks = chunkInfo.chunks.filter((c) => !c.isHeaderChunk);

  for (const chunk of dataChunks) {
    onProgress?.(`Extracting line items (pages ${chunk.startPage}-${chunk.endPage})...`);
    console.log(`Grid IQ: Processing chunk ${chunk.index} - ${chunk.label}`);

    const chunkData = await extractChunkViaAI(
      chunk.base64,
      killSheetLineItemPrompt(),
      accessToken,
    );
    const chunkParsed = JSON.parse(extractJSON(chunkData)) as KillSheetParserData;
    lineItemChunks.push(chunkParsed);
  }

  // Step 3: Merge all chunks
  onProgress?.("Merging extracted data...");
  const merged = mergeKillSheetChunks(headerParsed, lineItemChunks);

  const result: ExtractionResult = {
    documentType: "killsheet",
    confidence: 0.85,
    parsedViaAI: true,
    killSheetData: merged,
  };

  if (result.killSheetData) {
    result.reconciliation = reconcileHeadCount(result.killSheetData);
  }

  console.log(
    `Grid IQ: Chunked extraction complete - ${merged.lineItems?.length ?? 0} line items from ${chunkInfo.totalPages} pages`
  );

  return result;
}

/**
 * Extract data from image/PDF using Claude AI via claude-proxy Edge Function.
 */
async function extractViaAI(
  file: File,
  uploadType: "grid" | "killsheet",
  accessToken: string
): Promise<ExtractionResult> {
  // Compress images to reduce cost and latency (mirrors iOS normaliseImageData)
  let base64: string;
  if (isCompressibleImage(file)) {
    base64 = await compressImage(file);
  } else {
    base64 = await fileToBase64(file);
  }
  const mediaType = isCompressibleImage(file) ? "image/jpeg" : detectMediaType(file);

  const systemPrompt =
    uploadType === "grid" ? gridSystemPrompt() : killSheetSystemPrompt();

  const isDocument = mediaType === "application/pdf";

  // Build Claude API request body
  const sourceBlock: Record<string, unknown> = {
    type: isDocument ? "document" : "image",
    source: {
      type: "base64",
      media_type: mediaType,
      data: base64,
    },
  };

  const requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: uploadType === "grid" ? 32768 : 16384,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          sourceBlock,
          {
            type: "text",
            text: "Extract all data from this document and return the JSON.",
          },
        ],
      },
    ],
    anthropic_beta: isDocument ? "pdfs-2024-09-25" : "",
    purpose: uploadType === "grid" ? "grid-iq-vision" : "grid-iq-vision",
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(`${supabaseUrl}/functions/v1/claude-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Claude proxy error:", res.status, errorText);
    if (res.status === 413)
      throw new Error(
        "File is too large. Please try a smaller image or compress the PDF."
      );
    if (res.status === 429)
      throw new Error(
        "Too many requests. Please wait a moment and try again."
      );
    throw new Error(`Extraction failed (HTTP ${res.status}). Please try again.`);
  }

  const data = await res.json();
  const textContent = data.content?.[0]?.text;
  const wasTruncated = data.stop_reason === "max_tokens";

  if (!textContent) {
    throw new Error("No response from AI. Please try again.");
  }

  // Extract JSON from response (may be wrapped in markdown fences)
  const jsonString = extractJSON(textContent);
  const parsed = JSON.parse(jsonString);

  // Build result based on upload type
  const result: ExtractionResult = {
    documentType: uploadType,
    confidence: 0.85,
    parsedViaAI: true,
    wasTruncated,
  };

  if (uploadType === "grid") {
    result.gridData = parsed as GridParserData;
  } else {
    result.killSheetData = parsed as KillSheetParserData;
    // Head count reconciliation for kill sheets
    if (result.killSheetData) {
      result.reconciliation = reconcileHeadCount(result.killSheetData);
    }
  }

  return result;
}

/**
 * Check if an extraction result has no meaningful data.
 */
function isExtractionEmpty(result: ExtractionResult): boolean {
  if (result.documentType === "grid") {
    return !result.gridData?.entries?.length;
  }
  if (result.documentType === "killsheet") {
    const ks = result.killSheetData;
    return !ks?.lineItems?.length && (ks?.totalHeadCount ?? 0) === 0;
  }
  return true;
}

/**
 * Extract data from a single PDF chunk using a specific system prompt.
 * Used by the chunked PDF extraction pipeline.
 */
async function extractChunkViaAI(
  base64: string,
  systemPrompt: string,
  accessToken: string,
): Promise<string> {
  const requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: 16384,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: "Extract all data from this document and return the JSON.",
          },
        ],
      },
    ],
    anthropic_beta: "pdfs-2024-09-25",
    purpose: "grid-iq-vision",
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(`${supabaseUrl}/functions/v1/claude-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Claude proxy error (chunk):", res.status, errorText);
    if (res.status === 429)
      throw new Error("Too many requests. Please wait a moment and try again.");
    throw new Error(`Chunk extraction failed (HTTP ${res.status}). Please try again.`);
  }

  const data = await res.json();
  const textContent = data.content?.[0]?.text;

  if (!textContent) {
    throw new Error("No response from AI for this chunk. Please try again.");
  }

  return textContent;
}

/**
 * Extract data from CSV/text content using Claude AI via claude-proxy.
 * Used as fallback when structured parser returns empty results.
 */
async function extractViaTextAI(
  textContent: string,
  uploadType: "grid" | "killsheet",
  accessToken: string
): Promise<ExtractionResult> {
  const systemPrompt =
    uploadType === "grid" ? gridSystemPrompt() : killSheetSystemPrompt();

  // Truncate text to fit within token limits (approx 4 chars per token)
  const maxChars = uploadType === "grid" ? 80000 : 40000;
  const truncatedText = textContent.length > maxChars
    ? textContent.substring(0, maxChars) + "\n\n[Content truncated]"
    : textContent;

  const requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: uploadType === "grid" ? 32768 : 16384,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Extract all data from this ${uploadType === "grid" ? "processor grid" : "kill sheet"} spreadsheet data and return the JSON.\n\n${truncatedText}`,
      },
    ],
    purpose: "grid-iq-text",
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(`${supabaseUrl}/functions/v1/claude-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Claude proxy error (text fallback):", res.status, errorText);
    if (res.status === 429)
      throw new Error("Too many requests. Please wait a moment and try again.");
    throw new Error(`AI extraction failed (HTTP ${res.status}). Please try again.`);
  }

  const data = await res.json();
  const responseText = data.content?.[0]?.text;
  const wasTruncated = data.stop_reason === "max_tokens";

  if (!responseText) {
    throw new Error("No response from AI. Please try again.");
  }

  const jsonString = extractJSON(responseText);
  const parsed = JSON.parse(jsonString);

  const result: ExtractionResult = {
    documentType: uploadType,
    confidence: 0.85,
    parsedViaAI: true,
    wasTruncated,
  };

  if (uploadType === "grid") {
    result.gridData = parsed as GridParserData;
  } else {
    result.killSheetData = parsed as KillSheetParserData;
    if (result.killSheetData) {
      result.reconciliation = reconcileHeadCount(result.killSheetData);
    }
  }

  return result;
}

// Build ExtractionResult from parser response
function buildResult(
  response: ParserResponse,
  uploadType: "grid" | "killsheet",
  parsedViaAI: boolean
): ExtractionResult {
  const result: ExtractionResult = {
    documentType: response.document_type === "unknown" ? uploadType : response.document_type,
    confidence: response.confidence,
    parsedViaAI,
  };

  if (result.documentType === "grid") {
    result.gridData = response.data as GridParserData;
  } else {
    result.killSheetData = response.data as KillSheetParserData;
    // Head count reconciliation for kill sheets
    if (result.killSheetData) {
      result.reconciliation = reconcileHeadCount(result.killSheetData);
    }
  }

  // Surface document type mismatch to user (not just console.warn)
  if (response.document_type !== "unknown") {
    result.detectedType = response.document_type;
    if (response.document_type !== uploadType) {
      result.typeMismatch = true;
      console.warn(
        `Grid IQ: File classified as ${response.document_type} but user selected ${uploadType}`
      );
    }
  }

  return result;
}

// Head count reconciliation - compare summary total vs extracted line items
function reconcileHeadCount(
  data: KillSheetParserData
): HeadCountReconciliation {
  const summaryHeadCount = data.totalHeadCount || 0;
  const extractedLineItemCount = data.lineItems?.length || 0;

  // Summary-only kill sheets (e.g. JBS Abattoir Feedback) have category totals
  // but no per-head line items. This is expected, not a mismatch.
  const isSummaryOnly = extractedLineItemCount === 0 && summaryHeadCount > 0 &&
    (data.categorySummaries?.length ?? 0) > 0;

  const isMatched = isSummaryOnly || summaryHeadCount === extractedLineItemCount;
  const difference = Math.abs(summaryHeadCount - extractedLineItemCount);

  let message = "";
  if (isSummaryOnly) {
    message = `Summary-only kill sheet: ${summaryHeadCount} head across ${data.categorySummaries?.length ?? 0} categories. No per-head line items in this format.`;
  } else if (!isMatched) {
    if (extractedLineItemCount < summaryHeadCount) {
      message = `The kill sheet summary reports ${summaryHeadCount} head, but only ${extractedLineItemCount} line items were extracted. ${difference} records may be missing.`;
    } else {
      message = `The kill sheet summary reports ${summaryHeadCount} head, but ${extractedLineItemCount} line items were extracted. There may be duplicate records.`;
    }
  }

  return { summaryHeadCount, extractedLineItemCount, isMatched, difference, message };
}

// Call grid-iq-parser Edge Function
async function callGridIQParser(
  body: Record<string, unknown>,
  accessToken: string
): Promise<ParserResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(`${supabaseUrl}/functions/v1/grid-iq-parser`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("grid-iq-parser error:", res.status, errorText);
    throw new Error(
      `File parsing failed (HTTP ${res.status}). Please try a different file.`
    );
  }

  return res.json();
}

// Convert File to base64 string
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Detect media type from file
function detectMediaType(file: File): string {
  const type = file.type;
  if (type === "image/jpeg" || type === "image/jpg") return "image/jpeg";
  if (type === "image/png") return "image/png";
  if (type === "application/pdf") return "application/pdf";
  // Default to jpeg for unknown image types (heic, webp, etc)
  return "image/jpeg";
}

// Extract JSON from potentially markdown-wrapped response
function extractJSON(text: string): string {
  let cleaned = text;

  // Strip markdown code fences
  cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  cleaned = cleaned.trim();

  // Extract JSON object if surrounded by text
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

// System prompts - kept in sync with iOS GridIQExtractionService
function gridSystemPrompt(): string {
  return `You are a livestock processor grid extraction assistant for Australian cattle markets.
Extract ALL data from this processor grid and return ONLY valid JSON.

Return this exact JSON structure:
{
    "processorName": "string",
    "gridCode": "string or null",
    "contactName": "string or null",
    "contactPhone": "string or null",
    "contactEmail": "string or null",
    "gridDate": "yyyy-MM-dd",
    "expiryDate": "yyyy-MM-dd or null",
    "location": "string or null",
    "notes": "string - any rules, max weights, payment terms, residue warnings",
    "entries": [
        {
            "gradeCode": "e.g. J, YO, M, Q",
            "category": "e.g. Grass Trade Yearling Steer, Ox, Cow, Bull",
            "fatRange": "e.g. 5-22",
            "dentitionRange": "e.g. 0-6",
            "shapeRange": "e.g. A-C",
            "weightBandPrices": [
                {"weightBandKg": 300.0, "weightBandLabel": "300+", "pricePerKg": 7.05}
            ]
        }
    ]
}

IMPORTANT:
- Store weight band values EXACTLY as shown on the grid - do NOT convert or double them
- weightBandKg should be the numeric value of the weight band header (e.g. 300, 320, 340)
- weightBandLabel should be the header text (e.g. "300+", "320+", "340+")
- Extract EVERY grade row and EVERY weight band price column
- Grade codes should be stored verbatim as shown on the grid
- Category should describe what the grade represents (e.g., "Yearling Steer", "Cow")
- Fat range, dentition range, and shape range as shown on the grid
- Prices are $/kg HSCW (Hot Standard Carcase Weight)
- All monetary values in AUD
- Keep the notes field SHORT - summarise key rules only, do not include the full text
- Return COMPACT JSON - no extra whitespace or indentation. Minimise output size.`;
}

function killSheetSystemPrompt(): string {
  return `You are a livestock kill sheet (abattoir feedback) extraction assistant for Australian cattle markets.
Extract ALL data from this kill sheet and return ONLY valid JSON.

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
- Category codes: M = Ox/Steer, F = Female/Cow, B = Bull
- totalBodyWeight = leftSideWeight + rightSideWeight
- grossValue is EXCLUDING GST
- Extract EVERY line item (per-head row)
- Extract ALL category summaries (OX, COW, BULL)
- Grade distribution should include ALL grade codes found
- All monetary values in AUD
- P8 fat in mm, weights in kg
- Return COMPACT JSON - no extra whitespace or indentation. Minimise output size.
- For NLIS RFID tags, store only the numeric portion (omit leading spaces)
- For comments, only include non-empty values (use null if blank)`;
}
