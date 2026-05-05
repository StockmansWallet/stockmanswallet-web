import { useCallback, useState } from "react";
import { Download, X } from "lucide-react";
import {
  detectFileType,
  fileCollectionLabel,
  FILE_TYPE_LABELS,
  formatFileSize,
  signedUrlFor,
  type GloveboxFileRow,
} from "@/lib/glovebox/files";
import { createClient } from "@/lib/supabase/client";
import { fileSourceLabel, fileStatusLabel, UNCATEGORISED } from "./glovebox-shared";

export function FileDetailDrawer({
  file,
  collectionOptions,
  onClose,
  onDownload,
  onChange,
}: {
  file: GloveboxFileRow;
  collectionOptions: string[];
  onClose: () => void;
  onDownload: () => void;
  onChange: (file: Partial<GloveboxFileRow> & { id: string }) => void;
}) {
  const [title, setTitle] = useState(file.title);
  const initialCollection = fileCollectionLabel(file);
  const [collection, setCollection] = useState(initialCollection === UNCATEGORISED ? "" : initialCollection);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const type = detectFileType(file);

  const saveValues = useCallback(
    async (nextTitle: string, nextCollection: string) => {
      const cleanTitle = nextTitle.trim() || file.original_filename;
      const cleanCollection = nextCollection.trim() || null;
      const supabase = createClient();
      await supabase
        .from("glovebox_files")
        .update({
          title: cleanTitle,
          collection: cleanCollection,
        })
        .eq("id", file.id);
      onChange({
        id: file.id,
        title: cleanTitle,
        collection: cleanCollection,
      });
    },
    [file.id, file.original_filename, onChange]
  );

  const save = useCallback(() => {
    void saveValues(title, collection);
  }, [collection, saveValues, title]);

  const applyCollection = useCallback(
    (nextCollection: string) => {
      setCollection(nextCollection);
      void saveValues(title, nextCollection);
    },
    [saveValues, title]
  );

  const openPreview = useCallback(async () => {
    let storagePath = file.storage_path;
    if (!storagePath) {
      const supabase = createClient();
      const { data: row } = await supabase
        .from("glovebox_files")
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
          <h2 className="text-lg font-semibold text-white">Glovebox file</h2>
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
            value={collection}
            list="file-collection-options"
            onChange={(e) => setCollection(e.target.value)}
            onBlur={save}
            placeholder="Uncategorised"
            className="focus:border-brand/50 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35"
          />
          <datalist id="file-collection-options">
            {collectionOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-2">
            {collectionOptions.slice(0, 8).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => applyCollection(option)}
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
          <dd>{fileSourceLabel(file.source)}</dd>
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
