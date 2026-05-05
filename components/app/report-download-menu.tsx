"use client";

// Unified download menu for the report pages.
// Collapses per-format buttons into a single popover so the toolbar doesn't
// overflow. Each group maps to a report type (Asset, Lender, etc.) and
// exposes PDF, Excel and CSV in a three-column row.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadGloveboxFile } from "@/lib/glovebox/files";
import type { ReportType as PdfReportType } from "@/lib/pdf/generate";

type TableReportType =
  | "asset-report"
  | "lender-report"
  | "sales-summary"
  | "saleyard-comparison"
  | "value-vs-land-area"
  | "property-comparison";

export interface ReportDownloadGroup {
  label: string;
  reportType: TableReportType & PdfReportType;
  extraConfig?: Record<string, string>;
  pdf?: boolean;
  table?: boolean;
}

interface ReportDownloadMenuProps {
  groups: ReportDownloadGroup[];
  label?: string;
}

type Format = "pdf" | "xlsx" | "csv";
type Action = Format | "glovebox";

interface ReadonlyParams {
  get(name: string): string | null;
}

const FORWARD_KEYS = ["range", "start", "end", "properties", "fy", "openingBook"] as const;
const TABLE_FORWARD_KEYS = ["range", "start", "end", "properties"] as const;

export function ReportDownloadMenu({ groups, label = "Download" }: ReportDownloadMenuProps) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleDownload(group: ReportDownloadGroup, format: Action) {
    const busyKey = `${group.reportType}:${format}`;
    setBusy(busyKey);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in again to download.");
        return;
      }

      if (format === "glovebox") {
        await savePdfToGlovebox(session.access_token, session.user.id, group, searchParams);
      } else if (format === "pdf") {
        await downloadPdf(session.access_token, group, searchParams);
      } else {
        await downloadTable(session.access_token, group, format, searchParams);
      }
      setOpen(false);
    } catch (err) {
      console.error("[ReportDownloadMenu] download failed:", err);
      setError(err instanceof Error ? err.message : "Could not download report.");
    } finally {
      setBusy(null);
    }
  }

  const visibleGroups = groups.filter((g) => (g.pdf ?? true) || (g.table ?? true));

  const menu =
    open && mounted ? (
      <div
        ref={menuRef}
        role="menu"
        aria-label="Download reports"
        className="fixed z-[60] w-72 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-3 shadow-2xl shadow-black/35 backdrop-blur-xl backdrop-saturate-150"
        style={{
          top: menuPos.top,
          right: menuPos.right,
        }}
      >
        <div className="flex flex-col gap-3">
          {visibleGroups.map((group) => (
            <div key={group.reportType} className="flex flex-col">
              <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
                <p className="text-text-muted text-[10px] font-semibold tracking-widest uppercase">
                  {group.label}
                </p>
                {isCreatingPdf(busy, group) && (
                  <span className="text-[10px] font-medium text-reports">
                    Creating PDF
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(group.pdf ?? true) && (
                  <>
                    <FormatRow
                      icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
                      formatLabel="PDF"
                      busy={busy === `${group.reportType}:pdf`}
                      onClick={() => handleDownload(group, "pdf")}
                    />
                    <FormatRow
                      icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
                      formatLabel="Glovebox"
                      busy={busy === `${group.reportType}:glovebox`}
                      onClick={() => handleDownload(group, "glovebox")}
                    />
                  </>
                )}
                {(group.table ?? true) && (
                  <>
                    <FormatRow
                      icon={<FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />}
                      formatLabel="Excel"
                      busy={busy === `${group.reportType}:xlsx`}
                      onClick={() => handleDownload(group, "xlsx")}
                    />
                    <FormatRow
                      icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
                      formatLabel="CSV"
                      busy={busy === `${group.reportType}:csv`}
                      onClick={() => handleDownload(group, "csv")}
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-error mt-2 px-1 text-[11px]">
            {error}
          </p>
        )}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="bg-reports/15 text-reports hover:bg-reports/25 flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {mounted && menu && createPortal(menu, document.body)}
    </>
  );
}

function isCreatingPdf(busy: string | null, group: ReportDownloadGroup): boolean {
  return busy === `${group.reportType}:pdf` || busy === `${group.reportType}:glovebox`;
}

function FormatRow({
  icon,
  formatLabel,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  formatLabel: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={busy}
      className="text-text-secondary hover:text-text-primary flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-2 text-xs font-medium transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : icon}
      <span>{formatLabel}</span>
    </button>
  );
}

async function downloadPdf(
  jwt: string,
  group: ReportDownloadGroup,
  searchParams: ReadonlyParams
): Promise<void> {
  const config = buildPdfReportConfig(group, searchParams);

  const response = await fetch("/api/reports/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reportType: group.reportType, config }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }
  const { signedUrl, filename } = (await response.json()) as {
    signedUrl: string;
    filename: string;
  };
  triggerAnchorDownload(signedUrl, filename);
}

async function savePdfToGlovebox(
  jwt: string,
  userId: string,
  group: ReportDownloadGroup,
  searchParams: ReadonlyParams
): Promise<void> {
  const config = buildPdfReportConfig(group, searchParams);
  const response = await fetch("/api/reports/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reportType: group.reportType, config }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  const { signedUrl, filename } = (await response.json()) as {
    signedUrl: string;
    filename: string;
  };
  const pdfResponse = await fetch(signedUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Could not fetch generated PDF: ${pdfResponse.status}`);
  }

  const blob = await pdfResponse.blob();
  const file = new File([blob], filename, { type: "application/pdf" });
  await uploadGloveboxFile({
    userId,
    file,
    title: group.label,
    kind: "other",
    collection: "Reports",
    source: "reports",
  });
}

function buildPdfReportConfig(
  group: ReportDownloadGroup,
  searchParams: ReadonlyParams
): Record<string, string> {
  const config: Record<string, string> = {};
  for (const key of FORWARD_KEYS) {
    const value = searchParams.get(key);
    if (value) config[key] = value;
  }
  if (group.extraConfig) {
    for (const [key, value] of Object.entries(group.extraConfig)) {
      if (value) config[key] = value;
    }
  }
  return config;
}

async function downloadTable(
  jwt: string,
  group: ReportDownloadGroup,
  format: "csv" | "xlsx",
  searchParams: ReadonlyParams
): Promise<void> {
  const config: Record<string, string> = {};
  for (const key of TABLE_FORWARD_KEYS) {
    const value = searchParams.get(key);
    if (value) config[key] = value;
  }

  const response = await fetch("/api/reports/export", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reportType: group.reportType, format, config }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? `report.${format}`;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  triggerAnchorDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function triggerAnchorDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
