"use client";

// Single pill button that generates a PDF server-side (Puppeteer →
// Supabase Storage) and opens the signed URL in a new tab. Replaces the
// ReportLinkButton (browser-print-only) and ReportPreviewButton (streaming
// download) flows with one storage-backed path that supports reopening
// and, later, sharing via share_token / Producer Chat.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ReportType } from "@/lib/pdf/generate";

interface ReportExportButtonProps {
  label: string;
  reportType: ReportType;
}

// Keep this list in sync with lib/pdf/generate.ts#FORWARDED_PARAMS.
const FORWARD_KEYS = ["range", "start", "end", "properties"] as const;

export function ReportExportButton({ label, reportType }: ReportExportButtonProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in again to export.");
        return;
      }

      // Build a minimal config object with only keys the API accepts. The
      // server revalidates, but filtering here keeps the request payload clean.
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
        body: JSON.stringify({ reportType, config }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? `Request failed: ${response.status}`);
      }

      const { signedUrl } = (await response.json()) as { signedUrl: string };
      // Open the PDF in a new tab. Browser's built-in PDF viewer handles
      // download-save from there; the signed URL has a download=<filename>
      // hint so the file picker defaults to AssetReport_YYYY-MM-DD_to_YYYY-MM-DD.pdf.
      window.open(signedUrl, "_blank");
    } catch (err) {
      console.error("[ReportExportButton] generation failed:", err);
      setError(err instanceof Error ? err.message : "Could not generate report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={`Generate ${label} PDF`}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-warning/15 px-3.5 py-2 text-xs font-semibold text-warning transition-colors hover:bg-warning/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {loading ? "Generating…" : label}
      </button>
      {error && (
        <p role="alert" className="text-[11px] text-error">{error}</p>
      )}
    </div>
  );
}
