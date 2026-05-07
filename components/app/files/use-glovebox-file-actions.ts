import { useCallback, type ChangeEvent, type RefObject } from "react";
import {
  deleteGloveboxFile,
  friendlyTitle,
  signedDownloadUrlFor,
  uploadGloveboxFile,
  type GloveboxFileRow,
} from "@/lib/glovebox/files";
import { createClient } from "@/lib/supabase/client";
import { triggerAnchorDownload } from "./glovebox-shared";

export function useGloveboxFileActions({
  userId,
  fileInputRef,
  setFiles,
  setActiveFile,
  setBusy,
  setError,
}: {
  userId: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  setFiles: React.Dispatch<React.SetStateAction<GloveboxFileRow[]>>;
  setActiveFile: React.Dispatch<React.SetStateAction<GloveboxFileRow | null>>;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const handlePicked = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(event.target.files ?? []);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (picked.length === 0) return;

      setBusy(true);
      setError(null);
      try {
        for (const file of picked) {
          const { fileId, storagePath } = await uploadGloveboxFile({ userId, file });
          const row: GloveboxFileRow = {
            id: fileId,
            storage_path: storagePath,
            title: friendlyTitle(file.name),
            original_filename: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            kind: null,
            collection_id: null,
            collection: null,
            tags: [],
            page_count: null,
            extraction_status: "pending",
            source: "glovebox",
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
    [fileInputRef, setBusy, setError, setFiles, userId]
  );

  const handleDelete = useCallback(
    async (file: GloveboxFileRow) => {
      if (!confirm(`Delete ${file.title}? Tools that reference it may show it as removed.`)) return;
      await deleteGloveboxFile(file);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setActiveFile((current) => (current?.id === file.id ? null : current));
    },
    [setActiveFile, setFiles]
  );

  const handleDownload = useCallback(
    async (file: GloveboxFileRow) => {
      setError(null);
      try {
        let storagePath = file.storage_path;
        if (!storagePath) {
          const supabase = createClient();
          const { data: row, error: lookupError } = await supabase
            .from("glovebox_files")
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
    },
    [setError]
  );

  const handleFileChange = useCallback(
    (updated: Partial<GloveboxFileRow> & { id: string }) => {
      setFiles((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
      setActiveFile((current) => (current?.id === updated.id ? { ...current, ...updated } : current));
    },
    [setActiveFile, setFiles]
  );

  return { handlePicked, handleDelete, handleDownload, handleFileChange };
}
