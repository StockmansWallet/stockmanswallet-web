"use client";

import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Database,
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Check,
  ImageIcon,
  Layers3,
  Loader2,
  MoreHorizontal,
  Pencil,
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
  tagsWithFileCollection,
  uploadBrangusFile,
  deleteBrangusFile,
  signedDownloadUrlFor,
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
  const [hiddenCollections, setHiddenCollections] = useState<string[]>(() =>
    loadHiddenCollections(userId)
  );
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [collectionDraft, setCollectionDraft] = useState("");
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [openCollectionMenu, setOpenCollectionMenu] = useState<string | null>(null);
  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);
  const [dropCollection, setDropCollection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveCustomCollections(userId, customCollections);
  }, [customCollections, userId]);

  useEffect(() => {
    saveHiddenCollections(userId, hiddenCollections);
  }, [hiddenCollections, userId]);

  useEffect(() => {
    if (!openCollectionMenu) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-files-collection-menu-root]")) return;
      setOpenCollectionMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenCollectionMenu(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openCollectionMenu]);

  const categoryOptions = useMemo(() => {
    const hidden = new Set(hiddenCollections.map((collection) => collection.toLowerCase()));
    const values = new Set(DEFAULT_FILE_CATEGORY_OPTIONS);
    for (const collection of hiddenCollections) {
      values.delete(collection);
    }
    for (const collection of customCollections) {
      const label = collection.trim();
      if (label && !hidden.has(label.toLowerCase())) values.add(label);
    }
    for (const file of files) {
      const label = fileCategoryLabel(file);
      if (label !== UNCATEGORISED) values.add(label);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [customCollections, files, hiddenCollections]);

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
            tags: [],
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

  const handleDownload = useCallback(async (file: BrangusFileRow) => {
    setError(null);
    try {
      let storagePath = file.storage_path;
      if (!storagePath) {
        const supabase = createClient();
        const { data: row, error: lookupError } = await supabase
          .from("brangus_files")
          .select("storage_path")
          .eq("id", file.id)
          .maybeSingle<{ storage_path: string }>();
        if (lookupError) throw lookupError;
        storagePath = row?.storage_path;
      }
      if (!storagePath) throw new Error("Could not find the original file.");

      const url = await signedDownloadUrlFor(storagePath, file.original_filename);
      if (!url) throw new Error("Could not create a download link.");
      triggerAnchorDownload(url, file.original_filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    }
  }, []);

  const handleFileChange = useCallback((updated: Partial<BrangusFileRow> & { id: string }) => {
    setFiles((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
    setActiveFile((current) => (current?.id === updated.id ? { ...current, ...updated } : current));
  }, []);

  const moveFileToCollection = useCallback(
    async (fileId: string, nextCollection: string | null) => {
      const file = files.find((candidate) => candidate.id === fileId);
      if (!file) return;

      const currentCategory = fileCategoryLabel(file);
      const previousCategory = currentCategory === UNCATEGORISED ? null : currentCategory;
      const previousTags = file.tags ?? [];
      const cleanNext = nextCollection?.trim() || null;
      if ((previousCategory ?? null) === cleanNext) return;
      const nextTags = tagsWithFileCollection(previousTags, cleanNext);

      setError(null);
      setFiles((prev) =>
        prev.map((candidate) =>
          candidate.id === fileId ? { ...candidate, category: cleanNext, tags: nextTags } : candidate
        )
      );
      setActiveFile((current) =>
        current?.id === fileId ? { ...current, category: cleanNext, tags: nextTags } : current
      );

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("brangus_files")
        .update({ tags: nextTags })
        .eq("id", fileId);

      if (updateError) {
        setFiles((prev) =>
          prev.map((candidate) =>
            candidate.id === fileId
              ? { ...candidate, category: previousCategory, tags: previousTags }
              : candidate
          )
        );
        setActiveFile((current) =>
          current?.id === fileId
            ? { ...current, category: previousCategory, tags: previousTags }
            : current
        );
        setError(updateError.message);
      }
    },
    [files]
  );

  const handleDropOnCollection = useCallback(
    (collection: string | null) => {
      if (!draggingFileId) return;
      void moveFileToCollection(draggingFileId, collection);
      setDraggingFileId(null);
      setDropCollection(null);
    },
    [draggingFileId, moveFileToCollection]
  );

  const handleCreateCollection = useCallback(() => {
    const nextCollection = collectionDraft.trim();
    if (!nextCollection) return;
    setCustomCollections((prev) =>
      prev.some((collection) => collection.toLowerCase() === nextCollection.toLowerCase())
        ? prev
        : [...prev, nextCollection]
    );
    setHiddenCollections((prev) =>
      prev.filter((collection) => collection.toLowerCase() !== nextCollection.toLowerCase())
    );
    setActiveCollection(nextCollection);
    setCollectionDraft("");
    setIsCreatingCollection(false);
  }, [collectionDraft]);

  const renameCollection = useCallback(
    async (currentCollection: string, nextCollectionRaw: string) => {
      const nextCollection = nextCollectionRaw.trim();
      if (!nextCollection || nextCollection.toLowerCase() === currentCollection.toLowerCase()) {
        setEditingCollection(null);
        setEditingDraft("");
        return;
      }
      if (
        categoryOptions.some(
          (category) =>
            category.toLowerCase() === nextCollection.toLowerCase() &&
            category.toLowerCase() !== currentCollection.toLowerCase()
        )
      ) {
        setError("A collection with that name already exists.");
        return;
      }

      setError(null);
      const matchingFiles = files.filter((file) => fileCategoryLabel(file) === currentCollection);

      if (matchingFiles.length > 0) {
        const supabase = createClient();
        for (const file of matchingFiles) {
          const { error: updateError } = await supabase
            .from("brangus_files")
            .update({ tags: tagsWithFileCollection(file.tags, nextCollection) })
            .eq("id", file.id);
          if (updateError) {
            setError(updateError.message);
            return;
          }
        }
      }

      setFiles((prev) =>
        prev.map((file) =>
          fileCategoryLabel(file) === currentCollection
            ? {
                ...file,
                category: nextCollection,
                tags: tagsWithFileCollection(file.tags, nextCollection),
              }
            : file
        )
      );
      setCustomCollections((prev) => {
        const withoutCurrent = prev.filter(
          (collection) => collection.toLowerCase() !== currentCollection.toLowerCase()
        );
        return withoutCurrent.some(
          (collection) => collection.toLowerCase() === nextCollection.toLowerCase()
        )
          ? withoutCurrent
          : [...withoutCurrent, nextCollection];
      });
      setHiddenCollections((prev) => {
        const next = prev.filter(
          (collection) => collection.toLowerCase() !== nextCollection.toLowerCase()
        );
        return next.some((collection) => collection.toLowerCase() === currentCollection.toLowerCase())
          ? next
          : [...next, currentCollection];
      });
      setActiveCollection((current) => (current === currentCollection ? nextCollection : current));
      setEditingCollection(null);
      setEditingDraft("");
    },
    [categoryOptions, files]
  );

  const deleteCollection = useCallback(
    async (collectionToDelete: string) => {
      const filesInCollection = files.filter(
        (file) => fileCategoryLabel(file) === collectionToDelete
      );
      if (
        !confirm(
          filesInCollection.length > 0
            ? `Delete ${collectionToDelete}? Files in it will move to Uncategorised.`
            : `Delete ${collectionToDelete}?`
        )
      ) {
        return;
      }

      setError(null);
      if (filesInCollection.length > 0) {
        const supabase = createClient();
        for (const file of filesInCollection) {
          const { error: updateError } = await supabase
            .from("brangus_files")
            .update({ tags: tagsWithFileCollection(file.tags, null) })
            .eq("id", file.id);
          if (updateError) {
            setError(updateError.message);
            return;
          }
        }
      }

      setFiles((prev) =>
        prev.map((file) =>
          fileCategoryLabel(file) === collectionToDelete
            ? { ...file, category: null, tags: tagsWithFileCollection(file.tags, null) }
            : file
        )
      );
      setCustomCollections((prev) =>
        prev.filter((collection) => collection.toLowerCase() !== collectionToDelete.toLowerCase())
      );
      setHiddenCollections((prev) =>
        prev.some((collection) => collection.toLowerCase() === collectionToDelete.toLowerCase())
          ? prev
          : [...prev, collectionToDelete]
      );
      setActiveCollection((current) =>
        current === collectionToDelete ? ALL_COLLECTIONS : current
      );
      if (editingCollection === collectionToDelete) {
        setEditingCollection(null);
        setEditingDraft("");
      }
    },
    [editingCollection, files]
  );

  const activeCollectionLabel =
    activeCollection === ALL_COLLECTIONS ? "All files" : activeCollection;

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
            dropActive={dropCollection === UNCATEGORISED}
            onDragOver={(event) => {
              if (!draggingFileId) return;
              event.preventDefault();
              setDropCollection(UNCATEGORISED);
            }}
            onDragLeave={() => setDropCollection(null)}
            onDrop={() => handleDropOnCollection(null)}
          />

          <div className="my-2 h-px bg-white/[0.06]" />

          {categoryOptions.map((category) => (
            <div key={category}>
              {editingCollection === category ? (
                <CollectionEditRow
                  value={editingDraft}
                  onChange={setEditingDraft}
                  onSave={() => void renameCollection(category, editingDraft)}
                  onCancel={() => {
                    setEditingCollection(null);
                    setEditingDraft("");
                  }}
                />
              ) : (
                <CollectionButton
                  label={category}
                  count={collectionCounts.get(category) ?? 0}
                  active={activeCollection === category}
                  menuOpen={openCollectionMenu === category}
                  onClick={() => {
                    setActiveCollection(category);
                    setOpenCollectionMenu(null);
                  }}
                  dropActive={dropCollection === category}
                  onDragOver={(event) => {
                    if (!draggingFileId) return;
                    event.preventDefault();
                    setDropCollection(category);
                  }}
                  onDragLeave={() => setDropCollection(null)}
                  onDrop={() => handleDropOnCollection(category)}
                  onToggleMenu={() =>
                    setOpenCollectionMenu((current) => (current === category ? null : category))
                  }
                  onRename={() => {
                    setEditingCollection(category);
                    setEditingDraft(category);
                    setOpenCollectionMenu(null);
                  }}
                  onDelete={() => {
                    setOpenCollectionMenu(null);
                    void deleteCollection(category);
                  }}
                />
              )}
            </div>
          ))}
        </aside>

        <main className="min-w-0 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="border-b border-white/[0.06] p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/45 uppercase">
                  <FolderOpen className="h-4 w-4" />
                  <span className="truncate">{activeCollectionLabel}</span>
                  <span className="text-white/30">{visibleFiles.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
                <div className="relative min-w-0 sm:w-48 lg:w-56">
                  <Search className="text-text-muted pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search files"
                    aria-label="Search files"
                    className="bg-surface text-text-primary placeholder:text-text-muted focus:ring-brand/20 h-8 w-full rounded-full pr-4 pl-9 text-xs transition-all outline-none focus:ring-2"
                  />
                </div>

                <select
                  value={groupMode}
                  onChange={(e) => setGroupMode(e.target.value as GroupMode)}
                  className="h-9 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
                  aria-label="Group files"
                >
                  <option value="category">Group by collection</option>
                  <option value="type">Group by file type</option>
                  <option value="source">Group by source</option>
                  <option value="none">No grouping</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-3">
            {visibleFiles.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/60">
                {files.length === 0
                  ? "No files yet. Upload documents or photos and they will appear here."
                  : "No files match this view."}
              </div>
            ) : (
              <div className="space-y-4">
                {groupedFiles.map(([group, groupFiles]) => (
                  <section key={group} className="min-w-0">
                    {groupMode !== "none" && (
                      <div className="mb-2 flex items-center justify-between px-1">
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

                    <ul className="space-y-2">
                      {groupFiles.map((file) => (
                        <FileRow
                          key={file.id}
                          file={file}
                          onOpen={() => setActiveFile(file)}
                          onDownload={() => void handleDownload(file)}
                          onDelete={() => handleDelete(file)}
                          onDragStart={() => {
                            setDraggingFileId(file.id);
                            setOpenCollectionMenu(null);
                          }}
                          onDragEnd={() => {
                            setDraggingFileId(null);
                            setDropCollection(null);
                          }}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {activeFile && (
        <FileDetailDrawer
          file={activeFile}
          categoryOptions={categoryOptions}
          onClose={() => setActiveFile(null)}
          onDownload={() => void handleDownload(activeFile)}
          onChange={handleFileChange}
        />
      )}
    </div>
  );
}

function customCollectionsStorageKey(userId: string): string {
  return `stockmanswallet:file-collections:${userId}`;
}

function hiddenCollectionsStorageKey(userId: string): string {
  return `stockmanswallet:hidden-file-collections:${userId}`;
}

function loadCustomCollections(userId: string): string[] {
  return loadCollectionList(customCollectionsStorageKey(userId));
}

function loadHiddenCollections(userId: string): string[] {
  return loadCollectionList(hiddenCollectionsStorageKey(userId));
}

function loadCollectionList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
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
  saveCollectionList(customCollectionsStorageKey(userId), collections);
}

function saveHiddenCollections(userId: string, collections: string[]): void {
  saveCollectionList(hiddenCollectionsStorageKey(userId), collections);
}

function saveCollectionList(key: string, collections: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(collections));
}

function CollectionButton({
  label,
  count,
  active,
  menuOpen,
  dropActive,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggleMenu,
  onRename,
  onDelete,
}: {
  label: string;
  count: number;
  active: boolean;
  menuOpen?: boolean;
  dropActive?: boolean;
  onClick: () => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
  onToggleMenu?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-files-collection-menu-root={onToggleMenu ? "" : undefined}
      className={`group relative flex w-full items-center rounded-lg px-2 py-2 pr-9 text-left text-sm transition ${
        dropActive
          ? "bg-brand/25 text-brand ring-1 ring-brand/35"
          : active
            ? "bg-brand/15 text-brand"
            : "text-white/70 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2">
        {active ? (
          <FolderOpen className="h-4 w-4 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      </button>
      {count > 0 && (
        <span
          className={`text-brand border-brand/20 absolute right-3 flex h-5 min-w-5 items-center justify-center rounded-full border bg-brand/15 px-1.5 text-[10px] font-bold tabular-nums transition ${
            onToggleMenu &&
            (menuOpen ? "opacity-0" : "group-hover:opacity-0 group-focus-within:opacity-0")
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
      {onToggleMenu && (
        <>
          <button
            type="button"
            onClick={onToggleMenu}
            className={`absolute right-2 rounded-md p-1 text-white/35 transition hover:bg-white/[0.08] hover:text-white focus:bg-white/[0.08] focus:text-white ${
              menuOpen
                ? "opacity-100"
                : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
            }`}
            aria-label={`Manage ${label}`}
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute top-9 right-1 z-50 w-40 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl backdrop-saturate-150"
            >
              {onRename && (
                <button
                  type="button"
                  onClick={onRename}
                  role="menuitem"
                  className="text-text-muted hover:text-text-primary flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-white/[0.06]"
                >
                  <Pencil className="h-4 w-4" />
                  Rename
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  role="menuitem"
                  className="text-error hover:bg-error/10 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CollectionEditRow({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSave();
          if (event.key === "Escape") onCancel();
        }}
        className="h-7 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2 text-xs text-white outline-none focus:border-brand/50"
        autoFocus
      />
      <button
        type="button"
        onClick={onSave}
        className="rounded-md p-1.5 text-emerald-300 hover:bg-emerald-400/10"
        aria-label="Save collection name"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md p-1.5 text-white/45 hover:bg-white/[0.08] hover:text-white"
        aria-label="Cancel rename"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FileRow({
  file,
  onOpen,
  onDownload,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  file: BrangusFileRow;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const type = detectFileType(file);
  const category = fileCategoryLabel(file);

  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", file.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className="flex min-w-0 cursor-grab items-center gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3 transition hover:border-white/15 hover:bg-white/[0.04] active:cursor-grabbing"
    >
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
        onClick={onDownload}
        className="rounded-lg p-2 text-white/40 hover:bg-white/[0.08] hover:text-white"
        aria-label={`Download ${file.title}`}
        title="Download original"
      >
        <Download className="h-4 w-4" />
      </button>

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
  const label = fileStatusLabel(status);
  const className =
    status === "pending"
      ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
      : status === "failed"
        ? "border-red-400/25 bg-red-400/10 text-red-200"
        : status === "unsupported"
          ? "border-white/10 bg-white/[0.04] text-white/60"
          : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";

  return (
    <span
      className={`hidden shrink-0 rounded-full border px-2 py-1 text-xs sm:inline-flex ${className}`}
    >
      {label}
    </span>
  );
}

function fileStatusLabel(status: BrangusFileRow["extraction_status"]): string {
  if (status === "pending") return "Processing";
  if (status === "failed") return "Failed";
  if (status === "unsupported") return "Stored";
  return "Ready";
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
    return file.source === "chat" ? "From Brangus chat" : "Uploaded in File Cabinet";
  if (groupMode === "none") return "File Cabinet";
  return fileCategoryLabel(file);
}

function triggerAnchorDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function FileDetailDrawer({
  file,
  categoryOptions,
  onClose,
  onDownload,
  onChange,
}: {
  file: BrangusFileRow;
  categoryOptions: string[];
  onClose: () => void;
  onDownload: () => void;
  onChange: (file: Partial<BrangusFileRow> & { id: string }) => void;
}) {
  const [title, setTitle] = useState(file.title);
  const initialCategory = fileCategoryLabel(file);
  const [category, setCategory] = useState(initialCategory === UNCATEGORISED ? "" : initialCategory);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const type = detectFileType(file);

  const saveValues = useCallback(
    async (nextTitle: string, nextCategory: string) => {
      const cleanTitle = nextTitle.trim() || file.original_filename;
      const cleanCategory = nextCategory.trim() || null;
      const nextTags = tagsWithFileCollection(file.tags, cleanCategory);
      const supabase = createClient();
      await supabase
        .from("brangus_files")
        .update({
          title: cleanTitle,
          tags: nextTags,
        })
        .eq("id", file.id);
      onChange({
        id: file.id,
        title: cleanTitle,
        category: cleanCategory,
        tags: nextTags,
      });
    },
    [file.id, file.original_filename, file.tags, onChange]
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
          <dd>{file.source === "chat" ? "Brangus chat" : "File Cabinet"}</dd>
          <dt className="text-white/40">Status</dt>
          <dd>{fileStatusLabel(file.extraction_status)}</dd>
        </dl>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPreview}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white hover:bg-white/[0.08]"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white hover:bg-white/[0.08]"
          >
            <Download className="h-4 w-4" />
            Download original
          </button>
        </div>

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
