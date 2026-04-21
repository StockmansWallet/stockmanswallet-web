// RFC 4180 CSV serialiser. Used by /api/reports/export.
//
// Scope: single sheet (first sheet of the workbook). A workbook-wide metadata
// preamble is rendered as a series of two-column rows above the table so the
// resulting file round-trips cleanly through Excel's import.

import type { CellValue, ExportWorkbook } from "./types";

function escape(value: CellValue): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "number" ? String(value) : value;
  // Quote if contains comma, quote, CR, or LF. Double embedded quotes.
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function workbookToCsv(wb: ExportWorkbook): string {
  const sheet = wb.sheets[0];
  if (!sheet) return "";

  const lines: string[] = [];

  // Metadata preamble: each label/value on its own row.
  lines.push(escape(wb.title));
  for (const m of wb.metadata) {
    lines.push([escape(m.label), escape(m.value)].join(","));
  }
  // Blank separator row between metadata and the table body.
  lines.push("");

  lines.push(sheet.headers.map(escape).join(","));
  for (const row of sheet.rows) {
    lines.push(row.map(escape).join(","));
  }

  // CRLF per RFC 4180. BOM so Excel detects UTF-8 correctly when double-clicked.
  return "\ufeff" + lines.join("\r\n") + "\r\n";
}
