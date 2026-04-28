"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Database,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  ImageIcon,
  Layers3,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  type BrangusDetectedFileType,
  type BrangusFileRow,
  DEFAULT_FILE_CATEGORY_OPTIONS,
  detectFileType,
  fileCategoryLabel,
  FILE_TYPE_LABELS,
  formatFileSize,
  uploadBrangusFile,
  deleteBrangusFile,
  signedUrlFor,
  friendlyTitle,
} from "@/lib/brangus/files";
import { createClient } from "@/lib/supabase/client";
import { PageHeaderActionsPortal } from "@/components/ui/page-header-actions-portal";

interface Props {
  userId: string;
  initialFiles: BrangusFileRow[];
}

type GroupMode = "category" | "type" | "source" | "none";

const ALL_COLLECTIONS = "__all__";
const UNCATEGORISED = "Uncategorised";

export function FilesPageClient({ userId, initialFiles }: Props) {
  const [files, setFiles] = useState<BrangusFileRow[]>(initialFiles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<BrangusFileRow | null>(null);
  const [activeCollection, setActiveCollection] = useState(ALL_COLLECTIONS);
  const [groupMode, setGroupMode] = useState<GroupMode>("category");
  const [query, setQuery] = useState("");
  const [customCollections, setCustomCollections] = useState<string[]>(() =>
    loadCustomCollections(userId)
  );
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [collectionDraft, setCollectionDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveCustomCollections(userId, customCollections);
  }, [customCollections, userId]);

  const categoryOptions = useMemo(() => {
    const values = new Set(DEFAULT_FILE_CATEGORY_OPTIONS);
    for (const collection of customCollections) {
      const label = collection.trim();
      if (label) values.add(label);
    }
    for (const file of files) {
      const label = fileCategoryLabel(file);
      if (label !== UNCATEGORISED) values.add(label);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [customCollections, files]);

  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const file of files) {
      const label = fileCategoryLabel(file);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return counts;
  }, [files]);

  const visibleFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return files.filter((file) => {
      const category = fileCategoryLabel(file);
      if (activeCollection !== ALL_COLLECTIONS && category !== activeCollection) return false;
      if (!needle) return true;
      return [
        file.title,
        file.original_filename,
        category,
        FILE_TYPE_LABELS[detectFileType(file)],
        file.mime_type,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [activeCollection, files, query]);

  const groupedFiles = useMemo(() => {
    const groups = new Map<string, BrangusFileRow[]>();
    for (const file of visibleFiles) {
      const key = groupLabel(file, groupMode);
      groups.set(key, [...(groups.get(key) ?? []), file]);
    }
    return Array.from(groups.entries());
  }, [groupMode, visibleFiles]);

  const stats = useMemo(() => {
    const typeCounts = files.reduce(
      (acc, file) => {
        const type = detectFileType(file);
        acc[type] = (acc[type] ?? 0) + 1;
        return acc;
      },
      {} as Partial<Record<BrangusDetectedFileType, number>>
    );
    return {
      total: files.length,
      collections: collectionCounts.size,
      pdfs: typeCounts.pdf ?? 0,
      images: typeCounts.image ?? 0,
    };
  }, [collectionCounts.size, files]);

  const handlePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(e.target.files ?? []);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (picked.length === 0) return;

      setBusy(true);
      setError(null);
      try {
        for (const file of picked) {
          const { fileId, storagePath } = await uploadBrangusFile({ userId, file });
          const row: BrangusFileRow = {
            id: fileId,
            storage_path: storagePath,
            title: friendlyTitle(file.name),
            original_filename: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            kind: null,
            category: null,
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
    [userId]
  );

  const handleDelete = useCallback(async (file: BrangusFileRow) => {
    if (!confirm(`Delete ${file.title}? Brangus will no longer be able to read it.`)) return;
    await deleteBrangusFile(file);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    setActiveFile((current) => (current?.id === file.id ? null : current));
  }, []);

  const handleFileChange = useCallback((updated: Partial<BrangusFileRow> & { id: string }) => {
    setFiles((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
    setActiveFile((current) => (current?.id === updated.id ? { ...current, ...updated } : current));
  }, []);

  const handleCreateCollection = useCallback(() => {
    const nextCollection = collectionDraft.trim();
    if (!nextCollection) return;
    setCustomCollections((prev) =>
      prev.some((collection) => collection.toLowerCase() === nextCollection.toLowerCase())
        ? prev
        : [...prev, nextCollection]
    );
    setActiveCollection(nextCollection);
    setCollectionDraft("");
    setIsCreatingCollection(false);
  }, [collectionDraft]);

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handlePicked} />

      <PageHeaderActionsPortal>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="bg-brand hover:bg-brand-dark inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add file
        </button>
      </PageHeaderActionsPortal>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Files" value={stats.total} />
        <StatTile label="Collections" value={stats.collections} />
        <StatTile label="PDFs" value={stats.pdfs} />
        <StatTile label="Images" value={stats.images} />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 md:flex-row md:items-center md:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, categories, or types"
            className="focus:border-brand/50 h-10 w-full rounded-lg border border-white/10 bg-black/20 pr-3 pl-9 text-sm text-white outline-none placeholder:text-white/35"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={groupMode}
            onChange={(e) => setGroupMode(e.target.value as GroupMode)}
            className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
            aria-label="Group files"
          >
            <option value="category">Group by collection</option>
            <option value="type">Group by file type</option>
            <option value="source">Group by source</option>
            <option value="none">No grouping</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-white/10 bg-white/[0.02] p-2 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/45 uppercase">
              <Folder className="h-4 w-4" />
              Collections
            </div>
            <button
              type="button"
              onClick={() => setIsCreatingCollection((open) => !open)}
              className="rounded-lg p-1.5 text-white/45 hover:bg-white/[0.05] hover:text-white"
              aria-label="New collection"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {isCreatingCollection && (
            <div className="mb-2 flex gap-1 px-2">
              <input
                value={collectionDraft}
                onChange={(e) => setCollectionDraft(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleCreateCollection();
                  if (event.key === "Escape") {
                    setCollectionDraft("");
                    setIsCreatingCollection(false);
                  }
                }}
                placeholder="Collection name"
                className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 text-xs text-white outline-none placeholder:text-white/35 focus:border-brand/50"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateCollection}
                className="bg-brand/15 text-brand hover:bg-brand/25 rounded-lg px-2 text-xs font-semibold"
              >
                Add
              </button>
            </div>
          )}

          <CollectionButton
            label="All files"
            count={files.length}
            active={activeCollection === ALL_COLLECTIONS}
            onClick={() => setActiveCollection(ALL_COLLECTIONS)}
          />
          <CollectionButton
            label={UNCATEGORISED}
            count={collectionCounts.get(UNCATEGORISED) ?? 0}
            active={activeCollection === UNCATEGORISED}
            onClick={() => setActiveCollection(UNCATEGORISED)}
          />

          <div className="my-2 h-px bg-white/[0.06]" />

          {categoryOptions.map((category) => (
            <CollectionButton
              key={category}
              label={category}
              count={collectionCounts.get(category) ?? 0}
              active={activeCollection === category}
              onClick={() => setActiveCollection(category)}
            />
          ))}
        </aside>

        <main className="min-w-0 rounded-xl border border-white/10 bg-white/[0.02]">
          {visibleFiles.length === 0 ? (
            <div className="p-8 text-center text-sm text-white/60">
              {files.length === 0
                ? "No files yet. Upload documents or photos and they will appear here."
                : "No files match this view."}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {groupedFiles.map(([group, groupFiles]) => (
                <section key={group} className="min-w-0">
                  {groupMode !== "none" && (
                    <div className="flex items-center justify-between bg-white/[0.025] px-4 py-2">
                      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold tracking-wide text-white/55 uppercase">
                        {groupMode === "type" ? (
                          <FileTypeIcon type={detectFileType(groupFiles[0])} />
                        ) : groupMode === "source" ? (
                          <Layers3 className="h-4 w-4" />
                        ) : (
                          <FolderOpen className="h-4 w-4" />
                        )}
                        <span className="truncate">{group}</span>
                      </div>
                      <span className="text-xs text-white/35">{groupFiles.length}</span>
                    </div>
                  )}

                  <ul className="divide-y divide-white/[0.05]">
                    {groupFiles.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        onOpen={() => setActiveFile(file)}
                        onDelete={() => handleDelete(file)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>

      {activeFile && (
        <FileDetailDrawer
          file={activeFile}
          categoryOptions={categoryOptions}
          onClose={() => setActiveFile(null)}
          onChange={handleFileChange}
        />
      )}
    </div>
  );
}

function customCollectionsStorageKey(userId: string): string {
  return `stockmanswallet:file-collections:${userId}`;
}

function loadCustomCollections(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(customCollectionsStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function saveCustomCollections(userId: string, collections: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(customCollectionsStorageKey(userId), JSON.stringify(collections));
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-xs font-medium text-white/45">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function CollectionButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
        active ? "bg-brand/15 text-brand" : "text-white/70 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {active ? (
        <FolderOpen className="h-4 w-4 shrink-0" />
      ) : (
        <Folder className="h-4 w-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-xs opacity-55">{count}</span>
    </button>
  );
}

function FileRow({
  file,
  onOpen,
  onDelete,
}: {
  file: BrangusFileRow;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const type = detectFileType(file);
  const category = fileCategoryLabel(file);

  return (
    <li className="flex min-w-0 items-center gap-3 px-4 py-3">
      <div className="bg-brand/15 text-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        <FileTypeIcon type={type} />
      </div>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-semibold text-white">{file.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50">
          <span>{category}</span>
          <span className="text-white/20">/</span>
          <span>{FILE_TYPE_LABELS[type]}</span>
          <span className="text-white/20">/</span>
          <span>{formatFileSize(file.size_bytes)}</span>
          {file.page_count != null && (
            <>
              <span className="text-white/20">/</span>
              <span>{file.page_count} pages</span>
            </>
          )}
          {file.source === "chat" && (
            <>
              <span className="text-white/20">/</span>
              <span>from Brangus chat</span>
            </>
          )}
        </div>
      </button>

      <StatusPill status={file.extraction_status} />

      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg p-2 text-white/40 hover:bg-red-500/10 hover:text-red-300"
        aria-label="Delete file"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function StatusPill({ status }: { status: BrangusFileRow["extraction_status"] }) {
  const label =
    status === "pending"
      ? "Reading"
      : status === "failed"
        ? "Failed"
        : status === "unsupported"
          ? "Stored"
          : "Ready";
  const className =
    status === "pending"
      ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
      : status === "failed"
        ? "border-red-400/25 bg-red-400/10 text-red-200"
        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";

  return (
    <span
      className={`hidden shrink-0 rounded-full border px-2 py-1 text-xs sm:inline-flex ${className}`}
    >
      {label}
    </span>
  );
}

function FileTypeIcon({ type }: { type: BrangusDetectedFileType }) {
  const className = "h-4 w-4";
  switch (type) {
    case "image":
      return <ImageIcon className={className} />;
    case "spreadsheet":
      return <FileSpreadsheet className={className} />;
    case "data":
      return <Database className={className} />;
    case "pdf":
    case "document":
      return <FileText className={className} />;
    default:
      return <File className={className} />;
  }
}

function groupLabel(file: BrangusFileRow, groupMode: GroupMode): string {
  if (groupMode === "type") return FILE_TYPE_LABELS[detectFileType(file)];
  if (groupMode === "source")
    return file.source === "chat" ? "From Brangus chat" : "Uploaded in Files";
  if (groupMode === "none") return "Files";
  return fileCategoryLabel(file);
}

function FileDetailDrawer({
  file,
  categoryOptions,
  onClose,
  onChange,
}: {
  file: BrangusFileRow;
  categoryOptions: string[];
  onClose: () => void;
  onChange: (file: Partial<BrangusFileRow> & { id: string }) => void;
}) {
  const [title, setTitle] = useState(file.title);
  const [category, setCategory] = useState(file.category?.trim() || "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const type = detectFileType(file);

  const saveValues = useCallback(
    async (nextTitle: string, nextCategory: string) => {
      const cleanTitle = nextTitle.trim() || file.original_filename;
      const cleanCategory = nextCategory.trim() || null;
      const supabase = createClient();
      await supabase
        .from("brangus_files")
        .update({
          title: cleanTitle,
          category: cleanCategory,
        })
        .eq("id", file.id);
      onChange({
        id: file.id,
        title: cleanTitle,
        category: cleanCategory,
      });
    },
    [file.id, file.original_filename, onChange]
  );

  const save = useCallback(() => {
    void saveValues(title, category);
  }, [category, saveValues, title]);

  const applyCategory = useCallback(
    (nextCategory: string) => {
      setCategory(nextCategory);
      void saveValues(title, nextCategory);
    },
    [saveValues, title]
  );

  const openPreview = useCallback(async () => {
    let storagePath = file.storage_path;
    if (!storagePath) {
      const supabase = createClient();
      const { data: row } = await supabase
        .from("brangus_files")
        .select("storage_path")
        .eq("id", file.id)
        .maybeSingle<{ storage_path: string }>();
      storagePath = row?.storage_path;
    }
    if (!storagePath) return;
    const url = await signedUrlFor(storagePath);
    if (url) setPreviewUrl(url);
  }, [file.id, file.storage_path]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col gap-5 overflow-y-auto bg-neutral-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">File details</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="space-y-1">
          <span className="text-xs tracking-wide text-white/50 uppercase">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            className="focus:border-brand/50 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs tracking-wide text-white/50 uppercase">Collection</span>
          <input
            value={category}
            list="file-category-options"
            onChange={(e) => setCategory(e.target.value)}
            onBlur={save}
            placeholder="Uncategorised"
            className="focus:border-brand/50 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35"
          />
          <datalist id="file-category-options">
            {categoryOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.slice(0, 8).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => applyCategory(option)}
                className="hover:border-brand/40 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/65 hover:text-white"
              >
                {option}
              </button>
            ))}
          </div>
        </label>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm text-white/70">
          <dt className="text-white/40">Filename</dt>
          <dd className="truncate">{file.original_filename}</dd>
          <dt className="text-white/40">Detected type</dt>
          <dd>{FILE_TYPE_LABELS[type]}</dd>
          <dt className="text-white/40">MIME</dt>
          <dd className="truncate">{file.mime_type}</dd>
          <dt className="text-white/40">Size</dt>
          <dd>{formatFileSize(file.size_bytes)}</dd>
          {file.page_count != null && (
            <>
              <dt className="text-white/40">Pages</dt>
              <dd>{file.page_count}</dd>
            </>
          )}
          <dt className="text-white/40">Source</dt>
          <dd>{file.source === "chat" ? "Brangus chat" : "Files"}</dd>
          <dt className="text-white/40">Status</dt>
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
