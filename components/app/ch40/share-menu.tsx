"use client";

import { useState, useRef } from "react";
import { Beef, FileText, FolderOpen, Loader2, Paperclip } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import type { MessageAttachment } from "@/lib/types/advisory";
import { listMyHerdsForShare } from "@/app/(app)/dashboard/ch40/connections/[id]/actions";
import { ChatAttachmentMenu } from "@/components/app/chat/chat-attachment-menu";
import { createClient } from "@/lib/supabase/client";
import { uploadGloveboxFile } from "@/lib/glovebox/files";

interface ShareMenuProps {
  onAttach: (attachment: MessageAttachment) => void;
  disabled?: boolean;
}

type MenuMode = "closed" | "root" | "herds" | "files";

interface HerdRow {
  id: string;
  name: string;
  species: string;
  breed: string;
  category: string;
  head_count: number;
  current_weight: number | null;
  initial_weight: number | null;
  property_name: string | null;
  property_state: string | null;
  last_updated: string | null;
}

interface FileRow {
  id: string;
  title: string;
  original_filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  kind: string | null;
  storage_path: string | null;
}

export function ShareMenu({ onAttach, disabled }: ShareMenuProps) {
  const [mode, setMode] = useState<MenuMode>("closed");
  const [herds, setHerds] = useState<HerdRow[] | null>(null);
  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openHerdPicker = async () => {
    setMode("herds");
    if (herds == null) {
      setLoading(true);
      const result = await listMyHerdsForShare();
      setHerds((result.herds as HerdRow[]) ?? []);
      setLoading(false);
    }
  };

  const openFilePicker = async () => {
    setMode("files");
    if (files == null) {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("glovebox_files")
        .select("id, title, original_filename, mime_type, size_bytes, kind, storage_path")
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false })
        .limit(50);
      setFiles((data ?? []) as FileRow[]);
      setLoading(false);
    }
  };

  const shareHerd = (h: HerdRow) => {
    onAttach({
      type: "herd",
      herd_id: h.id,
      name: h.name,
      species: h.species,
      breed: h.breed,
      category: h.category,
      head_count: h.head_count ?? 0,
      current_weight: h.current_weight,
      initial_weight: h.initial_weight,
      estimated_value: null,
      property_name: h.property_name,
      property_state: h.property_state,
      last_updated: h.last_updated,
    });
    setMode("closed");
  };

  const shareFile = (file: FileRow) => {
    onAttach({
      type: "file",
      file_id: file.id,
      title: file.title || file.original_filename,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      kind: file.kind,
    });
    setMode("closed");
  };

  const uploadFiles = async (fileList: FileList | null) => {
    const uploadFile = fileList?.[0];
    if (!uploadFile) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { fileId } = await uploadGloveboxFile({
        userId: user.id,
        file: uploadFile,
        source: "ch40",
      });
      onAttach({
        type: "file",
        file_id: fileId,
        title: uploadFile.name.replace(/\.[^.]+$/, ""),
        mime_type: uploadFile.type || "application/octet-stream",
        size_bytes: uploadFile.size,
        kind: null,
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <ChatAttachmentMenu
        open={mode === "root"}
        busy={uploading}
        disabled={disabled}
        accentClassName="border-ch40/30 text-ch40-light"
        onOpenChange={(open) => setMode(open ? "root" : "closed")}
        actions={[
          {
            id: "upload",
            title: "Attach a file",
            subtitle: "Upload and save it to Glovebox",
            icon: <Paperclip className="h-4 w-4" aria-hidden="true" />,
            iconClassName: "bg-ch40/15 text-ch40-light",
            onSelect: () => inputRef.current?.click(),
          },
          {
            id: "glovebox",
            title: "From Glovebox",
            subtitle: "Choose a file you have already saved",
            icon: <FolderOpen className="h-4 w-4" aria-hidden="true" />,
            iconClassName: "bg-info/15 text-info",
            onSelect: openFilePicker,
          },
          {
            id: "herd",
            title: "Share a herd",
            subtitle: "Send a snapshot with weight, head count and property context",
            icon: <Beef className="h-4 w-4" aria-hidden="true" />,
            iconClassName: "bg-ch40/15 text-ch40-light",
            onSelect: openHerdPicker,
          },
        ]}
      />

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => uploadFiles(event.target.files)}
      />

      <Modal
        open={mode === "herds"}
        onClose={() => setMode("closed")}
        title="Share a herd"
        size="md"
      >
        {loading ? (
          <p className="text-text-muted py-8 text-center text-sm">Loading your herds...</p>
        ) : herds && herds.length > 0 ? (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {herds.map((h) => (
              <Card
                key={h.id}
                className="bg-surface hover:bg-surface-low cursor-pointer transition-all"
              >
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => shareHerd(h)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="bg-ch40/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                      <Beef className="text-ch40-light h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary truncate text-sm font-semibold">{h.name}</p>
                      <p className="text-text-secondary truncate text-xs">
                        {h.head_count.toLocaleString("en-AU")} head
                        {" \u00B7 "}
                        {h.breed} {h.category}
                      </p>
                      <p className="text-text-muted mt-0.5 truncate text-[11px]">
                        {h.current_weight ? `${Math.round(h.current_weight)}kg avg` : h.species}
                        {h.property_name ? ` · ${h.property_name}` : ""}
                        {h.property_state ? `, ${h.property_state}` : ""}
                      </p>
                    </div>
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-text-muted py-8 text-center text-sm">
            You don&apos;t have any active herds to share yet.
          </p>
        )}
      </Modal>

      <Modal
        open={mode === "files"}
        onClose={() => setMode("closed")}
        title="Choose from Glovebox"
        size="md"
      >
        {loading ? (
          <div className="flex justify-center py-8 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
        ) : files && files.length > 0 ? (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {files.map((file) => (
              <Card
                key={file.id}
                className="bg-surface hover:bg-surface-low cursor-pointer transition-all"
              >
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => shareFile(file)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="bg-ch40/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                      <FileText className="text-ch40-light h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary truncate text-sm font-semibold">{file.title}</p>
                      <p className="text-text-muted mt-0.5 truncate text-xs">
                        {file.kind ? file.kind.replaceAll("_", " ") : file.mime_type ?? "File"}
                      </p>
                    </div>
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-text-muted py-8 text-center text-sm">
            No files in Glovebox yet.
          </p>
        )}
      </Modal>
    </>
  );
}
