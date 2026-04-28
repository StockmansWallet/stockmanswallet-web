// Shared helpers and types for the Brangus file uploads feature.
// Mirrors the iOS BrangusFile model and feeds both the Files tool page and
// the Brangus chat paperclip path on the web.

import { createClient } from "@/lib/supabase/client";

export const BRANGUS_FILES_BUCKET = "brangus-files";
export const SIGNED_URL_TTL_SECONDS = 60 * 15;

export type BrangusFileKind =
  | "vet_report"
  | "nlis"
  | "mla_receipt"
  | "lease"
  | "soil_test"
  | "kill_sheet"
  | "eu_cert"
  | "breeding"
  | "other";

export type BrangusFileSource = "files" | "chat";

export type BrangusFileExtractionStatus =
  | "pending"
  | "complete"
  | "unsupported"
  | "failed"
  | "not_required";

export interface BrangusFileRow {
  id: string;
  storage_path?: string;
  title: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  kind: BrangusFileKind | null;
  category?: string | null;
  page_count: number | null;
  extraction_status: BrangusFileExtractionStatus;
  source: BrangusFileSource;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

export const FILE_KIND_OPTIONS: { value: BrangusFileKind; label: string }[] = [
  { value: "vet_report", label: "Vet Report" },
  { value: "nlis", label: "NLIS" },
  { value: "mla_receipt", label: "MLA Receipt" },
  { value: "lease", label: "Lease" },
  { value: "soil_test", label: "Soil Test" },
  { value: "kill_sheet", label: "Kill Sheet" },
  { value: "eu_cert", label: "EU Certificate" },
  { value: "breeding", label: "Breeding Record" },
  { value: "other", label: "Other" },
];

export const DEFAULT_FILE_CATEGORY_OPTIONS = [
  "Health & vet",
  "NLIS & compliance",
  "Sales & receipts",
  "Leases & property",
  "Soil & pasture",
  "Kill sheets",
  "Breeding records",
  "Photos",
  "Finance & admin",
  "General",
];

export type BrangusDetectedFileType =
  | "pdf"
  | "image"
  | "spreadsheet"
  | "document"
  | "data"
  | "other";

export const FILE_TYPE_LABELS: Record<BrangusDetectedFileType, string> = {
  pdf: "PDFs",
  image: "Images",
  spreadsheet: "Spreadsheets",
  document: "Documents",
  data: "Data & text",
  other: "Other files",
};

const SPREADSHEET_EXTENSIONS = new Set(["csv", "xls", "xlsx", "xlsm", "ods", "tsv"]);
const DOCUMENT_EXTENSIONS = new Set(["doc", "docx", "pages", "rtf"]);
const DATA_EXTENSIONS = new Set(["txt", "json", "xml"]);

export function kindLabel(kind: BrangusFileKind | null | undefined): string | null {
  if (!kind) return null;
  return FILE_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? null;
}

export function fileCategoryLabel(file: Pick<BrangusFileRow, "category" | "kind">): string {
  return file.category?.trim() || kindLabel(file.kind) || "Uncategorised";
}

export function detectFileType(
  file: Pick<BrangusFileRow, "mime_type" | "original_filename">
): BrangusDetectedFileType {
  const mime = file.mime_type.toLowerCase();
  const ext = file.original_filename.split(".").pop()?.toLowerCase() ?? "";

  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("csv") ||
    SPREADSHEET_EXTENSIONS.has(ext)
  ) {
    return "spreadsheet";
  }
  if (mime.includes("word") || mime.includes("opendocument.text") || DOCUMENT_EXTENSIONS.has(ext)) {
    return "document";
  }
  if (mime.startsWith("text/") || DATA_EXTENSIONS.has(ext)) return "data";
  return "other";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function friendlyTitle(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx <= 0) return filename;
  return filename.slice(0, idx);
}

// Native Claude formats - sent as document/image content blocks, no text extraction.
export function isNativelyReadable(mime: string): boolean {
  const m = mime.toLowerCase();
  return m === "application/pdf" || m.startsWith("image/");
}

export interface UploadResult {
  fileId: string;
  storagePath: string;
}

export async function uploadBrangusFile(opts: {
  userId: string;
  file: File;
  title?: string;
  kind?: BrangusFileKind | null;
  category?: string | null;
  source?: BrangusFileSource;
  conversationId?: string | null;
}): Promise<UploadResult> {
  const supabase = createClient();
  const fileId = crypto.randomUUID();
  const ext = (() => {
    const idx = opts.file.name.lastIndexOf(".");
    return idx > 0 ? opts.file.name.slice(idx + 1).toLowerCase() : "bin";
  })();
  const storagePath = `${opts.userId}/${fileId}/original.${ext}`;
  const mime = opts.file.type || "application/octet-stream";

  const { error: uploadError } = await supabase.storage
    .from(BRANGUS_FILES_BUCKET)
    .upload(storagePath, opts.file, {
      cacheControl: "3600",
      contentType: mime,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("brangus_files").insert({
    id: fileId,
    user_id: opts.userId,
    storage_path: storagePath,
    original_filename: opts.file.name,
    mime_type: mime,
    size_bytes: opts.file.size,
    title: opts.title?.trim() || friendlyTitle(opts.file.name),
    kind: opts.kind ?? null,
    category: opts.category?.trim() || null,
    source: opts.source ?? "files",
    conversation_id: opts.conversationId ?? null,
    extraction_status: "pending",
  });
  if (insertError) {
    // Best-effort cleanup of the orphaned object so retries don't pile up.
    await supabase.storage.from(BRANGUS_FILES_BUCKET).remove([storagePath]);
    throw insertError;
  }

  // Fire-and-forget extraction trigger. The function reads the row, decides
  // whether extraction is needed, and writes extracted.txt + page_count back.
  triggerExtraction(fileId).catch(() => {});

  return { fileId, storagePath };
}

export async function deleteBrangusFile(file: BrangusFileRow): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("brangus_files")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", file.id);

  if (file.storage_path) {
    await supabase.storage.from(BRANGUS_FILES_BUCKET).remove([file.storage_path]);
  }
}

export async function signedUrlFor(storagePath: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BRANGUS_FILES_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function downloadOriginalAsBase64(
  storagePath: string
): Promise<{ base64: string; mime: string } | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BRANGUS_FILES_BUCKET).download(storagePath);
  if (error || !data) return null;
  const buffer = new Uint8Array(await data.arrayBuffer());
  // Convert to base64 in chunks - large PDFs choke btoa(String.fromCharCode(...))
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return { base64: btoa(binary), mime: data.type || "application/octet-stream" };
}

export async function downloadExtractedText(
  fileId: string,
  userId: string
): Promise<string | null> {
  const supabase = createClient();
  // Naming convention is fixed - extracted.txt always lives next to original.
  const candidate = `${userId}/${fileId}/extracted.txt`;
  const { data, error } = await supabase.storage.from(BRANGUS_FILES_BUCKET).download(candidate);
  if (error || !data) return null;
  return await data.text();
}

async function triggerExtraction(fileId: string): Promise<void> {
  const supabase = createClient();
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session.session?.access_token;
  if (!accessToken) return;
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/extract-file-text`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
    body: JSON.stringify({ file_id: fileId }),
  });
}
