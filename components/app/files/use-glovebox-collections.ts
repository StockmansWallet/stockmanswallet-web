import { useCallback, useMemo } from "react";
import {
  type GloveboxCollectionGroupRow,
  type GloveboxCollectionRow,
  type GloveboxFileRow,
} from "@/lib/glovebox/files";
import { createClient } from "@/lib/supabase/client";
import { useGloveboxCollectionEditing } from "./use-glovebox-collection-editing";
import { ALL_COLLECTIONS, UNCATEGORISED } from "./glovebox-shared";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

export function useGloveboxCollections({
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
}: {
  userId: string;
  files: GloveboxFileRow[];
  groups: GloveboxCollectionGroupRow[];
  collections: GloveboxCollectionRow[];
  collectionDraft: string;
  groupDraft: string;
  editingCollection: string | null;
  editingGroup: string | null;
  setFiles: Setter<GloveboxFileRow[]>;
  setActiveFile: Setter<GloveboxFileRow | null>;
  setGroups: Setter<GloveboxCollectionGroupRow[]>;
  setCollections: Setter<GloveboxCollectionRow[]>;
  setActiveCollection: Setter<string>;
  setCollectionDraft: Setter<string>;
  setGroupDraft: Setter<string>;
  setIsCreatingCollection: Setter<string | null>;
  setIsCreatingGroup: Setter<boolean>;
  setEditingCollection: Setter<string | null>;
  setEditingGroup: Setter<string | null>;
  setEditingDraft: Setter<string>;
  setError: Setter<string | null>;
}) {
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [groups]
  );

  const sortedCollections = useMemo(
    () =>
      [...collections].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [collections]
  );

  const collectionNameOptions = useMemo(
    () => sortedCollections.map((collection) => collection.name),
    [sortedCollections]
  );

  const collectionById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection])),
    [collections]
  );

  const collectionsByGroupId = useMemo(() => {
    const grouped = new Map<string, GloveboxCollectionRow[]>();
    for (const collection of sortedCollections) {
      const key = collection.group_id ?? "";
      grouped.set(key, [...(grouped.get(key) ?? []), collection]);
    }
    return grouped;
  }, [sortedCollections]);

  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const file of files) {
      const key = file.collection_id ?? UNCATEGORISED;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [files]);

  const generalGroupId = useMemo(() => {
    return (
      groups.find((group) => group.name.toLowerCase() === "general")?.id ?? groups[0]?.id ?? null
    );
  }, [groups]);

  const moveFileToCollection = useCallback(
    async (fileId: string, nextCollectionId: string | null) => {
      const file = files.find((candidate) => candidate.id === fileId);
      if (!file) return;

      const previousCollectionId = file.collection_id ?? null;
      if (previousCollectionId === nextCollectionId) return;

      const nextCollection = nextCollectionId ? collectionById.get(nextCollectionId) : null;
      const previousLabel = file.collection ?? null;
      const nextLabel = nextCollection?.name ?? null;

      setError(null);
      setFiles((prev) =>
        prev.map((candidate) =>
          candidate.id === fileId
            ? { ...candidate, collection_id: nextCollectionId, collection: nextLabel }
            : candidate
        )
      );
      setActiveFile((current) =>
        current?.id === fileId
          ? { ...current, collection_id: nextCollectionId, collection: nextLabel }
          : current
      );

      const { error } = await createClient()
        .from("glovebox_files")
        .update({ collection_id: nextCollectionId, collection: nextLabel })
        .eq("id", fileId);

      if (error) {
        setFiles((prev) =>
          prev.map((candidate) =>
            candidate.id === fileId
              ? { ...candidate, collection_id: previousCollectionId, collection: previousLabel }
              : candidate
          )
        );
        setActiveFile((current) =>
          current?.id === fileId
            ? { ...current, collection_id: previousCollectionId, collection: previousLabel }
            : current
        );
        setError(error.message);
      }
    },
    [collectionById, files, setActiveFile, setError, setFiles]
  );

  const {
    handleCreateGroup,
    handleCreateCollection,
    renameGroup,
    renameCollection,
    moveCollectionToGroup,
  } = useGloveboxCollectionEditing({
    userId,
    groups,
    collections,
    collectionById,
    groupDraft,
    collectionDraft,
    setGroups,
    setCollections,
    setFiles,
    setActiveFile,
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

  const deleteCollection = useCallback(
    async (collectionId: string) => {
      const collection = collectionById.get(collectionId);
      if (!collection) return;
      const count = collectionCounts.get(collectionId) ?? 0;
      const message =
        count > 0
          ? `Delete ${collection.name}? Files in this folder will move to Uncategorised.`
          : `Delete ${collection.name}?`;
      if (!confirm(message)) return;

      const { error } = await createClient()
        .from("glovebox_collections")
        .delete()
        .eq("id", collectionId);
      if (error) {
        setError(error.message);
        return;
      }
      setCollections((prev) => prev.filter((candidate) => candidate.id !== collectionId));
      setFiles((prev) =>
        prev.map((file) =>
          file.collection_id === collectionId
            ? { ...file, collection_id: null, collection: null }
            : file
        )
      );
      setActiveCollection((current) => (current === collectionId ? ALL_COLLECTIONS : current));
      if (editingCollection === collectionId) {
        setEditingCollection(null);
        setEditingDraft("");
      }
    },
    [
      collectionById,
      collectionCounts,
      editingCollection,
      setActiveCollection,
      setCollections,
      setEditingCollection,
      setEditingDraft,
      setError,
      setFiles,
    ]
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      const group = groups.find((candidate) => candidate.id === groupId);
      if (!group) return;
      const targetGroupId = groupId === generalGroupId ? null : generalGroupId;
      const childCount = collections.filter((collection) => collection.group_id === groupId).length;
      const message =
        childCount > 0
          ? `Delete ${group.name}? Its folders will move to General.`
          : `Delete ${group.name}?`;
      if (!confirm(message)) return;

      const supabase = createClient();
      if (childCount > 0) {
        const { error: moveError } = await supabase
          .from("glovebox_collections")
          .update({ group_id: targetGroupId })
          .eq("group_id", groupId);
        if (moveError) {
          setError(moveError.message);
          return;
        }
      }
      const { error } = await supabase
        .from("glovebox_collection_groups")
        .delete()
        .eq("id", groupId);
      if (error) {
        setError(error.message);
        return;
      }
      setGroups((prev) => prev.filter((candidate) => candidate.id !== groupId));
      setCollections((prev) =>
        prev.map((collection) =>
          collection.group_id === groupId ? { ...collection, group_id: targetGroupId } : collection
        )
      );
      if (editingGroup === groupId) {
        setEditingGroup(null);
        setEditingDraft("");
      }
    },
    [
      collections,
      editingGroup,
      generalGroupId,
      groups,
      setCollections,
      setEditingDraft,
      setEditingGroup,
      setError,
      setGroups,
    ]
  );

  return {
    sortedGroups,
    sortedCollections,
    collectionById,
    collectionsByGroupId,
    collectionNameOptions,
    collectionCounts,
    moveFileToCollection,
    handleCreateGroup,
    handleCreateCollection,
    renameGroup,
    renameCollection,
    moveCollectionToGroup,
    deleteGroup,
    deleteCollection,
  };
}
