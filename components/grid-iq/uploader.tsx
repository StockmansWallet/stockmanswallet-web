"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileImage,
  FileText,
  X,
  Grid3x3,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { extractDocument } from "@/lib/grid-iq/extraction-service";
import type { ExtractionResult } from "@/lib/grid-iq/types";
import { createClient } from "@/lib/supabase/client";
import {
  GLOVEBOX_FILES_BUCKET,
  formatFileSize as formatGloveboxFileSize,
  kindLabel,
  uploadGloveboxFile,
  type GloveboxFileKind,
  type GloveboxFileRow,
} from "@/lib/glovebox/files";
import {
  saveProcessorGrid,
  saveKillSheet,
} from "@/app/(app)/dashboard/tools/grid-iq/upload-actions";

type UploadType = "grid" | "killsheet";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/pdf",
  "text/csv",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

// Check file extension for types that browsers may not recognise
const ACCEPTED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "heic", "pdf", "csv", "txt", "tsv", "xlsx", "xls",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const GLOVEBOX_FILE_SELECT =
  "id,title,original_filename,mime_type,size_bytes,kind,category,tags,page_count,extraction_status,source,conversation_id,created_at,updated_at,storage_path";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "xlsx" || ext === "xls")
    return <FileSpreadsheet className="h-5 w-5 text-success" />;
  if (type.startsWith("image/"))
    return <FileImage className="h-5 w-5 text-info" />;
  if (type === "application/pdf")
    return <FileText className="h-5 w-5 text-error" />;
  return <FileSpreadsheet className="h-5 w-5 text-success" />;
}

interface GridIQUploaderProps {
  initialType?: UploadType;
  // Called after a successful save. Receives the new record id and type so the
  // caller can close a surrounding modal and navigate to the detail page.
  onSaved?: (id: string, type: UploadType) => void;
  // Pre-select a processor when the uploader is opened from a flow that
  // already knows the processor (eg. Analyse Step 2 picker).
  defaultProcessorId?: string | null;
}

export function GridIQUploader({
  initialType = "grid",
  onSaved,
  defaultProcessorId = null,
}: GridIQUploaderProps) {
  const router = useRouter();
  const [uploadType, setUploadType] = useState<UploadType>(initialType);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [headCountConfirmed, setHeadCountConfirmed] = useState(false);
  const [typeMismatchConfirmed, setTypeMismatchConfirmed] = useState(false);
  const [gridNameOverride, setGridNameOverride] = useState<string | null>(null);
  const [sourceGloveboxFileId, setSourceGloveboxFileId] = useState<string | null>(null);
  const [gloveboxPickerOpen, setGloveboxPickerOpen] = useState(false);
  const [gloveboxFiles, setGloveboxFiles] = useState<GloveboxFileRow[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceGloveboxFileIdRef = useRef<string | null>(null);

  // Processor picker: load once, auto-match on extraction, manual override.
  interface ProcessorOption {
    id: string;
    name: string;
  }
  const [processors, setProcessors] = useState<ProcessorOption[]>([]);
  const [selectedProcessorId, setSelectedProcessorId] = useState<string | null>(
    defaultProcessorId
  );

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("processors")
      .select("id, name")
      .eq("is_deleted", false)
      .order("name")
      .then(({ data }) => {
        if (data) setProcessors(data as ProcessorOption[]);
      });
  }, []);

  // Auto-match when extraction returns a processor_name that exists in the
  // user's directory (case-insensitive exact match). Only fills when the
  // field is currently empty so a parent-provided default or the user's
  // explicit pick is never overridden.
  useEffect(() => {
    if (!result || processors.length === 0) return;
    if (selectedProcessorId) return;
    const extractedName =
      result.gridData?.processorName || result.killSheetData?.processorName;
    if (!extractedName) return;
    const match = processors.find(
      (p) => p.name.trim().toLowerCase() === extractedName.trim().toLowerCase()
    );
    if (match) setSelectedProcessorId(match.id);
  }, [result, processors, selectedProcessorId]);

  const handleFile = useCallback((f: File, gloveboxFileId: string | null = null) => {
    setError(null);
    setResult(null);
    setHeadCountConfirmed(false);
    setTypeMismatchConfirmed(false);
    setGridNameOverride(null);
    sourceGloveboxFileIdRef.current = gloveboxFileId;
    setSourceGloveboxFileId(gloveboxFileId);

    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (!ACCEPTED_TYPES.includes(f.type) && !ACCEPTED_EXTENSIONS.has(ext)) {
      setError(
        "Unsupported file type. Please upload an Excel, PDF, CSV, TXT, or image file."
      );
      return;
    }

    if (f.size > MAX_FILE_SIZE) {
      setError("File is too large. Maximum size is 50MB.");
      return;
    }

    // Block legacy .xls
    if (ext === "xls") {
      setError(
        "Legacy .xls format is not supported. Please save as .xlsx and try again."
      );
      return;
    }

    setFile(f);

    // Generate preview for images
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

  const loadGloveboxFiles = useCallback(async () => {
    setGloveboxFiles(null);
    const supabase = createClient();
    const kind = uploadType === "grid" ? "processor_grid" : "kill_sheet";
    const { data } = await supabase
      .from("glovebox_files")
      .select(GLOVEBOX_FILE_SELECT)
      .eq("is_deleted", false)
      .eq("kind", kind)
      .order("updated_at", { ascending: false })
      .limit(80);
    setGloveboxFiles((data ?? []) as GloveboxFileRow[]);
  }, [uploadType]);

  const handleGloveboxFile = useCallback(
    async (row: GloveboxFileRow) => {
      if (!row.storage_path) {
        setError("That Glovebox file is missing its stored document.");
        return;
      }
      setIsProcessing(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error: downloadError } = await supabase.storage
          .from(GLOVEBOX_FILES_BUCKET)
          .download(row.storage_path);
        if (downloadError || !data) {
          throw downloadError ?? new Error("Could not download Glovebox file.");
        }
        const selectedFile = new File([data], row.original_filename, {
          type: row.mime_type || data.type || "application/octet-stream",
        });
        handleFile(selectedFile, row.id);
        setGloveboxPickerOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open Glovebox file.");
      } finally {
        setIsProcessing(false);
      }
    },
    [handleFile]
  );

  const saveCurrentFileToGlovebox = useCallback(async (): Promise<string | null> => {
    if (!file) return null;
    if (sourceGloveboxFileId) return sourceGloveboxFileId;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please sign in again to upload.");

    const isGrid = uploadType === "grid";
    const { fileId } = await uploadGloveboxFile({
      userId: user.id,
      file,
      kind: (isGrid ? "processor_grid" : "kill_sheet") as GloveboxFileKind,
      category: isGrid ? "Processor Grids" : "Kill sheets",
      source: "grid_iq",
    });
    sourceGloveboxFileIdRef.current = fileId;
    setSourceGloveboxFileId(fileId);
    return fileId;
  }, [file, sourceGloveboxFileId, uploadType]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleExtract = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      await saveCurrentFileToGlovebox();
      const extractionResult = await extractDocument(file, uploadType);
      setResult(extractionResult);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Extraction failed. Please try again.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);
    setError(null);

    try {
      if (result.documentType === "grid" && result.gridData) {
        const saveResult = await saveProcessorGrid({
          recordName: gridNameOverride,
          sourceFileName: file?.name ?? null,
          processorId: selectedProcessorId,
          gloveboxFileId: sourceGloveboxFileIdRef.current ?? sourceGloveboxFileId,
          gridData: result.gridData,
        });
        if (!saveResult.ok) throw new Error(saveResult.error);
        if (onSaved) onSaved(saveResult.id, "grid");
        router.refresh();
      } else if (result.documentType === "killsheet" && result.killSheetData) {
        const saveResult = await saveKillSheet({
          recordName: gridNameOverride,
          sourceFileName: file?.name ?? null,
          processorId: selectedProcessorId,
          gloveboxFileId: sourceGloveboxFileIdRef.current ?? sourceGloveboxFileId,
          killSheetData: result.killSheetData,
        });
        if (!saveResult.ok) throw new Error(saveResult.error);
        if (onSaved) onSaved(saveResult.id, "killsheet");
        router.refresh();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save. Please try again.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setResult(null);
    setHeadCountConfirmed(false);
    setTypeMismatchConfirmed(false);
    setGridNameOverride(null);
    sourceGloveboxFileIdRef.current = null;
    setSourceGloveboxFileId(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Check if save should be blocked by head count mismatch or type mismatch
  const hasPendingMismatch =
    result?.reconciliation &&
    !result.reconciliation.isMatched &&
    !headCountConfirmed;

  const hasPendingTypeMismatch =
    result?.typeMismatch && !typeMismatchConfirmed;

  const saveBlocked = !!hasPendingMismatch || !!hasPendingTypeMismatch;

  return (
    <div className="space-y-4">
      {/* Type Toggle */}
      {!result && (
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setUploadType("grid")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              uploadType === "grid"
                ? "bg-grid-iq/15 text-grid-iq"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Grid3x3 className="mr-1.5 inline-block h-3.5 w-3.5" />
            Processor Grid
          </button>
          <button
            type="button"
            onClick={() => setUploadType("killsheet")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              uploadType === "killsheet"
                ? "bg-grid-iq/15 text-grid-iq"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <FileText className="mr-1.5 inline-block h-3.5 w-3.5" />
            Kill Sheet
          </button>
        </div>
      )}

      {/* Drop Zone */}
      <Card>
        <CardContent className="p-6">
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed py-14 transition-all ${
                isDragging
                  ? "border-grid-iq/50 bg-grid-iq/5"
                  : "border-white/10 hover:border-grid-iq/30 hover:bg-grid-iq/[0.02]"
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-grid-iq/10">
                <Upload className="h-6 w-6 text-grid-iq" />
              </div>
              <p className="mt-4 text-sm font-medium text-text-primary">
                {isDragging
                  ? "Drop file here"
                  : `Drop your ${uploadType === "grid" ? "processor grid" : "kill sheet"} here`}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Excel, PDF, CSV, TXT, or image supported
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                Browse Files
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 border border-white/[0.08] bg-white/[0.04] hover:border-grid-iq/30 hover:bg-grid-iq/10 hover:text-grid-iq"
                onClick={(e) => {
                  e.stopPropagation();
                  setGloveboxPickerOpen(true);
                  loadGloveboxFiles();
                }}
              >
                <FolderOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Choose from Glovebox
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.heic,.pdf,.csv,.txt,.xlsx"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="flex items-start gap-4 rounded-xl bg-white/5 p-4 ring-1 ring-inset ring-white/[0.06]">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-20 w-20 rounded-lg object-cover ring-1 ring-inset ring-white/10"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white/5">
                    {getFileIcon(file.type, file.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {formatFileSize(file.size)} .{" "}
                    {file.name.split(".").pop()?.toUpperCase() || "File"}
                  </p>
                  <p className="mt-1 text-xs text-grid-iq">
                    {uploadType === "grid"
                      ? "Processor Grid"
                      : "Kill Sheet"}
                  </p>
                </div>
                <button
                  onClick={handleClear}
                  disabled={isProcessing || isSaving}
                  aria-label={`Remove ${file.name}`}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/10 hover:text-text-primary disabled:opacity-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Extraction Result */}
              {result && (
                <ExtractionResultView
                  result={result}
                  headCountConfirmed={headCountConfirmed}
                  onConfirmHeadCount={() => setHeadCountConfirmed(true)}
                  typeMismatchConfirmed={typeMismatchConfirmed}
                  onConfirmTypeMismatch={() => setTypeMismatchConfirmed(true)}
                  onSwitchType={(newType: UploadType) => {
                    setUploadType(newType);
                    setTypeMismatchConfirmed(true);
                  }}
                  uploadType={uploadType}
                  onRetry={handleClear}
                  gridName={gridNameOverride}
                  onGridNameChange={setGridNameOverride}
                  fileName={file?.name || ""}
                />
              )}

              {/* Processor link: auto-matched on extraction, user can override */}
              {result && (
                <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.06]">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-text-primary">
                      Link to processor
                    </label>
                    {processors.length === 0 && (
                      <Link
                        href="/dashboard/tools/grid-iq/processors/new"
                        className="text-[11px] text-grid-iq hover:underline"
                      >
                        + Add processor
                      </Link>
                    )}
                  </div>
                  {processors.length > 0 ? (
                    <select
                      value={selectedProcessorId ?? ""}
                      onChange={(e) =>
                        setSelectedProcessorId(e.target.value || null)
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-text-primary focus:border-grid-iq/50 focus:outline-none"
                    >
                      <option value="">Not linked (set later)</option>
                      {processors.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-text-muted">
                      No processors in your directory yet. Add one so freight
                      calculations work correctly.
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] text-text-muted">
                    Linking lets future analyses reuse the processor&apos;s
                    address and coordinates.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {!result ? (
                  <Button
                    onClick={handleExtract}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        Extract{" "}
                        {uploadType === "grid" ? "Grid" : "Kill Sheet"}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || saveBlocked}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        Confirm & Save
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
                  onClick={handleClear}
                  disabled={isProcessing || isSaving}
                >
                  {result ? "Start Over" : "Clear"}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl bg-warning/10 p-4 ring-1 ring-inset ring-warning/20">
              <p className="text-sm text-warning">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="px-1">
        <p className="text-xs leading-relaxed text-text-muted">
          {uploadType === "grid"
            ? "Upload an Excel (.xlsx), PDF, or image of your processor grid. Grid IQ extracts the price matrix, grade codes, and weight bands automatically."
            : "Upload an Excel (.xlsx), PDF, or image of your kill sheet. Grid IQ extracts head counts, grades, weights, and pricing to track your over-the-hooks performance."}
        </p>
      </div>

      <GridIQGloveboxPicker
        open={gloveboxPickerOpen}
        files={gloveboxFiles}
        uploadType={uploadType}
        onClose={() => setGloveboxPickerOpen(false)}
        onPick={handleGloveboxFile}
      />
    </div>
  );
}

// Extraction result display component
function ExtractionResultView({
  result,
  headCountConfirmed,
  onConfirmHeadCount,
  typeMismatchConfirmed,
  onConfirmTypeMismatch,
  onSwitchType,
  uploadType,
  onRetry,
  gridName,
  onGridNameChange,
  fileName,
}: {
  result: ExtractionResult;
  headCountConfirmed: boolean;
  onConfirmHeadCount: () => void;
  typeMismatchConfirmed: boolean;
  onConfirmTypeMismatch: () => void;
  onSwitchType: (type: UploadType) => void;
  uploadType: UploadType;
  onRetry: () => void;
  gridName: string | null;
  onGridNameChange: (name: string | null) => void;
  fileName: string;
}) {
  const isGrid = result.documentType === "grid";
  const rawProcessorName = isGrid
    ? result.gridData?.processorName
    : result.killSheetData?.processorName;
  const processorDisplay = rawProcessorName || "Unknown";
  const recordNameLabel = isGrid ? "Grid Name" : "Kill Sheet Name";
  const defaultSuffix = isGrid ? "Grid" : "Kill Sheet";
  const defaultRecordName = `${processorDisplay} - ${defaultSuffix}`;
  const recordNameDisplay = gridName ?? defaultRecordName;

  const typeMismatchLabel = result.detectedType === "grid" ? "Processor Grid" : "Kill Sheet";
  const selectedLabel = uploadType === "grid" ? "Processor Grid" : "Kill Sheet";

  return (
    <div className="space-y-3">
      {/* Document type mismatch warning */}
      {result.typeMismatch && !typeMismatchConfirmed && (
        <div className="rounded-xl bg-warning/10 p-4 ring-1 ring-inset ring-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">
              Document Type Mismatch
            </span>
          </div>
          <p className="text-sm text-warning/80 mb-3">
            This file looks like a <span className="font-medium text-warning">{typeMismatchLabel}</span>,
            {" "}but you selected <span className="font-medium text-warning">{selectedLabel}</span>.
            Please confirm the correct type before saving.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSwitchType(result.detectedType as UploadType)}
            >
              Switch to {typeMismatchLabel}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
              onClick={onConfirmTypeMismatch}
            >
              Keep as {selectedLabel}
            </Button>
          </div>
        </div>
      )}

      {/* Truncation warning */}
      {result.wasTruncated && (
        <div className="rounded-xl bg-warning/10 p-4 ring-1 ring-inset ring-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">
              Incomplete Extraction
            </span>
          </div>
          <p className="text-sm text-warning/80">
            The AI response was cut short due to document size. Some data may be missing.
            Try uploading a clearer image, or split a large PDF into smaller sections.
          </p>
        </div>
      )}

      {/* Grid extraction result */}
      {result.documentType === "grid" && result.gridData && (
        <div className="rounded-xl bg-success/5 p-4 ring-1 ring-inset ring-success/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">
              Grid Extracted{result.parsedViaAI ? " (AI)" : ""}
            </span>
          </div>
          <div className="space-y-1.5 text-sm">
            <EditField
              label={recordNameLabel}
              value={recordNameDisplay}
              onChange={(v) => onGridNameChange(v || null)}
            />
            <DetailRow label="File Name" value={fileName} />
            <hr className="border-white/10 my-1" />
            <DetailRow label="Processor" value={processorDisplay} />
            {result.gridData.gridCode && <DetailRow label="Grid Code" value={result.gridData.gridCode} />}
            {result.gridData.gridDate && <DetailRow label="Date" value={result.gridData.gridDate} />}
            <DetailRow label="Grade Entries" value={`${result.gridData.entries.length}`} />
            {result.gridData.entries.some((e) => e.gender) && (
              <DetailRow
                label="Gender Tabs"
                value={`Male: ${result.gridData.entries.filter((e) => e.gender === "male").length}, Female: ${result.gridData.entries.filter((e) => e.gender === "female").length}`}
              />
            )}
          </div>
        </div>
      )}

      {/* Kill sheet extraction result */}
      {result.documentType === "killsheet" && result.killSheetData && (
        <>
          <div className="rounded-xl bg-success/5 p-4 ring-1 ring-inset ring-success/20">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">
                Kill Sheet Extracted{result.parsedViaAI ? " (AI)" : ""}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <EditField
                label={recordNameLabel}
                value={recordNameDisplay}
                onChange={(v) => onGridNameChange(v || null)}
              />
              <DetailRow label="File Name" value={fileName} />
              <hr className="border-white/10 my-1" />
              <DetailRow label="Processor" value={processorDisplay} />
              {result.killSheetData.killDate && <DetailRow label="Kill Date" value={result.killSheetData.killDate} />}
              <DetailRow label="Total Head" value={`${result.killSheetData.totalHeadCount}`} />
              <DetailRow
                label="Total Weight"
                value={`${Math.round(result.killSheetData.totalBodyWeight)} kg`}
              />
              <DetailRow
                label="Total Value"
                value={`$${result.killSheetData.totalGrossValue.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`}
              />
              <DetailRow
                label="Line Items"
                value={`${result.killSheetData.lineItems?.length || 0}`}
              />
            </div>
          </div>

          {/* Head count reconciliation warning */}
          {result.reconciliation && !result.reconciliation.isMatched && (
            <div className="rounded-xl bg-warning/10 p-4 ring-1 ring-inset ring-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">
                  Head Count Mismatch
                </span>
              </div>
              <p className="text-sm text-warning/80 mb-3">{result.reconciliation.message}</p>
              {!headCountConfirmed ? (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={onRetry}>
                    Retry Upload
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
                    onClick={onConfirmHeadCount}
                  >
                    Use Anyway
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-success">
                  <CheckCircle className="h-3 w-3" />
                  Confirmed by user
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GridIQGloveboxPicker({
  open,
  files,
  uploadType,
  onClose,
  onPick,
}: {
  open: boolean;
  files: GloveboxFileRow[] | null;
  uploadType: UploadType;
  onClose: () => void;
  onPick: (file: GloveboxFileRow) => void;
}) {
  if (!open) return null;

  const title = uploadType === "grid" ? "Choose processor grid" : "Choose kill sheet";
  const empty = uploadType === "grid" ? "No processor grids in Glovebox yet." : "No kill sheets in Glovebox yet.";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center">
      <div className="m-4 w-full max-w-lg rounded-2xl border border-white/[0.08] bg-bg-alt p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-text-muted transition-colors hover:bg-white/[0.08] hover:text-text-primary"
            aria-label="Close Glovebox picker"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {files === null ? (
          <div className="flex justify-center py-8 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
        ) : files.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">{empty}</p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => onPick(file)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-grid-iq/15">
                  <FileSpreadsheet className="h-4 w-4 text-grid-iq" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{file.title}</p>
                  <p className="truncate text-xs text-text-muted">
                    {kindLabel(file.kind) ?? shortMime(file.mime_type)}
                    {" · "}
                    {formatGloveboxFileSize(file.size_bytes)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function shortMime(mime: string): string {
  const value = (mime || "").toLowerCase();
  if (value === "application/pdf") return "PDF";
  if (value.startsWith("image/")) return value.split("/")[1]?.toUpperCase() ?? "IMAGE";
  if (value.includes("spreadsheet") || value.includes("excel")) return "XLSX";
  if (value.includes("csv")) return "CSV";
  if (value.startsWith("text/")) return "TEXT";
  return "FILE";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-text-muted">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-56 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-sm font-medium text-text-primary text-right outline-none focus:border-grid-iq/50 focus:ring-1 focus:ring-grid-iq/25"
      />
    </div>
  );
}
