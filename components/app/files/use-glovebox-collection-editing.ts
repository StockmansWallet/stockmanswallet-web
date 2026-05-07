import { useCallback } from "react";
import type {
  GloveboxCollectionGroupRow,
  GloveboxCollectionRow,
  GloveboxFileRow,
} from "@/lib/glovebox/files";
import { createClient } from "@/lib/supabase/client";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

export function useGloveboxCollectionEditing({
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
}: {
  userId: string;
  groups: GloveboxCollectionGroupRow[];
  collections: GloveboxCollectionRow[];
  collectionById: Map<string, GloveboxCollectionRow>;
  groupDraft: string;
  collectionDraft: string;
  setGroups: Setter<GloveboxCollectionGroupRow[]>;
  setCollections: Setter<GloveboxCollectionRow[]>;
  setFiles: Setter<GloveboxFileRow[]>;
  setActiveFile: Setter<GloveboxFileRow | null>;
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
  const handleCreateGroup = useCallback(async () => {
    const name = groupDraft.trim();
    if (!name) return;
    if (groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
      setError("A section with that name already exists.");
      return;
    }

    const nextSort = Math.max(0, ...groups.map((group) => group.sort_order)) + 10;
    const { data, error } = await createClient()
      .from("glovebox_collection_groups")
      .insert({ user_id: userId, name, sort_order: nextSort })
      .select("id, user_id, name, sort_order, is_system_default, created_at, updated_at")
      .single<GloveboxCollectionGroupRow>();
    if (error) {
      setError(error.message);
      return;
    }
    setGroups((prev) => [...prev, data]);
    setGroupDraft("");
    setIsCreatingGroup(false);
  }, [groupDraft, groups, setError, setGroupDraft, setGroups, setIsCreatingGroup, userId]);

  const handleCreateCollection = useCallback(
    async (groupId: string | null) => {
      const name = collectionDraft.trim();
      if (!name) return;
      if (collections.some((collection) => collection.name.toLowerCase() === name.toLowerCase())) {
        setError("A folder with that name already exists.");
        return;
      }

      const siblings = collections.filter((collection) => collection.group_id === groupId);
      const nextSort = Math.max(0, ...siblings.map((collection) => collection.sort_order)) + 10;
      const { data, error } = await createClient()
        .from("glovebox_collections")
        .insert({ user_id: userId, group_id: groupId, name, sort_order: nextSort })
        .select(
          "id, user_id, group_id, name, sort_order, is_system_default, created_at, updated_at"
        )
        .single<GloveboxCollectionRow>();
      if (error) {
        setError(error.message);
        return;
      }
      setCollections((prev) => [...prev, data]);
      setActiveCollection(data.id);
      setCollectionDraft("");
      setIsCreatingCollection(null);
    },
    [
      collectionDraft,
      collections,
      setActiveCollection,
      setCollectionDraft,
      setCollections,
      setError,
      setIsCreatingCollection,
      userId,
    ]
  );

  const renameGroup = useCallback(
    async (groupId: string, rawName: string) => {
      const name = rawName.trim();
      const group = groups.find((candidate) => candidate.id === groupId);
      if (!group || !name || name.toLowerCase() === group.name.toLowerCase()) {
        setEditingGroup(null);
        setEditingDraft("");
        return;
      }
      if (
        groups.some(
          (candidate) =>
            candidate.id !== groupId && candidate.name.toLowerCase() === name.toLowerCase()
        )
      ) {
        setError("A section with that name already exists.");
        return;
      }
      const { error } = await createClient()
        .from("glovebox_collection_groups")
        .update({ name })
        .eq("id", groupId);
      if (error) {
        setError(error.message);
        return;
      }
      setGroups((prev) =>
        prev.map((candidate) => (candidate.id === groupId ? { ...candidate, name } : candidate))
      );
      setEditingGroup(null);
      setEditingDraft("");
    },
    [groups, setEditingDraft, setEditingGroup, setError, setGroups]
  );

  const renameCollection = useCallback(
    async (collectionId: string, rawName: string) => {
      const name = rawName.trim();
      const collection = collectionById.get(collectionId);
      if (!collection || !name || name.toLowerCase() === collection.name.toLowerCase()) {
        setEditingCollection(null);
        setEditingDraft("");
        return;
      }
      if (
        collections.some(
          (candidate) =>
            candidate.id !== collectionId && candidate.name.toLowerCase() === name.toLowerCase()
        )
      ) {
        setError("A folder with that name already exists.");
        return;
      }

      const { error } = await createClient()
        .from("glovebox_collections")
        .update({ name })
        .eq("id", collectionId);
      if (error) {
        setError(error.message);
        return;
      }

      setCollections((prev) =>
        prev.map((candidate) =>
          candidate.id === collectionId ? { ...candidate, name } : candidate
        )
      );
      setFiles((prev) =>
        prev.map((file) =>
          file.collection_id === collectionId ? { ...file, collection: name } : file
        )
      );
      setActiveFile((current) =>
        current?.collection_id === collectionId ? { ...current, collection: name } : current
      );
      setEditingCollection(null);
      setEditingDraft("");
    },
    [
      collectionById,
      collections,
      setActiveFile,
      setCollections,
      setEditingCollection,
      setEditingDraft,
      setError,
      setFiles,
    ]
  );

  const moveCollectionToGroup = useCallback(
    async (collectionId: string, groupId: string | null) => {
      const collection = collectionById.get(collectionId);
      if (!collection || collection.group_id === groupId) return;
      const siblings = collections.filter((candidate) => candidate.group_id === groupId);
      const nextSort = Math.max(0, ...siblings.map((candidate) => candidate.sort_order)) + 10;
      const { error } = await createClient()
        .from("glovebox_collections")
        .update({ group_id: groupId, sort_order: nextSort })
        .eq("id", collectionId);
      if (error) {
        setError(error.message);
        return;
      }
      setCollections((prev) =>
        prev.map((candidate) =>
          candidate.id === collectionId
            ? { ...candidate, group_id: groupId, sort_order: nextSort }
            : candidate
        )
      );
    },
    [collectionById, collections, setCollections, setError]
  );

  return {
    handleCreateGroup,
    handleCreateCollection,
    renameGroup,
    renameCollection,
    moveCollectionToGroup,
  };
}
