"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileImage,
  FileText,
  X,
  Grid3x3,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { extractDocument } from "@/lib/grid-iq/extraction-service";
import type { ExtractionResult } from "@/lib/grid-iq/types";
import { createClient } from "@/lib/supabase/client";

type UploadType = "grid" | "killsheet";

// Normalise date strings to YYYY-MM-DD for PostgreSQL.
// Handles DD/MM/YYYY (Australian), MM/DD/YYYY, and YYYY-MM-DD.
function normaliseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split("T")[0];
  // DD/MM/YYYY or D/M/YYYY (Australian)
  const slashParts = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (slashParts) {
    const a = parseInt(slashParts[1], 10);
    const b = parseInt(slashParts[2], 10);
    const year = slashParts[3];
    // If first part > 12, it must be DD/MM/YYYY
    if (a > 12) return `${year}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    // If second part > 12, it must be MM/DD/YYYY
    if (b > 12) return `${year}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    // Ambiguous - assume Australian DD/MM/YYYY
    return `${year}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }
  return s;
}

// Add UUID ids to nested JSONB entries so iOS Codable can decode them.
// iOS ProcessorGridEntry, WeightBandPrice, KillSheetCategorySummary, etc.
// all expect an `id: UUID` field.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addIdsToEntries(entries: any[]): any[] {
  return entries.map((entry) => {
    const withId = { id: crypto.randomUUID(), ...entry };
    // Also add ids to nested weightBandPrices if present
    if (Array.isArray(withId.weightBandPrices)) {
      withId.weightBandPrices = withId.weightBandPrices.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (wbp: any) => ({ id: crypto.randomUUID(), ...wbp })
      );
    }
    return withId;
  });
}

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "xlsx" || ext === "xls")
    return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
  if (type.startsWith("image/"))
    return <FileImage className="h-5 w-5 text-blue-400" />;
  if (type === "application/pdf")
    return <FileText className="h-5 w-5 text-red-400" />;
  return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
}

export function GridIQUploader({ initialType = "grid" }: { initialType?: UploadType }) {
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setError(null);
    setResult(null);
    setHeadCountConfirmed(false);
    setTypeMismatchConfirmed(false);

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
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("Not authenticated.");

      if (result.documentType === "grid" && result.gridData) {
        const grid = result.gridData;
        const { error: insertError } = await supabase
          .from("processor_grids")
          .insert({
            id: crypto.randomUUID(),
            user_id: session.user.id,
            processor_name: grid.processorName || "Unknown Processor",
            grid_code: grid.gridCode,
            grid_date: normaliseDate(grid.gridDate) || new Date().toISOString().split("T")[0],
            expiry_date: normaliseDate(grid.expiryDate),
            contact_name: grid.contactName,
            contact_phone: grid.contactPhone,
            contact_email: grid.contactEmail,
            location: grid.location,
            notes: grid.notes,
            entries: addIdsToEntries(grid.entries),
          });

        if (insertError) throw new Error(insertError.message);
        router.push("/dashboard/tools/grid-iq/records?tab=grids");
      } else if (result.documentType === "killsheet" && result.killSheetData) {
        const ks = result.killSheetData;
        const { error: insertError } = await supabase
          .from("kill_sheet_records")
          .insert({
            id: crypto.randomUUID(),
            user_id: session.user.id,
            processor_name: ks.processorName || "Unknown Processor",
            kill_date: normaliseDate(ks.killDate) || new Date().toISOString().split("T")[0],
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
              (ks.totalHeadCount > 0
                ? ks.totalBodyWeight / ks.totalHeadCount
                : 0),
            average_price_per_kg:
              ks.averagePricePerKg ||
              (ks.totalBodyWeight > 0
                ? ks.totalGrossValue / ks.totalBodyWeight
                : 0),
            average_value_per_head:
              ks.totalHeadCount > 0
                ? ks.totalGrossValue / ks.totalHeadCount
                : 0,
            condemns: ks.condemns,
            category_summaries: addIdsToEntries(ks.categorySummaries || []),
            grade_distribution: addIdsToEntries(ks.gradeDistribution || []),
            line_items: addIdsToEntries(ks.lineItems || []),
          });

        if (insertError) throw new Error(insertError.message);
        router.push("/dashboard/tools/grid-iq/records?tab=killsheets");
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
                ? "bg-teal-500/15 text-teal-400"
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
                ? "bg-teal-500/15 text-teal-400"
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
                  ? "border-teal-400/50 bg-teal-500/5"
                  : "border-white/10 hover:border-teal-400/30 hover:bg-teal-500/[0.02]"
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/10">
                <Upload className="h-6 w-6 text-teal-400" />
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
                  <p className="mt-1 text-xs text-teal-400">
                    {uploadType === "grid"
                      ? "Processor Grid"
                      : "Kill Sheet"}
                  </p>
                </div>
                <button
                  onClick={handleClear}
                  disabled={isProcessing || isSaving}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/10 hover:text-text-primary disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
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
                />
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
                  onClick={handleClear}
                  disabled={isProcessing || isSaving}
                >
                  {result ? "Start Over" : "Clear"}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl bg-amber-500/10 p-4 ring-1 ring-inset ring-amber-500/20">
              <p className="text-sm text-amber-400">{error}</p>
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
}: {
  result: ExtractionResult;
  headCountConfirmed: boolean;
  onConfirmHeadCount: () => void;
  typeMismatchConfirmed: boolean;
  onConfirmTypeMismatch: () => void;
  onSwitchType: (type: UploadType) => void;
  uploadType: UploadType;
  onRetry: () => void;
}) {
  const typeMismatchLabel = result.detectedType === "grid" ? "Processor Grid" : "Kill Sheet";
  const selectedLabel = uploadType === "grid" ? "Processor Grid" : "Kill Sheet";

  return (
    <div className="space-y-3">
      {/* Document type mismatch warning */}
      {result.typeMismatch && !typeMismatchConfirmed && (
        <div className="rounded-xl bg-amber-500/10 p-4 ring-1 ring-inset ring-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              Document Type Mismatch
            </span>
          </div>
          <p className="text-sm text-amber-300/80 mb-3">
            This file looks like a <span className="font-medium text-amber-300">{typeMismatchLabel}</span>,
            {" "}but you selected <span className="font-medium text-amber-300">{selectedLabel}</span>.
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
            <Button variant="ghost" size="sm" onClick={onConfirmTypeMismatch}>
              Keep as {selectedLabel}
            </Button>
          </div>
        </div>
      )}

      {/* Truncation warning */}
      {result.wasTruncated && (
        <div className="rounded-xl bg-amber-500/10 p-4 ring-1 ring-inset ring-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              Incomplete Extraction
            </span>
          </div>
          <p className="text-sm text-amber-300/80">
            The AI response was cut short due to document size. Some data may be missing.
            Try uploading a clearer image, or split a large PDF into smaller sections.
          </p>
        </div>
      )}

      {/* Grid extraction result */}
      {result.documentType === "grid" && result.gridData && (
        <div className="rounded-xl bg-emerald-500/5 p-4 ring-1 ring-inset ring-emerald-500/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              Grid Extracted{result.parsedViaAI ? " (AI)" : ""}
            </span>
          </div>
          <div className="space-y-1.5 text-sm">
            <DetailRow label="Processor" value={result.gridData.processorName || "Unknown"} />
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
          <div className="rounded-xl bg-emerald-500/5 p-4 ring-1 ring-inset ring-emerald-500/20">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">
                Kill Sheet Extracted{result.parsedViaAI ? " (AI)" : ""}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <DetailRow label="Processor" value={result.killSheetData.processorName || "Unknown"} />
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
            <div className="rounded-xl bg-amber-500/10 p-4 ring-1 ring-inset ring-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">
                  Head Count Mismatch
                </span>
              </div>
              <p className="text-sm text-amber-300/80 mb-3">{result.reconciliation.message}</p>
              {!headCountConfirmed ? (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={onRetry}>
                    Retry Upload
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onConfirmHeadCount}>
                    Use Anyway
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}
