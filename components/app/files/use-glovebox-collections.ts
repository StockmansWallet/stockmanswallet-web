import { useCallback, useMemo } from "react";
import { fileCollectionLabel, type GloveboxCollectionRow, type GloveboxFileRow } from "@/lib/glovebox/files";
import { createClient } from "@/lib/supabase/client";
import { ALL_COLLECTIONS, UNCATEGORISED } from "./glovebox-shared";

export function useGloveboxCollections({
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
}: {
  userId: string;
  files: GloveboxFileRow[];
  collections: GloveboxCollectionRow[];
  collectionDraft: string;
  editingCollection: string | null;
  setFiles: React.Dispatch<React.SetStateAction<GloveboxFileRow[]>>;
  setActiveFile: React.Dispatch<React.SetStateAction<GloveboxFileRow | null>>;
  setCollections: React.Dispatch<React.SetStateAction<GloveboxCollectionRow[]>>;
  setActiveCollection: React.Dispatch<React.SetStateAction<string>>;
  setCollectionDraft: React.Dispatch<React.SetStateAction<string>>;
  setIsCreatingCollection: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingCollection: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingDraft: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const collectionOptions = useMemo(() => {
    const values = new Set<string>();
    for (const collection of collections) {
      const label = collection.name.trim();
      if (label) values.add(label);
    }
    for (const file of files) {
      const label = fileCollectionLabel(file);
      if (label !== UNCATEGORISED) values.add(label);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [collections, files]);

  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const file of files) {
      const label = fileCollectionLabel(file);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return counts;
  }, [files]);

  const moveFileToCollection = useCallback(
    async (fileId: string, nextCollection: string | null) => {
      const file = files.find((candidate) => candidate.id === fileId);
      if (!file) return;

      const currentCollection = fileCollectionLabel(file);
      const previousCollection = currentCollection === UNCATEGORISED ? null : currentCollection;
      const cleanNext = nextCollection?.trim() || null;
      if ((previousCollection ?? null) === cleanNext) return;

      setError(null);
      setFiles((prev) =>
        prev.map((candidate) =>
          candidate.id === fileId ? { ...candidate, collection: cleanNext } : candidate
        )
      );
      setActiveFile((current) =>
        current?.id === fileId ? { ...current, collection: cleanNext } : current
      );

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("glovebox_files")
        .update({ collection: cleanNext })
        .eq("id", fileId);

      if (updateError) {
        setFiles((prev) =>
          prev.map((candidate) =>
            candidate.id === fileId ? { ...candidate, collection: previousCollection } : candidate
          )
        );
        setActiveFile((current) =>
          current?.id === fileId ? { ...current, collection: previousCollection } : current
        );
        setError(updateError.message);
      }
    },
    [files, setActiveFile, setError, setFiles]
  );

  const handleCreateCollection = useCallback(async () => {
    const nextCollection = collectionDraft.trim();
    if (!nextCollection) return;
    if (collectionOptions.some((collection) => collection.toLowerCase() === nextCollection.toLowerCase())) {
      setError("A collection with that name already exists.");
      return;
    }
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("glovebox_collections")
      .insert({ user_id: userId, name: nextCollection })
      .select("id, user_id, name, created_at, updated_at")
      .single<GloveboxCollectionRow>();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCollections((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setActiveCollection(nextCollection);
    setCollectionDraft("");
    setIsCreatingCollection(false);
  }, [
    collectionDraft,
    collectionOptions,
    setActiveCollection,
    setCollectionDraft,
    setCollections,
    setError,
    setIsCreatingCollection,
    userId,
  ]);

  const renameCollection = useCallback(
    async (currentCollection: string, nextCollectionRaw: string) => {
      const nextCollection = nextCollectionRaw.trim();
      if (!nextCollection || nextCollection.toLowerCase() === currentCollection.toLowerCase()) {
        setEditingCollection(null);
        setEditingDraft("");
        return;
      }
      if (
        collectionOptions.some(
          (collection) =>
            collection.toLowerCase() === nextCollection.toLowerCase() &&
            collection.toLowerCase() !== currentCollection.toLowerCase()
        )
      ) {
        setError("A collection with that name already exists.");
        return;
      }

      setError(null);
      const matchingFiles = files.filter((file) => fileCollectionLabel(file) === currentCollection);
      const supabase = createClient();
      const existingCollection = collections.find(
        (collection) => collection.name.toLowerCase() === currentCollection.toLowerCase()
      );

      if (existingCollection) {
        const { error: renameError } = await supabase
          .from("glovebox_collections")
          .update({ name: nextCollection })
          .eq("id", existingCollection.id);
        if (renameError) {
          setError(renameError.message);
          return;
        }
      }

      if (matchingFiles.length > 0) {
        const { error: updateError } = await supabase
          .from("glovebox_files")
          .update({ collection: nextCollection })
          .eq("user_id", userId)
          .eq("collection", currentCollection);
        if (updateError) {
          setError(updateError.message);
          return;
        }
      }

      setFiles((prev) =>
        prev.map((file) =>
          fileCollectionLabel(file) === currentCollection ? { ...file, collection: nextCollection } : file
        )
      );
      if (existingCollection) {
        setCollections((prev) =>
          prev
            .map((collection) =>
              collection.id === existingCollection.id ? { ...collection, name: nextCollection } : collection
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      }
      setActiveCollection((current) => (current === currentCollection ? nextCollection : current));
      setEditingCollection(null);
      setEditingDraft("");
    },
    [
      collectionOptions,
      collections,
      files,
      setActiveCollection,
      setCollections,
      setEditingCollection,
      setEditingDraft,
      setError,
      setFiles,
      userId,
    ]
  );

  const deleteCollection = useCallback(
    async (collectionToDelete: string) => {
      const filesInCollection = files.filter((file) => fileCollectionLabel(file) === collectionToDelete);
      const message =
        filesInCollection.length > 0
          ? `Delete ${collectionToDelete}? Files in this collection will move to Uncategorised.`
          : `Delete ${collectionToDelete}?`;
      if (!confirm(message)) return;

      setError(null);
      const supabase = createClient();
      if (filesInCollection.length > 0) {
        const { error: updateError } = await supabase
          .from("glovebox_files")
          .update({ collection: null })
          .eq("user_id", userId)
          .eq("collection", collectionToDelete);
        if (updateError) {
          setError(updateError.message);
          return;
        }
      }

      const collectionRow = collections.find(
        (collection) => collection.name.toLowerCase() === collectionToDelete.toLowerCase()
      );
      if (collectionRow) {
        const { error: deleteError } = await supabase
          .from("glovebox_collections")
          .delete()
          .eq("id", collectionRow.id);
        if (deleteError) {
          setError(deleteError.message);
          return;
        }
      }

      setFiles((prev) =>
        prev.map((file) =>
          fileCollectionLabel(file) === collectionToDelete ? { ...file, collection: null } : file
        )
      );
      setCollections((prev) =>
        prev.filter((collection) => collection.name.toLowerCase() !== collectionToDelete.toLowerCase())
      );
      setActiveCollection((current) => (current === collectionToDelete ? ALL_COLLECTIONS : current));
      if (editingCollection === collectionToDelete) {
        setEditingCollection(null);
        setEditingDraft("");
      }
    },
    [
      collections,
      editingCollection,
      files,
      setActiveCollection,
      setCollections,
      setEditingCollection,
      setEditingDraft,
      setError,
      setFiles,
      userId,
    ]
  );

  return {
    collectionOptions,
    collectionCounts,
    moveFileToCollection,
    handleCreateCollection,
    renameCollection,
    deleteCollection,
  };
}
