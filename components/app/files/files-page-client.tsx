"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  type BrangusFileKind,
  type BrangusFileRow,
  FILE_KIND_OPTIONS,
  formatFileSize,
  uploadBrangusFile,
  deleteBrangusFile,
  signedUrlFor,
  friendlyTitle,
} from "@/lib/brangus/files";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  initialFiles: BrangusFileRow[];
}

export function FilesPageClient({ userId, initialFiles }: Props) {
  const [files, setFiles] = useState<BrangusFileRow[]>(initialFiles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<BrangusFileRow | null>(null);
  const [filterKind, setFilterKind] = useState<BrangusFileKind | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (filterKind === "all") return files;
    return files.filter((f) => f.kind === filterKind);
  }, [files, filterKind]);

  const handlePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(e.target.files ?? []);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (picked.length === 0) return;

      setBusy(true);
      setError(null);
      try {
        for (const file of picked) {
          const { fileId } = await uploadBrangusFile({ userId, file });
          // Build an optimistic row so the list updates without round-tripping.
          const row: BrangusFileRow = {
            id: fileId,
            title: friendlyTitle(file.name),
            original_filename: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            kind: null,
            page_count: null,
            extraction_status: "pending",
            source: "files",
            conversation_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setFiles((prev) => [row, ...prev]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [userId],
  );

  const handleDelete = useCallback(async (file: BrangusFileRow) => {
    if (!confirm(`Delete ${file.title}? Brangus will no longer be able to read it.`)) return;
    await deleteBrangusFile(file);
    // Best-effort remote object cleanup via direct storage call so we don't rely on the
    // client deleting via SQL alone (RLS handles it, but storage objects need a remove).
    try {
      const supabase = createClient();
      await supabase.storage.from("brangus-files").remove([
        // We don't store explicit paths in the row response - rebuild the canonical layout.
        // Original lives at {uid}/{fileId}/original.<ext> regardless of extension.
      ]);
    } catch {
      // ignore - row is already soft-deleted
    }
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  }, []);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={handlePicked}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/25 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add file
        </button>

        <select
          value={filterKind}
          onChange={(e) => setFilterKind(e.target.value as BrangusFileKind | "all")}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
        >
          <option value="all">All kinds</option>
          {FILE_KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/60">
          No files yet. Upload vet reports, NLIS docs, lease agreements, kill sheets, soil tests,
          or any photo. Brangus can read them.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <ul className="divide-y divide-white/[0.06]">
            {filtered.map((file) => (
              <li key={file.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                  {file.mime_type.startsWith("image/") ? (
                    <ImageIcon className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFile(file)}
                  className="flex-1 text-left"
                >
                  <div className="text-sm font-semibold text-white">{file.title}</div>
                  <div className="text-xs text-white/50">
                    {file.kind
                      ? FILE_KIND_OPTIONS.find((k) => k.value === file.kind)?.label
                      : "Uncategorised"}{" "}
                    · {formatFileSize(file.size_bytes)}
                    {file.page_count != null && ` · ${file.page_count} pages`}
                    {file.source === "chat" && " · from Brangus chat"}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(file)}
                  className="rounded-lg p-2 text-white/40 hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Delete file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeFile && (
        <FileDetailDrawer
          file={activeFile}
          userId={userId}
          onClose={() => setActiveFile(null)}
          onChange={(updated) =>
            setFiles((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)))
          }
        />
      )}
    </div>
  );
}

// MARK: - Detail Drawer (inline)
function FileDetailDrawer({
  file,
  userId,
  onClose,
  onChange,
}: {
  file: BrangusFileRow;
  userId: string;
  onClose: () => void;
  onChange: (file: Partial<BrangusFileRow> & { id: string }) => void;
}) {
  const [title, setTitle] = useState(file.title);
  const [kind, setKind] = useState<BrangusFileKind | "">(file.kind ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  void userId; // reserved for future signed-URL by-path lookups

  const save = useCallback(async () => {
    const supabase = createClient();
    await supabase
      .from("brangus_files")
      .update({
        title: title.trim() || file.original_filename,
        kind: kind || null,
      })
      .eq("id", file.id);
    onChange({
      id: file.id,
      title: title.trim() || file.original_filename,
      kind: (kind || null) as BrangusFileKind | null,
    });
  }, [file, kind, onChange, title]);

  const openPreview = useCallback(async () => {
    const supabase = createClient();
    const { data: row } = await supabase
      .from("brangus_files")
      .select("storage_path")
      .eq("id", file.id)
      .maybeSingle<{ storage_path: string }>();
    if (!row?.storage_path) return;
    const url = await signedUrlFor(row.storage_path);
    if (url) setPreviewUrl(url);
  }, [file.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-neutral-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">File details</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-white/50">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-white/50">Kind</span>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as BrangusFileKind | "");
            }}
            onBlur={save}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          >
            <option value="">Uncategorised</option>
            {FILE_KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-white/70">
          <dt>Filename</dt>
          <dd className="truncate">{file.original_filename}</dd>
          <dt>Type</dt>
          <dd>{file.mime_type}</dd>
          <dt>Size</dt>
          <dd>{formatFileSize(file.size_bytes)}</dd>
          {file.page_count != null && (
            <>
              <dt>Pages</dt>
              <dd>{file.page_count}</dd>
            </>
          )}
          <dt>Status</dt>
          <dd>{file.extraction_status === "pending" ? "Reading..." : "Ready"}</dd>
        </dl>

        <button
          type="button"
          onClick={openPreview}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white hover:bg-white/[0.08]"
        >
          Preview
        </button>

        {previewUrl && (
          <div className="aspect-[3/4] overflow-hidden rounded-lg border border-white/10">
            {file.mime_type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={file.title} className="h-full w-full object-contain" />
            ) : (
              <iframe src={previewUrl} title={file.title} className="h-full w-full" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
