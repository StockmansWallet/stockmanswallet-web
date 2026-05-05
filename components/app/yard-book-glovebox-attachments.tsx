"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, FileText, FileUp, FolderOpen, Loader2, X } from "lucide-react";
import {
  formatFileSize,
  kindLabel,
  uploadGloveboxFile,
  type GloveboxFileRow,
} from "@/lib/glovebox/files";
import { createClient } from "@/lib/supabase/client";

interface YardBookGloveboxAttachmentsProps {
  name?: string;
  initialFileIds?: string[] | null;
}

const FILE_SELECT = [
  "id",
  "title",
  "original_filename",
  "mime_type",
  "size_bytes",
  "kind",
  "category",
  "tags",
  "page_count",
  "extraction_status",
  "source",
  "conversation_id",
  "created_at",
  "updated_at",
  "storage_path",
].join(",");

export function YardBookGloveboxAttachments({
  name = "attachment_file_ids",
  initialFileIds,
}: YardBookGloveboxAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialFileIds ?? []);
  const [selectedFiles, setSelectedFiles] = useState<GloveboxFileRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFiles, setPickerFiles] = useState<GloveboxFileRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectedFiles([]);
      return;
    }

    let active = true;
    const supabase = createClient();
    supabase
      .from("glovebox_files")
      .select(FILE_SELECT)
      .in("id", selectedIds)
      .eq("is_deleted", false)
      .then(({ data }) => {
        if (!active) return;
        const rows = ((data ?? []) as unknown as GloveboxFileRow[]).sort(
          (a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id)
        );
        setSelectedFiles(rows);
      });

    return () => {
      active = false;
    };
  }, [selectedIds]);

  const loadPickerFiles = useCallback(async () => {
    setPickerFiles(null);
    const supabase = createClient();
    const { data } = await supabase
      .from("glovebox_files")
      .select(FILE_SELECT)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(80);
    setPickerFiles((data ?? []) as unknown as GloveboxFileRow[]);
  }, []);

  const addFile = useCallback((file: GloveboxFileRow) => {
    setSelectedIds((current) => (current.includes(file.id) ? current : [...current, file.id]));
    setSelectedFiles((current) =>
      current.some((existing) => existing.id === file.id) ? current : [...current, file]
    );
  }, []);

  const removeFile = useCallback((id: string) => {
    setSelectedIds((current) => current.filter((fileId) => fileId !== id));
    setSelectedFiles((current) => current.filter((file) => file.id !== id));
  }, []);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setBusy(true);
      setError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Please sign in again to upload.");

        for (const file of files) {
          const { fileId, storagePath } = await uploadGloveboxFile({
            userId: user.id,
            file,
            source: "yard_book",
            collection: "Yard Book",
          });
          addFile({
            id: fileId,
            storage_path: storagePath,
            title: file.name.replace(/\.[^.]+$/, ""),
            original_filename: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            kind: null,
            collection: "Yard Book",
            tags: [],
            page_count: null,
            extraction_status: "pending",
            source: "yard_book",
            conversation_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not upload file.");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [addFile]
  );

  return (
    <section>
      <input type="hidden" name={name} value={JSON.stringify(selectedIds)} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-text-muted text-xs font-semibold tracking-wider uppercase">
          Glovebox Attachments
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPickerOpen(true);
              loadPickerFiles();
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-yard-book/30 hover:bg-yard-book/10 hover:text-yard-book-light"
          >
            <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Choose
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-yard-book/20 bg-yard-book/15 px-3 py-1.5 text-xs font-semibold text-yard-book-light transition-colors hover:bg-yard-book/25 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Upload
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(event) => uploadFiles(Array.from(event.target.files ?? []))}
      />

      {selectedFiles.length > 0 ? (
        <div className="space-y-2">
          {selectedFiles.map((file) => (
            <AttachmentRow
              key={file.id}
              file={file}
              trailing={
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-text-muted transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${file.title}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-sm text-text-muted">
          Attach files from Glovebox or upload files that should stay with this Yard Book entry.
        </div>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <GloveboxPickerModal
        open={pickerOpen}
        files={pickerFiles}
        selectedIds={selectedSet}
        onClose={() => setPickerOpen(false)}
        onPick={(file) => addFile(file)}
      />
    </section>
  );
}

function GloveboxPickerModal({
  open,
  files,
  selectedIds,
  onClose,
  onPick,
}: {
  open: boolean;
  files: GloveboxFileRow[] | null;
  selectedIds: Set<string>;
  onClose: () => void;
  onPick: (file: GloveboxFileRow) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center">
      <div className="m-4 w-full max-w-lg rounded-2xl border border-white/[0.08] bg-bg-alt p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Choose from Glovebox</h3>
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
          <p className="py-8 text-center text-sm text-text-muted">No files in Glovebox yet.</p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {files.map((file) => {
              const selected = selectedIds.has(file.id);
              return (
                <button
                  key={file.id}
                  type="button"
                  disabled={selected}
                  onClick={() => {
                    onPick(file);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] disabled:opacity-55"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yard-book/15">
                    <FileText className="h-4 w-4 text-yard-book-light" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{file.title}</p>
                    <p className="truncate text-xs text-text-muted">
                      {kindLabel(file.kind) ?? shortMime(file.mime_type)}
                      {" · "}
                      {formatFileSize(file.size_bytes)}
                    </p>
                  </div>
                  {selected && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yard-book/20 text-yard-book-light">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AttachmentRow({ file, trailing }: { file: GloveboxFileRow; trailing: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yard-book/15">
        <FileText className="h-4 w-4 text-yard-book-light" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">{file.title}</p>
        <p className="truncate text-xs text-text-muted">
          {kindLabel(file.kind) ?? shortMime(file.mime_type)}
          {" · "}
          {formatFileSize(file.size_bytes)}
        </p>
      </div>
      {trailing}
    </div>
  );
}

function shortMime(mime: string): string {
  const value = (mime || "").toLowerCase();
  if (value === "application/pdf") return "PDF";
  if (value.startsWith("image/")) return value.split("/")[1]?.toUpperCase() ?? "IMAGE";
  if (value.includes("spreadsheet") || value.includes("excel")) return "XLSX";
  if (value.includes("csv")) return "CSV";
  if (value.includes("wordprocessingml")) return "DOCX";
  if (value.startsWith("text/")) return "TEXT";
  return "FILE";
}
