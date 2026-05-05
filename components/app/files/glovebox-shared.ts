import type { GloveboxDetectedFileType, GloveboxFileRow } from "@/lib/glovebox/files";
import { detectFileType, fileCollectionLabel, FILE_TYPE_LABELS } from "@/lib/glovebox/files";

export type GroupMode = "collection" | "type" | "source" | "none";

export type DragPreview = {
  file: GloveboxFileRow;
  type: GloveboxDetectedFileType;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
};

export const ALL_COLLECTIONS = "__all__";
export const UNCATEGORISED = "Uncategorised";
export const DROP_UNCATEGORISED = "__uncategorised__";
export const DRAG_ACTIVATION_DISTANCE = 6;

export function collectionDropTargetFromPoint(x: number, y: number): string | null | undefined {
  const target = document.elementFromPoint(x, y);
  const collectionTarget =
    target instanceof Element
      ? target.closest<HTMLElement>("[data-files-collection-drop-target]")
      : null;
  const value = collectionTarget?.dataset.filesCollectionDropTarget;

  if (!value) return undefined;
  return value === DROP_UNCATEGORISED ? null : value;
}

export function fileTypeShortLabel(type: GloveboxDetectedFileType): string {
  if (type === "pdf") return "PDF";
  if (type === "image") return "IMG";
  if (type === "spreadsheet") return "XLS";
  if (type === "document") return "DOC";
  if (type === "data") return "TXT";
  return "FILE";
}

export function fileStatusLabel(status: GloveboxFileRow["extraction_status"]): string {
  if (status === "pending") return "Processing";
  if (status === "failed") return "Failed";
  if (status === "unsupported") return "Stored";
  return "Ready";
}

export function fileSourceLabel(source: GloveboxFileRow["source"]): string {
  if (source === "chat") return "Brangus chat";
  if (source === "ch40") return "Ch 40";
  if (source === "grid_iq") return "Grid IQ";
  if (source === "reports") return "Reports";
  if (source === "yard_book") return "Yardbook";
  return "Glovebox";
}

export function groupLabel(file: GloveboxFileRow, groupMode: GroupMode): string {
  if (groupMode === "type") return FILE_TYPE_LABELS[detectFileType(file)];
  if (groupMode === "source") return fileSourceLabel(file.source);
  if (groupMode === "none") return "Glovebox";
  return fileCollectionLabel(file);
}

export function triggerAnchorDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
