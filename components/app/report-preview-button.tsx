"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Eye, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ReportPreviewButtonProps {
  reportPath: string;
}

// Debug: Two actions: Preview (opens print template in new tab) and Export PDF (downloads from API).
// Both web and iOS use the same API endpoint for PDF export, producing identical output.
export function ReportPreviewButton({ reportPath }: ReportPreviewButtonProps) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build a sensible filename from the last segment of the report path
  const downloadFilename = (() => {
    const slug = reportPath.replace(/^\//, "").split("/").pop() ?? "report";
    const pascal = slug.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
    return `${pascal}.pdf`;
  })();

  function handlePreview() {
    const params = searchParams.toString();
    const url = params ? `${reportPath}?${params}` : reportPath;
    window.open(url, "_blank");
  }

  async function handleExportPDF() {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in again to export.");
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set("token", session.access_token);
      const pdfURL = `/api/report${reportPath}/pdf?${params.toString()}`;

      const response = await fetch(pdfURL);
      if (!response.ok) throw new Error(`PDF generation failed: ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
      setError(err instanceof Error ? err.message : "Could not export PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <button
          onClick={handlePreview}
          aria-label="Open report preview in a new tab"
          className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-white/[0.1]"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          Preview
        </button>
        <button
          onClick={handleExportPDF}
          disabled={isLoading}
          aria-label="Download report as PDF"
          className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3.5 py-2 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isLoading ? "Generating..." : "Export PDF"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-red-400">{error}</p>
      )}
    </div>
  );
}
