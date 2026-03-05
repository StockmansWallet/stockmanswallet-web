"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// ============================================
// Types
// ============================================

type FileStatus = "pending" | "uploading" | "success" | "error";

interface PendingFile {
  file: File;
  id: string;
  status: FileStatus;
  result: UploadResult | null;
  errorMessage: string | null;
  chunkProgress: string | null;
  detectedMode: "csv" | "transactions_csv" | null;
}

interface UploadResult {
  success: boolean;
  saleyard?: string;
  saleyards?: string;
  saleyards_count?: number;
  report_date?: string;
  data_date?: string;
  data_rows?: number;
  prices_generated?: number;
  chunks_total?: number;
  chunks_failed?: number;
  error?: string;
}

// ============================================
// Constants
// ============================================

const EDGE_FUNCTION_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/mla-scraper";

// ============================================
// CSV Helpers
// ============================================

function detectCsvMode(csvText: string): "csv" | "transactions_csv" {
  const lines = csvText.split("\n");
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (
      line.startsWith("Quarterly,State,Saleyard,") ||
      line.startsWith("Weekly,State,Saleyard,")
    ) {
      return "transactions_csv";
    }
  }
  return "csv";
}

function prefilterTransactionsCsv(csvText: string): string {
  const lines = csvText.split("\n");

  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("Quarterly,") || trimmed.startsWith("Weekly,")) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) return csvText;

  const dates = new Set<string>();
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const dateStr = line.split(",")[0].split(" ")[0];
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      dates.add(dateStr);
    }
  }

  const sortedDates = Array.from(dates).sort();
  const mostRecent = sortedDates[sortedDates.length - 1];

  const headerBlock = lines.slice(0, headerIndex + 1);
  const filteredDataLines: string[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith(mostRecent)) {
      filteredDataLines.push(line);
    }
  }

  return headerBlock.join("\n") + "\n" + filteredDataLines.join("\n");
}

interface DateChunk {
  date: string;
  csv: string;
}

function chunkTransactionsCsvByDate(csvText: string): DateChunk[] {
  const lines = csvText.split("\n");

  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("Quarterly,") || trimmed.startsWith("Weekly,")) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) return [];

  const headerBlock = lines.slice(0, headerIndex + 1).join("\n");

  const dateGroups: Record<string, string[]> = {};
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const dateStr = line.split(",")[0].split(" ")[0];
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

    if (!dateGroups[dateStr]) dateGroups[dateStr] = [];
    dateGroups[dateStr].push(line);
  }

  const sortedDates = Object.keys(dateGroups).sort();

  return sortedDates.map((date) => ({
    date,
    csv: headerBlock + "\n" + dateGroups[date].join("\n"),
  }));
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// ============================================
// Component
// ============================================

export function MlaUploader({ userEmail }: { userEmail: string }) {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [latestOnly, setLatestOnly] = useState(true);
  const [summary, setSummary] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    totalRows: number;
    totalPrices: number;
    saleyards: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if any pending file is a transactions CSV
  const hasTransactions = files.some(
    (f) => f.status === "pending" && f.detectedMode === "transactions_csv"
  );

  const hasPending = files.some((f) => f.status === "pending");

  // ------------------------------------------
  // File management
  // ------------------------------------------

  const addFiles = useCallback(async (newFiles: File[]) => {
    const additions: PendingFile[] = [];

    for (const file of newFiles) {
      if (!file.name.endsWith(".csv")) continue;

      const text = await readFileAsText(file);
      const mode = detectCsvMode(text);

      additions.push({
        file,
        id: crypto.randomUUID(),
        status: "pending",
        result: null,
        errorMessage: null,
        chunkProgress: null,
        detectedMode: mode,
      });
    }

    setFiles((prev) => {
      // Skip duplicates
      const existing = new Set(prev.map((f) => f.file.name));
      const unique = additions.filter((a) => !existing.has(a.file.name));
      return [...prev, ...unique];
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ------------------------------------------
  // Drag and drop
  // ------------------------------------------

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // ------------------------------------------
  // Auth header helper
  // ------------------------------------------

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not signed in");
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };
  }

  // ------------------------------------------
  // Upload logic
  // ------------------------------------------

  const updateFile = (id: string, updates: Partial<PendingFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  async function uploadSinglePayload(
    pf: PendingFile,
    mode: string,
    csvData: string,
    extraBody: Record<string, unknown>
  ): Promise<{ success: boolean; result?: UploadResult; error?: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ mode, csv_data: csvData, ...extraBody }),
    });

    const result = await response.json();
    if (result.success) {
      return { success: true, result };
    } else {
      return {
        success: false,
        error: result.error || "Unknown error (HTTP " + response.status + ")",
      };
    }
  }

  async function uploadTransactionsInChunks(pf: PendingFile, csvData: string) {
    const chunks = chunkTransactionsCsvByDate(csvData);

    if (chunks.length === 0) {
      updateFile(pf.id, {
        status: "error",
        errorMessage: "No valid date periods found in CSV",
      });
      return;
    }

    let totalPrices = 0;
    let totalRows = 0;
    const totalSaleyards = new Set<string>();
    let failedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isFirst = i === 0;
      const progress = `Chunk ${i + 1}/${chunks.length} (${chunk.date})`;

      updateFile(pf.id, { chunkProgress: progress });

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(EDGE_FUNCTION_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            mode: "transactions_csv",
            csv_data: chunk.csv,
            skip_delete: !isFirst,
          }),
        });

        const result = await response.json();

        if (result.success) {
          totalPrices += result.prices_generated || 0;
          totalRows += result.data_rows || 0;
          if (result.saleyards) {
            result.saleyards
              .split(", ")
              .forEach((s: string) => totalSaleyards.add(s));
          }
        } else {
          failedChunks++;
        }
      } catch {
        failedChunks++;
      }
    }

    if (failedChunks < chunks.length) {
      updateFile(pf.id, {
        status: "success",
        chunkProgress: null,
        result: {
          success: true,
          saleyards_count: totalSaleyards.size,
          saleyards: Array.from(totalSaleyards).sort().join(", "),
          data_date:
            chunks[0].date + " to " + chunks[chunks.length - 1].date,
          data_rows: totalRows,
          prices_generated: totalPrices,
          chunks_total: chunks.length,
          chunks_failed: failedChunks,
        },
      });
    } else {
      updateFile(pf.id, {
        status: "error",
        chunkProgress: null,
        errorMessage: `All ${chunks.length} chunks failed`,
      });
    }
  }

  async function startUpload() {
    setUploading(true);
    setSummary(null);

    const toUpload = files.filter((f) => f.status === "pending");

    for (const pf of toUpload) {
      updateFile(pf.id, { status: "uploading" });

      try {
        const csvData = await readFileAsText(pf.file);
        const mode = pf.detectedMode || detectCsvMode(csvData);

        if (mode === "transactions_csv" && !latestOnly) {
          await uploadTransactionsInChunks(pf, csvData);
        } else {
          let payload = csvData;
          if (mode === "transactions_csv") {
            payload = prefilterTransactionsCsv(csvData);
          }

          const { success, result, error } = await uploadSinglePayload(
            pf,
            mode,
            payload,
            {}
          );
          if (success && result) {
            updateFile(pf.id, { status: "success", result });
          } else {
            updateFile(pf.id, {
              status: "error",
              errorMessage: error || "Upload failed",
            });
          }
        }
      } catch (err) {
        updateFile(pf.id, {
          status: "error",
          errorMessage:
            err instanceof Error ? err.message : "Network error",
        });
      }
    }

    // Build summary from final state
    setFiles((prev) => {
      const succeeded = prev.filter((f) => f.status === "success");
      const failed = prev.filter((f) => f.status === "error");
      const totalPrices = succeeded.reduce(
        (sum, f) => sum + (f.result?.prices_generated || 0),
        0
      );
      const totalRows = succeeded.reduce(
        (sum, f) => sum + (f.result?.data_rows || 0),
        0
      );
      const saleyards = succeeded
        .map((f) => f.result?.saleyards || f.result?.saleyard)
        .filter(Boolean)
        .join(", ");

      setSummary({
        total: succeeded.length + failed.length,
        succeeded: succeeded.length,
        failed: failed.length,
        totalRows,
        totalPrices,
        saleyards,
      });

      return prev;
    });

    setUploading(false);
  }

  // ------------------------------------------
  // Render helpers
  // ------------------------------------------

  function formatResult(pf: PendingFile): string {
    const r = pf.result;
    if (!r) return "";

    if (r.chunks_total) {
      const chunkInfo =
        r.chunks_failed && r.chunks_failed > 0
          ? `${r.chunks_total} chunks (${r.chunks_failed} failed)`
          : `${r.chunks_total} chunks`;
      return `${r.saleyards_count} saleyards - ${r.data_date} - ${chunkInfo} - ${r.prices_generated} prices`;
    }

    if (r.saleyards_count) {
      return `${r.saleyards_count} saleyards - ${r.data_date} - ${r.data_rows} rows - ${r.prices_generated} prices`;
    }

    return `${r.saleyard} - ${r.report_date} - ${r.data_rows} rows - ${r.prices_generated} prices`;
  }

  // ------------------------------------------
  // JSX
  // ------------------------------------------

  return (
    <div className="space-y-5">
      {/* Signed-in indicator */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-text-secondary">{userEmail}</span>
          </div>
          <span className="text-xs text-text-muted">Admin</span>
        </CardContent>
      </Card>

      {/* Drop zone */}
      <div
        className="cursor-pointer rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-12 text-center transition-all hover:border-green-500/40 hover:bg-green-500/[0.04]"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Upload className="mx-auto mb-3 h-10 w-10 text-text-muted" />
        <p className="text-sm font-medium text-text-primary">
          Drop CSV files here
        </p>
        <p className="mt-1 text-xs text-text-muted">
          or click to browse - supports multiple files
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            addFiles(Array.from(e.target.files));
            e.target.value = "";
          }
        }}
      />

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((pf) => (
            <Card key={pf.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {pf.file.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {(pf.file.size / 1024).toFixed(1)} KB
                    {pf.detectedMode === "transactions_csv"
                      ? " - Transactions Report"
                      : pf.detectedMode === "csv"
                        ? " - Physical Sale"
                        : ""}
                  </p>
                  {pf.status === "uploading" && pf.chunkProgress && (
                    <p className="mt-0.5 text-xs text-blue-400">
                      {pf.chunkProgress}
                    </p>
                  )}
                  {pf.status === "success" && pf.result && (
                    <p className="mt-0.5 text-xs text-green-400">
                      {formatResult(pf)}
                    </p>
                  )}
                  {pf.status === "error" && pf.errorMessage && (
                    <p className="mt-0.5 text-xs text-red-400">
                      {pf.errorMessage}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {pf.status === "pending" && (
                    <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-text-muted">
                      Ready
                    </span>
                  )}
                  {pf.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  )}
                  {pf.status === "success" && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {pf.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  {pf.status === "pending" && (
                    <button
                      onClick={() => removeFile(pf.id)}
                      className="rounded p-1 text-text-muted transition-colors hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Options for transactions CSVs */}
      {hasTransactions && (
        <Card>
          <CardContent className="p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={latestOnly}
                onChange={(e) => setLatestOnly(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent accent-green-500"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Latest period only
                </p>
                <p className="text-xs text-text-muted">
                  Uncheck to upload all historic periods. Large files are
                  automatically split into chunks.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>
      )}

      {/* Upload button */}
      {files.length > 0 && (
        <Button
          size="lg"
          className="w-full"
          disabled={!hasPending || uploading}
          onClick={startUpload}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            `Upload ${files.filter((f) => f.status === "pending").length} file(s) to Supabase`
          )}
        </Button>
      )}

      {/* Summary */}
      {summary && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">
              Upload Summary
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Files processed</span>
                <span className="font-medium text-text-primary">
                  {summary.total}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Successful</span>
                <span className="font-medium text-green-400">
                  {summary.succeeded}
                </span>
              </div>
              {summary.failed > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Failed</span>
                  <span className="font-medium text-red-400">
                    {summary.failed}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-muted">Total data rows</span>
                <span className="font-medium text-text-primary">
                  {summary.totalRows.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Prices generated</span>
                <span className="font-medium text-text-primary">
                  {summary.totalPrices.toLocaleString()}
                </span>
              </div>
              {summary.saleyards && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Saleyards updated</span>
                  <span className="font-medium text-text-primary">
                    {summary.saleyards}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
