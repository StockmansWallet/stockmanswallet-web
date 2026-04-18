"use server";

// Server actions for saving Grid IQ extraction results (processor grids and
// kill sheets) to Supabase. The uploader UI used to insert directly from the
// browser with `as any` casts; this moves the DB writes server-side with Zod
// validation so arbitrary payloads can no longer reach the tables even if the
// client is tampered with.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deriveSexFromCategory } from "@/lib/grid-iq/category-sex";
import type { GridParserData, KillSheetParserData } from "@/lib/grid-iq/types";

type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Normalise date strings to YYYY-MM-DD for Postgres. Accepts Australian
// DD/MM/YYYY, ambiguous numeric dates, or ISO strings.
function normaliseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split("T")[0];
  const slashParts = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (slashParts) {
    const a = parseInt(slashParts[1], 10);
    const b = parseInt(slashParts[2], 10);
    const year = slashParts[3];
    if (a > 12) return `${year}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    if (b > 12) return `${year}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    return `${year}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }
  return s;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// Stamp a fresh UUID on every entry. iOS Codable decodes these JSONB entries
// into structs with a mandatory `id: UUID`, so records written without ids
// would fail to sync down to the iOS client.
function withIds<T extends Record<string, unknown>>(entries: T[]): (T & { id: string })[] {
  return entries.map((entry) => ({ id: crypto.randomUUID(), ...entry }));
}

// ---------------------------------------------------------------------------
// Processor Grid
// ---------------------------------------------------------------------------

const weightBandPriceSchema = z.object({
  weightBandKg: z.number(),
  weightBandLabel: z.string(),
  pricePerKg: z.number(),
});

const gridEntrySchema = z.object({
  gradeCode: z.string(),
  category: z.string(),
  gender: z.string().nullable(),
  fatRange: z.string().nullable(),
  dentitionRange: z.string().nullable(),
  shapeRange: z.string().nullable(),
  weightBandPrices: z.array(weightBandPriceSchema),
  sourceSheet: z.string().optional(),
});

const gridSaveSchema = z.object({
  recordName: z.string().min(1).max(200).nullable(),
  sourceFileName: z.string().max(500).nullable(),
  processorId: z.string().uuid().nullable(),
  gridData: z.object({
    processorName: z.string().nullable(),
    gridCode: z.string().nullable(),
    gridDate: z.string().nullable(),
    expiryDate: z.string().nullable(),
    contactName: z.string().nullable(),
    contactPhone: z.string().nullable(),
    contactEmail: z.string().nullable(),
    location: z.string().nullable(),
    notes: z.string().nullable(),
    entries: z.array(gridEntrySchema),
  }),
});

export interface ProcessorGridSaveInput {
  recordName: string | null;
  sourceFileName: string | null;
  processorId: string | null;
  gridData: GridParserData;
}

export async function saveProcessorGrid(
  input: ProcessorGridSaveInput
): Promise<SaveResult> {
  const parsed = gridSaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid grid payload" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { recordName, sourceFileName, processorId, gridData } = parsed.data;
  const effectiveProcessor = gridData.processorName || "Unknown Processor";
  const id = crypto.randomUUID();

  const { error } = await supabase.from("processor_grids").insert({
    id,
    user_id: user.id,
    processor_id: processorId,
    processor_name: effectiveProcessor,
    grid_name: recordName || `${effectiveProcessor} - Grid`,
    source_file_name: sourceFileName,
    grid_code: gridData.gridCode,
    grid_date: normaliseDate(gridData.gridDate) ?? today(),
    expiry_date: normaliseDate(gridData.expiryDate),
    contact_name: gridData.contactName,
    contact_phone: gridData.contactPhone,
    contact_email: gridData.contactEmail,
    location: gridData.location,
    notes: gridData.notes,
    entries: withIds(
      gridData.entries.map((entry) => ({
        ...entry,
        weightBandPrices: withIds(entry.weightBandPrices),
      }))
    ),
  });

  if (error) {
    console.error("saveProcessorGrid insert failed:", error);
    return { ok: false, error: "Could not save grid. Please try again." };
  }

  revalidatePath("/dashboard/tools/grid-iq");
  revalidatePath("/dashboard/tools/grid-iq/library");
  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// Kill Sheet
// ---------------------------------------------------------------------------

const killSheetLineItemSchema = z
  .object({
    body_number: z.number().optional(),
    hscw_kg: z.number().optional(),
    left_weight: z.number().optional(),
    right_weight: z.number().optional(),
    left_grade: z.string().optional(),
    right_grade: z.string().optional(),
    grade: z.string().optional(),
    p8_fat_mm: z.number().optional(),
    dentition: z.number().optional(),
    category: z.string().optional(),
    sex: z.enum(["Male", "Female", "Unknown"]).optional(),
    price_per_kg: z.number().optional(),
    gross_value: z.number().optional(),
    butt_shape: z.string().optional(),
    marbling: z.number().optional(),
    meat_colour: z.string().optional(),
    fat_colour: z.number().optional(),
    nlis_rfid: z.string().optional(),
    comments: z.string().optional(),
  })
  .passthrough();

const categorySummarySchema = z
  .object({
    category: z.string(),
    body_count: z.number(),
    percentage: z.number(),
    total_weight: z.number(),
    average_weight: z.number(),
    average_value: z.number(),
    average_price_per_kg: z.number(),
    total_value: z.number(),
    condemns: z.number(),
  })
  .passthrough();

const gradeDistributionSchema = z
  .object({
    grade_code: z.string(),
    category: z.string(),
    body_count: z.number(),
    percentage: z.number(),
    total_weight: z.number(),
    average_weight: z.number(),
  })
  .passthrough();

const killSheetSaveSchema = z.object({
  recordName: z.string().min(1).max(200).nullable(),
  sourceFileName: z.string().max(500).nullable(),
  processorId: z.string().uuid().nullable(),
  killSheetData: z.object({
    processorName: z.string().nullable(),
    killDate: z.string().nullable(),
    vendorCode: z.string().nullable(),
    pic: z.string().nullable(),
    propertyName: z.string().nullable(),
    bookingReference: z.string().nullable(),
    bookingType: z.string().nullable(),
    totalHeadCount: z.number(),
    totalBodyWeight: z.number(),
    totalGrossValue: z.number(),
    averageBodyWeight: z.number().optional(),
    averagePricePerKg: z.number().optional(),
    condemns: z.number(),
    lineItems: z.array(killSheetLineItemSchema),
    categorySummaries: z.array(categorySummarySchema).optional(),
    gradeDistribution: z.array(gradeDistributionSchema).optional(),
  }),
});

export interface KillSheetSaveInput {
  recordName: string | null;
  sourceFileName: string | null;
  processorId: string | null;
  killSheetData: KillSheetParserData;
}

export async function saveKillSheet(
  input: KillSheetSaveInput
): Promise<SaveResult> {
  const parsed = killSheetSaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid kill sheet payload" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { recordName, sourceFileName, processorId, killSheetData: ks } = parsed.data;
  const effectiveProcessor = ks.processorName || "Unknown Processor";
  const id = crypto.randomUUID();

  const { error } = await supabase.from("kill_sheet_records").insert({
    id,
    user_id: user.id,
    processor_id: processorId,
    processor_name: effectiveProcessor,
    record_name: recordName || `${effectiveProcessor} - Kill Sheet`,
    source_file_name: sourceFileName,
    kill_date: normaliseDate(ks.killDate) ?? today(),
    vendor_code: ks.vendorCode,
    pic: ks.pic,
    property_name: ks.propertyName,
    booking_reference: ks.bookingReference,
    booking_type: ks.bookingType,
    total_head_count: ks.totalHeadCount,
    total_body_weight: ks.totalBodyWeight,
    total_gross_value: ks.totalGrossValue,
    average_body_weight:
      ks.averageBodyWeight ||
      (ks.totalHeadCount > 0 ? ks.totalBodyWeight / ks.totalHeadCount : 0),
    average_price_per_kg:
      ks.averagePricePerKg ||
      (ks.totalBodyWeight > 0 ? ks.totalGrossValue / ks.totalBodyWeight : 0),
    average_value_per_head:
      ks.totalHeadCount > 0 ? ks.totalGrossValue / ks.totalHeadCount : 0,
    condemns: ks.condemns,
    category_summaries: withIds(ks.categorySummaries ?? []),
    grade_distribution: withIds(ks.gradeDistribution ?? []),
    line_items: withIds(
      ks.lineItems.map((item) => ({
        ...item,
        sex: item.sex ?? deriveSexFromCategory(item.category ?? ""),
      }))
    ),
  });

  if (error) {
    console.error("saveKillSheet insert failed:", error);
    return { ok: false, error: "Could not save kill sheet. Please try again." };
  }

  revalidatePath("/dashboard/tools/grid-iq");
  revalidatePath("/dashboard/tools/grid-iq/library");
  return { ok: true, id };
}
