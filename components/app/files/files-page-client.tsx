"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, Plus } from "lucide-react";
import {
  type GloveboxCollectionRow,
  type GloveboxFileRow,
  detectFileType,
  fileCollectionLabel,
  FILE_TYPE_LABELS,
} from "@/lib/glovebox/files";
import { PageHeaderActionsPortal } from "@/components/ui/page-header-actions-portal";
import { GloveboxCollectionsSidebar } from "./glovebox-collections-sidebar";
import { CompactFileDragPreview } from "./glovebox-drag-preview";
import { FileDetailDrawer } from "./glovebox-file-detail-drawer";
import { GloveboxMainPanel } from "./glovebox-main-panel";
import {
  ALL_COLLECTIONS,
  type DragPreview,
  type GroupMode,
  groupLabel,
} from "./glovebox-shared";
import { makeDragPreview, useGloveboxDrag } from "./use-glovebox-drag";
import { useGloveboxCollections } from "./use-glovebox-collections";
import { useGloveboxFileActions } from "./use-glovebox-file-actions";

interface Props {
  userId: string;
  initialFiles: GloveboxFileRow[];
  initialCollections: GloveboxCollectionRow[];
}

export function GloveboxPageClient({ userId, initialFiles, initialCollections }: Props) {
  const [files, setFiles] = useState<GloveboxFileRow[]>(initialFiles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<GloveboxFileRow | null>(null);
  const [activeCollection, setActiveCollection] = useState(ALL_COLLECTIONS);
  const [groupMode, setGroupMode] = useState<GroupMode>("collection");
  const [query, setQuery] = useState("");
  const [collections, setCollections] = useState<GloveboxCollectionRow[]>(initialCollections);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [collectionDraft, setCollectionDraft] = useState("");
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [openCollectionMenu, setOpenCollectionMenu] = useState<string | null>(null);
  const [dropCollection, setDropCollection] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragPreviewRef = useRef<DragPreview | null>(null);
  const suppressNextFileOpenRef = useRef(false);
  const activeDragPreview = dragPreview?.active ? dragPreview : null;
  const draggingFileId = activeDragPreview?.file.id ?? null;
  const { handlePicked, handleDelete, handleDownload, handleFileChange } = useGloveboxFileActions({
    userId,
    fileInputRef,
    setFiles,
    setActiveFile,
    setBusy,
    setError,
  });

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

  const {
    collectionOptions,
    collectionCounts,
    moveFileToCollection,
    handleCreateCollection,
    renameCollection,
    deleteCollection,
  } = useGloveboxCollections({
    userId,
    files,
    collections,
    collectionDraft,
    editingCollection,
    setFiles,
    setActiveFile,
    setCollections,
    setActiveCollection,
    setCollectionDraft,
    setIsCreatingCollection,
    setEditingCollection,
    setEditingDraft,
    setError,
  });

  const visibleFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return files.filter((file) => {
      const collection = fileCollectionLabel(file);
      if (activeCollection !== ALL_COLLECTIONS && collection !== activeCollection) return false;
      if (!needle) return true;
      return [
        file.title,
        file.original_filename,
        collection,
        FILE_TYPE_LABELS[detectFileType(file)],
        file.mime_type,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [activeCollection, files, query]);

  const groupedFiles = useMemo(() => {
    const groups = new Map<string, GloveboxFileRow[]>();
    for (const file of visibleFiles) {
      const key = groupLabel(file, groupMode);
      groups.set(key, [...(groups.get(key) ?? []), file]);
    }
    return Array.from(groups.entries());
  }, [groupMode, visibleFiles]);

  useGloveboxDrag({
    dragPreview,
    dragPreviewRef,
    suppressNextFileOpenRef,
    setDragPreview,
    setDropCollection,
    moveFileToCollection,
  });

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
        <GloveboxCollectionsSidebar
          filesCount={files.length}
          collectionOptions={collectionOptions}
          collectionCounts={collectionCounts}
          activeCollection={activeCollection}
          openCollectionMenu={openCollectionMenu}
          dropCollection={dropCollection}
          isCreatingCollection={isCreatingCollection}
          collectionDraft={collectionDraft}
          editingCollection={editingCollection}
          editingDraft={editingDraft}
          onToggleCreate={() => {
            setCollectionDraft("");
            setIsCreatingCollection((open) => !open);
          }}
          onCollectionDraftChange={setCollectionDraft}
          onCreateCollection={() => void handleCreateCollection()}
          onActiveCollectionChange={(collection) => {
            setActiveCollection(collection);
            setOpenCollectionMenu(null);
          }}
          onToggleMenu={(collection) =>
            setOpenCollectionMenu((current) => (current === collection ? null : collection))
          }
          onStartRename={(collection) => {
            setEditingCollection(collection);
            setEditingDraft(collection);
            setOpenCollectionMenu(null);
          }}
          onDeleteCollection={(collection) => {
            setOpenCollectionMenu(null);
            void deleteCollection(collection);
          }}
          onEditingDraftChange={setEditingDraft}
          onSaveRename={(collection) => void renameCollection(collection, editingDraft)}
          onCancelRename={() => {
            setEditingCollection(null);
            setEditingDraft("");
          }}
        />

        <GloveboxMainPanel
          activeCollectionLabel={activeCollectionLabel}
          visibleFilesCount={visibleFiles.length}
          totalFilesCount={files.length}
          query={query}
          groupMode={groupMode}
          groupedFiles={groupedFiles}
          draggingFileId={draggingFileId}
          onQueryChange={setQuery}
          onGroupModeChange={setGroupMode}
          onOpenFile={(file) => {
            if (suppressNextFileOpenRef.current) return;
            setActiveFile(file);
          }}
          onDownloadFile={(file) => void handleDownload(file)}
          onDeleteFile={(file) => handleDelete(file)}
          onPointerDragStart={(file, event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragPreview(makeDragPreview(file, detectFileType(file), event));
            setOpenCollectionMenu(null);
          }}
        />
      </div>

      {activeFile && (
        <FileDetailDrawer
          file={activeFile}
          collectionOptions={collectionOptions}
          onClose={() => setActiveFile(null)}
          onDownload={() => void handleDownload(activeFile)}
          onChange={handleFileChange}
        />
      )}

      {activeDragPreview && <CompactFileDragPreview preview={activeDragPreview} />}
    </div>
  );
}
