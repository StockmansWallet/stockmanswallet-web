"use client";

// Compact plus-menu attachment control for the Brangus chat composer.
// Uploads files via the same backend the Files tool page uses; queued files
// are attached to the next user turn.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FolderOpen, Loader2, Paperclip, X } from "lucide-react";
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
  children: ReactNode;
}

export function BrangusAttachmentRow({
  userId,
  conversationId,
  attachedFiles,
  onAdd,
  onRemove,
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [filePickerItems, setFilePickerItems] = useState<AttachmentChip[] | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

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

  const loadSavedFiles = useCallback(async () => {
    if (!userId) return;
    setFilePickerItems(null);
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
    setFilePickerItems((data ?? []) as AttachmentChip[]);
  }, [userId]);

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setDragging(false);
      const files = Array.from(event.dataTransfer.files ?? []);
      await handleFiles(files);
    },
    [handleFiles],
  );

  return (
    <div
      className={`relative transition ${
        dragging ? "rounded-[26px] bg-amber-500/[0.04] ring-1 ring-amber-400/35" : ""
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepthRef.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => {
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragging(false);
      }}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[26px] border border-dashed border-amber-300/45 bg-black/25 text-xs font-medium text-amber-100/90 backdrop-blur-[1px]">
          Drop to attach
        </div>
      )}

      {(attachedFiles.length > 0 || error) && (
        <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
          {attachedFiles.map((file) => (
            <span
              key={file.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/10 bg-amber-500/15 px-2.5 py-1 text-xs text-amber-200 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            >
              <span className="max-w-[200px] truncate">{file.title}</span>
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="text-amber-200/70 transition hover:text-amber-100"
                aria-label={`Remove ${file.title}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {error && <span className="text-xs text-red-300">{error}</span>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            disabled={busy || !userId}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-muted transition hover:bg-white/10 hover:text-text-secondary disabled:opacity-50"
            aria-label="Add attachment"
            aria-expanded={menuOpen}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </button>

          {menuOpen && (
            <div className="absolute bottom-full left-0 z-30 mb-2 w-52 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-3 shadow-2xl shadow-black/35 backdrop-blur-xl backdrop-saturate-150">
              <p className="px-1 pb-2 text-[10px] font-semibold tracking-[0.16em] text-text-muted uppercase">
                Attachments
              </p>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  inputRef.current?.click();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>Attach a file</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setFilePickerOpen(true);
                  loadSavedFiles();
                }}
                disabled={!userId}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>From my Files</span>
              </button>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(event) => handleFiles(Array.from(event.target.files ?? []))}
        />

        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <ChooseFilesModal
        open={filePickerOpen}
        onClose={() => setFilePickerOpen(false)}
        items={filePickerItems}
        existingIds={new Set(attachedFiles.map((f) => f.id))}
        onPicked={onAdd}
      />
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

function ChooseFilesModal({
  open,
  onClose,
  items,
  existingIds,
  onPicked,
}: {
  open: boolean;
  onClose: () => void;
  items: AttachmentChip[] | null;
  existingIds: Set<string>;
  onPicked: (file: AttachmentChip) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center">
      <div className="m-4 w-full max-w-md rounded-2xl bg-neutral-950 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Choose files</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 hover:bg-white/5"
            aria-label="Close file picker"
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
                      onClose();
                    }}
                    className="flex w-full items-center gap-2 px-1 py-2 text-left text-sm text-white hover:bg-white/[0.04] disabled:opacity-40"
                  >
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="shrink-0 text-xs text-white/40">
                      {shortMime(item.mime_type)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
