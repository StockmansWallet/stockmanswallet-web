"use client";

// Report export row: primary download pill + small circular preview
// button. Both actions hit /api/reports/generate which renders the PDF
// server-side via Puppeteer, uploads to Supabase Storage, and returns a
// signed URL. The disposition param decides whether the signed URL
// forces a download or opens inline in the browser's PDF viewer.
//
// Anchor elements (not window.open) are used in both cases:
// - Download: <a download={filename}> triggers the browser's native
//   download flow, bypassing popup blockers and sending the file straight
//   to the user's Downloads folder with the friendly filename.
// - Preview: <a target="_blank"> opens the PDF in a new tab. Anchor
//   clicks are not subject to the popup-blocker rules that catch
//   window.open after an await.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ReportType } from "@/lib/pdf/generate";

interface ReportExportButtonProps {
  label: string;
  reportType: ReportType;
}

// Keep in sync with lib/pdf/generate.ts#FORWARDED_PARAMS.
const FORWARD_KEYS = ["range", "start", "end", "properties"] as const;

type Mode = "download" | "preview";

export function ReportExportButton({ label, reportType }: ReportExportButtonProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchSignedUrl(disposition: "attachment" | "inline") {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Please sign in again to export.");

    const config: Record<string, string> = {};
    for (const key of FORWARD_KEYS) {
      const value = searchParams.get(key);
      if (value) config[key] = value;
    }

    const response = await fetch("/api/reports/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reportType, config, disposition }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? `Request failed: ${response.status}`);
    }

    return (await response.json()) as { signedUrl: string; filename: string };
  }

  async function handleDownload() {
    setLoading("download");
    setError(null);
    try {
      const { signedUrl, filename } = await fetchSignedUrl("attachment");
      // Programmatic anchor click with download attribute. For cross-
      // origin URLs the download attribute only sets the filename hint;
      // Content-Disposition: attachment from the signed URL is what
      // actually forces the save-as flow.
      const a = document.createElement("a");
      a.href = signedUrl;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("[ReportExportButton] download failed:", err);
      setError(err instanceof Error ? err.message : "Could not generate report.");
    } finally {
      setLoading(null);
    }
  }

  async function handlePreview() {
    setLoading("preview");
    setError(null);
    try {
      const { signedUrl } = await fetchSignedUrl("inline");
      const a = document.createElement("a");
      a.href = signedUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("[ReportExportButton] preview failed:", err);
      setError(err instanceof Error ? err.message : "Could not preview report.");
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Primary: download */}
        <button
          onClick={handleDownload}
          disabled={busy}
          aria-label={`Download ${label} PDF`}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-warning/15 px-3.5 py-2 text-xs font-semibold text-warning transition-colors hover:bg-warning/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "download" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {loading === "download" ? "Generating…" : label}
        </button>

        {/* Secondary: preview */}
        <button
          onClick={handlePreview}
          disabled={busy}
          aria-label={`Preview ${label} in a new tab`}
          title="Preview"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning transition-colors hover:bg-warning/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "preview" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-error">{error}</p>
      )}
    </div>
  );
}
