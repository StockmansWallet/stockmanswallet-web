// Shared table shape used by CSV + XLSX exporters. Keeping a single
// representation means every report gets both formats for free once its
// build-rows implementation exists.

export type CellValue = string | number | null;

export interface ExportSheet {
  /** Sheet name for XLSX. Unused for CSV. */
  name: string;
  /** Column headers. Length must match every row's length. */
  headers: string[];
  /** Per-cell values. Numbers stay numeric so XLSX renders them right-aligned. */
  rows: CellValue[][];
  /** Optional per-column width hint (in characters) for XLSX. */
  columnWidths?: number[];
}

export interface ExportWorkbook {
  /** Shown at the top of the XLSX first sheet; used in CSV comments header. */
  title: string;
  /** Metadata pairs shown above the first sheet's table in XLSX. */
  metadata: { label: string; value: string }[];
  /** One or more sheets. CSV exports use only the first. */
  sheets: ExportSheet[];
  /** Filename stem (no extension). */
  filenameStem: string;
}
