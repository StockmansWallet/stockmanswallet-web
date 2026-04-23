// XLSX serialiser using exceljs. Produces a styled workbook where numbers
// are real numbers (right-aligned, sortable in Excel) rather than strings.

import ExcelJS from "exceljs";
import type { ExportWorkbook } from "./types";

const TITLE_FONT = { bold: true, size: 14, color: { argb: "FF271F16" } };
const METADATA_LABEL_FONT = { bold: true, color: { argb: "FF6B5B45" } };
const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF8B7355" },
};
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" } };

export async function workbookToXlsx(wb: ExportWorkbook): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Stockman's Wallet";
  workbook.created = new Date();

  for (const [sheetIndex, sheet] of wb.sheets.entries()) {
    const ws = workbook.addWorksheet(sheet.name.slice(0, 31));

    let row = 1;

    // Only the first sheet carries the title + metadata preamble. Additional
    // sheets go straight into their table so cross-sheet references line up.
    if (sheetIndex === 0) {
      const titleCell = ws.getCell(row, 1);
      titleCell.value = wb.title;
      titleCell.font = TITLE_FONT;
      ws.mergeCells(row, 1, row, Math.max(sheet.headers.length, 2));
      row += 1;

      for (const meta of wb.metadata) {
        const labelCell = ws.getCell(row, 1);
        labelCell.value = meta.label;
        labelCell.font = METADATA_LABEL_FONT;
        const valueCell = ws.getCell(row, 2);
        valueCell.value = meta.value;
        row += 1;
      }
      row += 1; // blank spacer
    }

    // Header row
    const headerRow = ws.getRow(row);
    sheet.headers.forEach((header, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = header;
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
      const headerAlign = sheet.headerAlignments?.[i] ?? "left";
      cell.alignment = { vertical: "middle", horizontal: headerAlign };
    });
    headerRow.commit();
    row += 1;

    // Data rows
    const boldRows = new Set(sheet.boldRows ?? []);
    sheet.rows.forEach((dataRow, rowIndex) => {
      const excelRow = ws.getRow(row);
      dataRow.forEach((value, i) => {
        const cell = excelRow.getCell(i + 1);
        cell.value = value;
        if (typeof value === "number") {
          cell.alignment = { horizontal: "right" };
          const fmt = sheet.columnFormats?.[i];
          if (fmt) cell.numFmt = fmt;
        }
        if (boldRows.has(rowIndex)) {
          cell.font = { ...(cell.font ?? {}), bold: true };
        }
      });
      excelRow.commit();
      row += 1;
    });

    // Column widths
    if (sheet.columnWidths) {
      sheet.columnWidths.forEach((w, i) => {
        ws.getColumn(i + 1).width = w;
      });
    } else {
      sheet.headers.forEach((h, i) => {
        ws.getColumn(i + 1).width = Math.max(12, Math.min(32, h.length + 4));
      });
    }

    // Freeze the header row so it stays visible on scroll.
    ws.views = [{ state: "frozen", ySplit: row - sheet.rows.length - 1 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
