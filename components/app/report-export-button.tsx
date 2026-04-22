"use client";

// Single pill button that generates a PDF server-side via /api/reports/
// generate (Puppeteer -> Supabase Storage -> signed URL) and triggers a
// native browser download.
//
// A dynamically-created <a download=filename> element is used rather
// than window.open so popup blockers don't touch it and the file lands
// in Downloads with the friendly filename. The signed URL carries
// Content-Disposition: attachment from the server, which is what
// actually forces the save-as flow for cross-origin URLs.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ReportType } from "@/lib/pdf/generate";

interface ReportExportButtonProps {
  label: string;
  reportType: ReportType;
  /**
   * Extra config params to merge into the POST body. Pages with bespoke
   * inputs outside the URL searchParams (e.g. Accountant Report's FY
   * selector + Opening Book Value) pass them here. Values take precedence
   * over any conflicting keys read from searchParams.
   */
  extraConfig?: Record<string, string>;
}

// Keep in sync with lib/pdf/generate.ts#FORWARDED_PARAMS. Extend carefully
// since the API revalidates each value against a per-key regex.
const FORWARD_KEYS = ["range", "start", "end", "properties", "fy", "openingBook"] as const;

export function ReportExportButton({ label, reportType, extraConfig }: ReportExportButtonProps) {
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

      // Only forward params the API accepts. Server revalidates regardless.
      // extraConfig overrides searchParams so page-local state wins over
      // whatever was in the URL.
      const config: Record<string, string> = {};
      for (const key of FORWARD_KEYS) {
        const value = searchParams.get(key);
        if (value) config[key] = value;
      }
      if (extraConfig) {
        for (const [key, value] of Object.entries(extraConfig)) {
          if (value) config[key] = value;
        }
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

      const { signedUrl, filename } = (await response.json()) as {
        signedUrl: string;
        filename: string;
      };

      // Programmatic anchor click triggers the browser's native download
      // flow. Not subject to popup-blocker rules that catch window.open
      // after an await.
      const a = document.createElement("a");
      a.href = signedUrl;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
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
        aria-label={`Download ${label} PDF`}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-reports/15 px-3.5 py-2 text-xs font-semibold text-reports transition-colors hover:bg-reports/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {loading ? "Generating…" : label}
      </button>
      {error && (
        <p role="alert" className="text-[11px] text-error">{error}</p>
      )}
    </div>
  );
}
