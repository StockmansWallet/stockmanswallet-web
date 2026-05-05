import type { PointerEvent as ReactPointerEvent } from "react";
import { Download, Trash2 } from "lucide-react";
import {
  detectFileType,
  fileCollectionLabel,
  FILE_TYPE_LABELS,
  formatFileSize,
  type GloveboxFileRow,
} from "@/lib/glovebox/files";
import { fileSourceLabel, fileStatusLabel } from "./glovebox-shared";
import { FileTypeIcon } from "./glovebox-file-type-icon";

export function FileRow({
  file,
  isDragging,
  onOpen,
  onDownload,
  onDelete,
  onPointerDragStart,
}: {
  file: GloveboxFileRow;
  isDragging: boolean;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onPointerDragStart: (event: ReactPointerEvent<HTMLLIElement>) => void;
}) {
  const type = detectFileType(file);
  const collection = fileCollectionLabel(file);

  return (
    <li
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target = event.target;
        if (target instanceof Element && target.closest("[data-file-row-action]")) return;
        onPointerDragStart(event);
      }}
      className={`flex min-w-0 touch-pan-y cursor-grab select-none items-center gap-3 rounded-lg border px-4 py-3 transition-[transform,opacity,background-color,border-color,box-shadow] duration-200 ease-out active:cursor-grabbing ${
        isDragging
          ? "-translate-y-0.5 scale-[0.92] border-brand/20 bg-brand/[0.05] opacity-0 shadow-none"
          : "border-white/10 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.04]"
      }`}
    >
      <div className="bg-brand/15 text-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        <FileTypeIcon type={type} />
      </div>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-semibold text-white">{file.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50">
          <span>{collection}</span>
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
          {file.source !== "glovebox" && (
            <>
              <span className="text-white/20">/</span>
              <span>from {fileSourceLabel(file.source)}</span>
            </>
          )}
        </div>
      </button>

      <StatusPill status={file.extraction_status} />

      <button
        type="button"
        data-file-row-action
        onClick={onDownload}
        className="rounded-lg p-2 text-white/40 hover:bg-white/[0.08] hover:text-white"
        aria-label={`Download ${file.title}`}
        title="Download original"
      >
        <Download className="h-4 w-4" />
      </button>

      <button
        type="button"
        data-file-row-action
        onClick={onDelete}
        className="rounded-lg p-2 text-white/40 hover:bg-red-500/10 hover:text-red-300"
        aria-label="Delete file"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function StatusPill({ status }: { status: GloveboxFileRow["extraction_status"] }) {
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
