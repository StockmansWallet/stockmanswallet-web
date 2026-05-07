"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  type GloveboxCollectionGroupRow,
  type GloveboxCollectionRow,
  type GloveboxFileRow,
  detectFileType,
  fileCollectionLabel,
  FILE_TYPE_LABELS,
} from "@/lib/glovebox/files";
import { PageHeaderActionsPortal } from "@/components/ui/page-header-actions-portal";
import { GloveboxCollectionsSidebar } from "./glovebox-collections-sidebar";
import { GloveboxCh40ShareDialog } from "./glovebox-ch40-share-dialog";
import { CompactFileDragPreview } from "./glovebox-drag-preview";
import { FileDetailDrawer } from "./glovebox-file-detail-drawer";
import { GloveboxMainPanel } from "./glovebox-main-panel";
import {
  ALL_COLLECTIONS,
  UNCATEGORISED,
  type DragPreview,
  type GroupMode,
  groupLabel,
} from "./glovebox-shared";
import { useCollapsedGloveboxGroups } from "./use-collapsed-glovebox-groups";
import { makeDragPreview, useGloveboxDrag } from "./use-glovebox-drag";
import { useGloveboxCollections } from "./use-glovebox-collections";
import { useGloveboxFileActions } from "./use-glovebox-file-actions";

interface Props {
  userId: string;
  initialFiles: GloveboxFileRow[];
  initialGroups: GloveboxCollectionGroupRow[];
  initialCollections: GloveboxCollectionRow[];
}

export function GloveboxPageClient({
  userId,
  initialFiles,
  initialGroups,
  initialCollections,
}: Props) {
  const [files, setFiles] = useState<GloveboxFileRow[]>(initialFiles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<GloveboxFileRow | null>(null);
  const [sharingFile, setSharingFile] = useState<GloveboxFileRow | null>(null);
  const [activeCollection, setActiveCollection] = useState(ALL_COLLECTIONS);
  const [groupMode, setGroupMode] = useState<GroupMode>("collection");
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<GloveboxCollectionGroupRow[]>(initialGroups);
  const [collections, setCollections] = useState<GloveboxCollectionRow[]>(initialCollections);
  const [isCreatingCollection, setIsCreatingCollection] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [collectionDraft, setCollectionDraft] = useState("");
  const [groupDraft, setGroupDraft] = useState("");
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [openCollectionMenu, setOpenCollectionMenu] = useState<string | null>(null);
  const [openGroupMenu, setOpenGroupMenu] = useState<string | null>(null);
  const [dropCollection, setDropCollection] = useState<string | null>(null);
  const [draggedCollection, setDraggedCollection] = useState<string | null>(null);
  const { collapsedGroupIds, expandGroup, toggleGroup } = useCollapsedGloveboxGroups();
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
    sortedGroups,
    collectionById,
    collectionsByGroupId,
    collectionCounts,
    moveFileToCollection,
    handleCreateGroup,
    handleCreateCollection,
    renameGroup,
    renameCollection,
    moveCollectionToGroup,
    deleteGroup,
    deleteCollection,
  } = useGloveboxCollections({
    userId,
    files,
    groups,
    collections,
    collectionDraft,
    groupDraft,
    editingCollection,
    editingGroup,
    setFiles,
    setActiveFile,
    setGroups,
    setCollections,
    setActiveCollection,
    setCollectionDraft,
    setGroupDraft,
    setIsCreatingCollection,
    setIsCreatingGroup,
    setEditingCollection,
    setEditingGroup,
    setEditingDraft,
    setError,
  });

  const visibleFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return files.filter((file) => {
      const collection = file.collection_id
        ? (collectionById.get(file.collection_id)?.name ?? fileCollectionLabel(file))
        : fileCollectionLabel(file);
      const collectionKey = file.collection_id ?? collection;
      if (activeCollection !== ALL_COLLECTIONS && collectionKey !== activeCollection) return false;
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
  }, [activeCollection, collectionById, files, query]);

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
    activeCollection === ALL_COLLECTIONS
      ? "All files"
      : activeCollection === UNCATEGORISED
        ? "Uncategorised"
        : (collectionById.get(activeCollection)?.name ?? "Glovebox");

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
          groups={sortedGroups}
          collectionsByGroupId={collectionsByGroupId}
          collectionCounts={collectionCounts}
          activeCollection={activeCollection}
          openCollectionMenu={openCollectionMenu}
          openGroupMenu={openGroupMenu}
          dropCollection={dropCollection}
          isCreatingCollection={isCreatingCollection}
          isCreatingGroup={isCreatingGroup}
          collectionDraft={collectionDraft}
          groupDraft={groupDraft}
          editingCollection={editingCollection}
          editingGroup={editingGroup}
          editingDraft={editingDraft}
          draggedCollection={draggedCollection}
          collapsedGroupIds={collapsedGroupIds}
          onToggleCreateGroup={() => {
            setGroupDraft("");
            setIsCreatingGroup((open) => !open);
          }}
          onToggleCreateCollection={(groupId) => {
            setCollectionDraft("");
            expandGroup(groupId);
            setIsCreatingCollection((current) => (current === groupId ? null : groupId));
          }}
          onToggleGroupCollapse={toggleGroup}
          onCollectionDraftChange={setCollectionDraft}
          onGroupDraftChange={setGroupDraft}
          onCreateCollection={(groupId) => void handleCreateCollection(groupId)}
          onCreateGroup={() => void handleCreateGroup()}
          onActiveCollectionChange={(collection) => {
            setActiveCollection(collection);
            setOpenCollectionMenu(null);
            setOpenGroupMenu(null);
          }}
          onToggleCollectionMenu={(collection) => {
            setOpenCollectionMenu((current) => (current === collection ? null : collection));
            setOpenGroupMenu(null);
          }}
          onToggleGroupMenu={(group) => {
            setOpenGroupMenu((current) => (current === group ? null : group));
            setOpenCollectionMenu(null);
          }}
          onStartRenameCollection={(collection) => {
            setEditingCollection(collection.id);
            setEditingDraft(collection.name);
            setOpenCollectionMenu(null);
          }}
          onStartRenameGroup={(group) => {
            setEditingGroup(group.id);
            setEditingDraft(group.name);
            setOpenGroupMenu(null);
          }}
          onDeleteCollection={(collection) => {
            setOpenCollectionMenu(null);
            void deleteCollection(collection.id);
          }}
          onDeleteGroup={(group) => {
            setOpenGroupMenu(null);
            void deleteGroup(group.id);
          }}
          onEditingDraftChange={setEditingDraft}
          onSaveCollectionRename={(collection) =>
            void renameCollection(collection.id, editingDraft)
          }
          onSaveGroupRename={(group) => void renameGroup(group.id, editingDraft)}
          onCancelRename={() => {
            setEditingCollection(null);
            setEditingGroup(null);
            setEditingDraft("");
          }}
          onCollectionDragStart={setDraggedCollection}
          onCollectionDragEnd={() => setDraggedCollection(null)}
          onCollectionDropOnGroup={(groupId) => {
            if (!draggedCollection) return;
            void moveCollectionToGroup(draggedCollection, groupId);
            setDraggedCollection(null);
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
          onShareFile={setSharingFile}
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
          collections={collections}
          onClose={() => setActiveFile(null)}
          onDownload={() => void handleDownload(activeFile)}
          onChange={handleFileChange}
        />
      )}

      {sharingFile && (
        <GloveboxCh40ShareDialog file={sharingFile} open onClose={() => setSharingFile(null)} />
      )}

      {activeDragPreview && <CompactFileDragPreview preview={activeDragPreview} />}
    </div>
  );
}
