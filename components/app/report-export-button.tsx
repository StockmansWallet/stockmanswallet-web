"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import type { ReportData } from "@/lib/types/reports";

interface ReportExportButtonProps {
  reportData: ReportData;
  reportType: string;
  title: string;
}

export function ReportExportButton({ reportData, reportType, title }: ReportExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const { generateReportPDF } = await import("@/lib/services/report-pdf-service");
      const pdfBytes = await generateReportPDF(reportData, reportType, title);
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
      setError(err instanceof Error ? err.message : "Could not export PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading} aria-label="Download report as PDF">
        {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
        Export PDF
      </Button>
      {error && (
        <p role="alert" className="text-[11px] text-error">{error}</p>
      )}
    </div>
  );
}
