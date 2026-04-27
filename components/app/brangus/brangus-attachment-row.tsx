"use client";

// Paperclip + drag-drop attachment row for the Brangus chat composer.
// Uploads files via the same backend the Files tool page uses; the
// returned BrangusFile row is queued onto the next user turn so it
// arrives at Claude as a multi-modal content block.

import { useCallback, useRef, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import { uploadBrangusFile } from "@/lib/brangus/files";
import { createClient } from "@/lib/supabase/client";

export interface AttachmentChip {
  id: string;
  title: string;
  original_filename: string;
  mime_type: string;
  storage_path: string;
  extracted_text_path: string | null;
  extraction_status: string;
}

interface Props {
  userId: string | null;
  conversationId: string | null;
  attachedFiles: AttachmentChip[];
  onAdd: (file: AttachmentChip) => void;
  onRemove: (fileId: string) => void;
}

export function BrangusAttachmentRow({
  userId,
  conversationId,
  attachedFiles,
  onAdd,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!userId || files.length === 0) return;
      setBusy(true);
      setError(null);
      try {
        for (const file of files) {
          const { fileId, storagePath } = await uploadBrangusFile({
            userId,
            file,
            source: "chat",
            conversationId,
          });
          onAdd({
            id: fileId,
            title: file.name.replace(/\.[^.]+$/, ""),
            original_filename: file.name,
            mime_type: file.type || "application/octet-stream",
            storage_path: storagePath,
            extracted_text_path: null,
            extraction_status: "pending",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [conversationId, onAdd, userId],
  );

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const files = Array.from(event.dataTransfer.files ?? []);
      await handleFiles(files);
    },
    [handleFiles],
  );

  return (
    <div
      className={`mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 transition ${
        dragging ? "border-amber-400/60 bg-amber-500/5" : "border-white/10"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || !userId}
        className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.08] disabled:opacity-50"
        aria-label="Attach a file"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
        Attach
      </button>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
      />

      <FilesPickerButton
        userId={userId}
        existingIds={new Set(attachedFiles.map((f) => f.id))}
        onPicked={onAdd}
      />

      {attachedFiles.map((file) => (
        <span
          key={file.id}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-200"
        >
          <span className="max-w-[200px] truncate">{file.title}</span>
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            className="text-amber-200/70 hover:text-amber-100"
            aria-label={`Remove ${file.title}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <span className="text-[11px] text-white/30">
        {dragging ? "Drop to attach" : "or drag a file here"}
      </span>

      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}

// Friendly short label for noisy mime types (e.g. the 73-char DOCX vendor string).
function shortMime(mime: string): string {
  const m = (mime ?? "").toLowerCase();
  if (m === "application/pdf") return "PDF";
  if (m.startsWith("image/")) return m.split("/")[1].toUpperCase();
  if (m.includes("wordprocessingml")) return "DOCX";
  if (m.includes("spreadsheetml")) return "XLSX";
  if (m.includes("presentationml")) return "PPTX";
  if (m === "text/csv") return "CSV";
  if (m === "text/plain") return "TXT";
  if (m === "text/markdown") return "MD";
  if (m === "application/rtf" || m === "text/rtf") return "RTF";
  return m.split("/").pop()?.toUpperCase() ?? "FILE";
}

// Minimal "From my Files" picker - inline so we don't bloat the parent.
function FilesPickerButton({
  userId,
  existingIds,
  onPicked,
}: {
  userId: string | null;
  existingIds: Set<string>;
  onPicked: (file: AttachmentChip) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AttachmentChip[] | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("brangus_files")
      .select(
        "id, title, original_filename, mime_type, storage_path, extracted_text_path, extraction_status",
      )
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as AttachmentChip[]);
  }, [userId]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          load();
        }}
        disabled={!userId}
        className="rounded-md bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.08] disabled:opacity-50"
      >
        From my Files
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center">
          <div className="m-4 w-full max-w-md rounded-2xl bg-neutral-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Choose files</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-white/60 hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {items === null ? (
              <div className="flex justify-center py-6 text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-6 text-center text-sm text-white/50">
                No files yet. Upload one from the Tools tab.
              </div>
            ) : (
              <ul className="max-h-72 divide-y divide-white/[0.06] overflow-y-auto">
                {items.map((item) => {
                  const already = existingIds.has(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={already}
                        onClick={() => {
                          onPicked(item);
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-1 py-2 text-left text-sm text-white hover:bg-white/[0.04] disabled:opacity-40"
                      >
                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        <span className="shrink-0 text-xs text-white/40">{shortMime(item.mime_type)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
