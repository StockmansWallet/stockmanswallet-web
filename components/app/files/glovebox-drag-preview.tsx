import { FILE_TYPE_LABELS, formatFileSize } from "@/lib/glovebox/files";
import { type DragPreview, fileTypeShortLabel } from "./glovebox-shared";

export function CompactFileDragPreview({ preview }: { preview: DragPreview }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[1000]"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${Math.max(8, preview.x - 42)}px, ${Math.max(
          8,
          preview.y - 28
        )}px, 0)`,
      }}
    >
      <div className="file-drag-preview-card flex w-[260px] items-center gap-2.5 rounded-2xl border border-white/[0.10] bg-clip-padding px-3 py-2.5 shadow-2xl shadow-black/40 [backface-visibility:hidden]">
        <div className="bg-brand/15 text-brand flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[10px] font-extrabold tracking-wide">
          {fileTypeShortLabel(preview.type)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs leading-tight font-bold text-white">
            {preview.file.title}
          </div>
          <div className="mt-1 truncate text-[11px] leading-tight text-white/55">
            {FILE_TYPE_LABELS[preview.type]} / {formatFileSize(preview.file.size_bytes)}
          </div>
        </div>
      </div>
    </div>
  );
}
