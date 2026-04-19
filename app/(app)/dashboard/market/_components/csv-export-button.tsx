"use client";

import { Download } from "lucide-react";

interface CsvExportButtonProps {
  rows: Array<Record<string, string | number | null>>;
  filename: string;
  label?: string;
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function CsvExportButton({ rows, filename, label = "Export CSV" }: CsvExportButtonProps) {
  const onClick = () => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];
    for (const row of rows) {
      lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={rows.length === 0}
      className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-40"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
