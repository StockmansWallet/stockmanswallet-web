"use client";

import { useState, useCallback, useRef } from "react";
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
} from "lucide-react";

type UploadType = "grid" | "killsheet";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/pdf",
  "text/csv",
  "text/plain",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/"))
    return <FileImage className="h-5 w-5 text-blue-400" />;
  if (type === "application/pdf")
    return <FileText className="h-5 w-5 text-red-400" />;
  return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
}

export function GridIQUploader() {
  const [uploadType, setUploadType] = useState<UploadType>("grid");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.endsWith(".heic")) {
      setError(
        "Unsupported file type. Please upload a JPG, PNG, PDF, CSV, or TXT file."
      );
      return;
    }

    if (f.size > MAX_FILE_SIZE) {
      setError("File is too large. Maximum size is 50MB.");
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

    // TODO: Send file to extraction Edge Function
    // For now, simulate processing
    await new Promise((r) => setTimeout(r, 2000));
    setIsProcessing(false);
    setError(
      "AI extraction is not yet available on the web. Upload grids via the iOS app for now."
    );
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Type Selector */}
      <div className="flex gap-2">
        {(
          [
            { key: "grid", label: "Processor Grid", icon: Grid3x3 },
            { key: "killsheet", label: "Kill Sheet", icon: FileText },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setUploadType(t.key);
              handleClear();
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              uploadType === t.key
                ? "bg-teal-500/15 text-teal-400 ring-1 ring-inset ring-teal-500/30"
                : "bg-white/5 text-text-muted hover:bg-white/8 hover:text-text-secondary"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

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
                JPG, PNG, PDF, CSV, or TXT supported
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
                accept=".jpg,.jpeg,.png,.heic,.pdf,.csv,.txt"
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
                    {getFileIcon(file.type)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {formatFileSize(file.size)} ·{" "}
                    {file.type.split("/")[1]?.toUpperCase() || "File"}
                  </p>
                  <p className="mt-1 text-xs text-teal-400">
                    {uploadType === "grid"
                      ? "Processor Grid"
                      : "Kill Sheet"}
                  </p>
                </div>
                <button
                  onClick={handleClear}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/10 hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Extract Button */}
              <div className="flex items-center gap-3">
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
                      Extract &{" "}
                      {uploadType === "grid" ? "Analyse" : "Save"}
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClear}
                  disabled={isProcessing}
                >
                  Clear
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
            ? "Upload a photo or PDF of your processor grid. Grid IQ will use AI to extract the price matrix, grade codes, and weight bands automatically."
            : "Upload a photo or PDF of your kill sheet. Grid IQ will extract head counts, grades, weights, and pricing to track your over-the-hooks performance."}
        </p>
      </div>
    </div>
  );
}
