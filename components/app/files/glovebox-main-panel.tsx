import { FolderOpen, Layers3, Search } from "lucide-react";
import { detectFileType, type GloveboxFileRow } from "@/lib/glovebox/files";
import { FileRow } from "./glovebox-file-row";
import { FileTypeIcon } from "./glovebox-file-type-icon";
import { type GroupMode } from "./glovebox-shared";

export function GloveboxMainPanel({
  activeCollectionLabel,
  visibleFilesCount,
  totalFilesCount,
  query,
  groupMode,
  groupedFiles,
  draggingFileId,
  onQueryChange,
  onGroupModeChange,
  onOpenFile,
  onDownloadFile,
  onDeleteFile,
  onPointerDragStart,
}: {
  activeCollectionLabel: string;
  visibleFilesCount: number;
  totalFilesCount: number;
  query: string;
  groupMode: GroupMode;
  groupedFiles: [string, GloveboxFileRow[]][];
  draggingFileId: string | null;
  onQueryChange: (query: string) => void;
  onGroupModeChange: (mode: GroupMode) => void;
  onOpenFile: (file: GloveboxFileRow) => void;
  onDownloadFile: (file: GloveboxFileRow) => void;
  onDeleteFile: (file: GloveboxFileRow) => void;
  onPointerDragStart: (file: GloveboxFileRow, event: React.PointerEvent<HTMLLIElement>) => void;
}) {
  return (
    <main className="min-w-0 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/[0.06] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/45 uppercase">
              <FolderOpen className="h-4 w-4" />
              <span className="truncate">{activeCollectionLabel}</span>
              <span className="text-white/30">{visibleFilesCount}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            <div className="relative min-w-0 sm:w-48 lg:w-56">
              <Search className="text-text-muted pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search files"
                aria-label="Search files"
                className="bg-surface text-text-primary placeholder:text-text-muted focus:ring-brand/20 h-8 w-full rounded-full pr-4 pl-9 text-xs transition-all outline-none focus:ring-2"
              />
            </div>

            <select
              value={groupMode}
              onChange={(e) => onGroupModeChange(e.target.value as GroupMode)}
              className="h-9 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
              aria-label="Group files"
            >
              <option value="collection">Group by collection</option>
              <option value="type">Group by file type</option>
              <option value="source">Group by source</option>
              <option value="none">No grouping</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-3">
        {visibleFilesCount === 0 ? (
          <div className="p-8 text-center text-sm text-white/60">
            {totalFilesCount === 0
              ? "No files yet. Upload documents or photos and they will appear here."
              : "No files match this view."}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedFiles.map(([group, groupFiles]) => (
              <section key={group} className="min-w-0">
                {groupMode !== "none" && (
                  <div className="mb-2 flex items-center justify-between px-1">
                    <div className="flex min-w-0 items-center gap-2 text-xs font-semibold tracking-wide text-white/55 uppercase">
                      {groupMode === "type" ? (
                        <FileTypeIcon type={detectFileType(groupFiles[0])} />
                      ) : groupMode === "source" ? (
                        <Layers3 className="h-4 w-4" />
                      ) : (
                        <FolderOpen className="h-4 w-4" />
                      )}
                      <span className="truncate">{group}</span>
                    </div>
                    <span className="text-xs text-white/35">{groupFiles.length}</span>
                  </div>
                )}

                <ul className="space-y-2">
                  {groupFiles.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      isDragging={draggingFileId === file.id}
                      onOpen={() => onOpenFile(file)}
                      onDownload={() => onDownloadFile(file)}
                      onDelete={() => onDeleteFile(file)}
                      onPointerDragStart={(event) => onPointerDragStart(file, event)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
