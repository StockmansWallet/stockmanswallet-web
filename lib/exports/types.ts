// Shared table shape used by CSV + XLSX exporters. Keeping a single
// representation means every report gets both formats for free once its
// build-rows implementation exists.

export type CellValue = string | number | null;

/** Alignment hint for XLSX header cells. Applied per column. */
export type HeaderAlignment = "left" | "center" | "right";

/** Row indices (0-based within `rows`) that should render bold in XLSX. */
export type BoldRows = number[];

export interface ExportSheet {
  /** Sheet name for XLSX. Unused for CSV. */
  name: string;
  /** Column headers. Length must match every row's length. */
  headers: string[];
  /** Per-cell values. Numbers stay numeric so XLSX renders them right-aligned. */
  rows: CellValue[][];
  /** Optional per-column width hint (in characters) for XLSX. */
  columnWidths?: number[];
  /**
   * Optional per-column Excel number format strings (eg. "#,##0.00" or "#,##0").
   * Applied to numeric cells only; string cells are left untouched. Length should
   * match `headers`; undefined entries fall back to Excel's default for numbers.
   */
  columnFormats?: (string | undefined)[];
  /**
   * Optional per-column header alignment. Length should match `headers`. When
   * omitted, headers default to left-aligned.
   */
  headerAlignments?: (HeaderAlignment | undefined)[];
  /** Data rows (0-based) that should render bold in XLSX. */
  boldRows?: BoldRows;
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
