"use client";

import { useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";

interface ReportPreviewButtonProps {
  reportPath: string;
}

export function ReportPreviewButton({ reportPath }: ReportPreviewButtonProps) {
  const searchParams = useSearchParams();

  function handleClick() {
    const params = searchParams.toString();
    const url = params ? `${reportPath}?${params}` : reportPath;
    window.open(url, "_blank");
  }

  return (
    <button
      onClick={handleClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/25"
    >
      <FileText className="h-3.5 w-3.5" />
      Preview &amp; Export PDF
    </button>
  );
}
