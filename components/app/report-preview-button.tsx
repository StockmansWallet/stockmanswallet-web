"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ReportPreviewButtonProps {
  reportPath: string;
}

// Debug: Downloads a server-rendered PDF from the API endpoint.
// Both web and iOS use the same endpoint, producing identical PDFs.
export function ReportPreviewButton({ reportPath }: ReportPreviewButtonProps) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      // Get JWT for the API call
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Build the PDF API URL with the same params
      const params = new URLSearchParams(searchParams.toString());
      params.set("token", session.access_token);
      const pdfURL = `/api/report${reportPath}/pdf?${params.toString()}`;

      // Download the PDF
      const response = await fetch(pdfURL);
      if (!response.ok) throw new Error(`PDF generation failed: ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = "AssetRegister.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <FileText className="h-3.5 w-3.5" />
      )}
      {isLoading ? "Generating..." : "Export PDF"}
    </button>
  );
}
