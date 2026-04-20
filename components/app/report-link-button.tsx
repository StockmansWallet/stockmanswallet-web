"use client";

import { useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";

// Opens a report preview route in a new tab with current searchParams
// preserved (so the user's date-range and property filters carry through).
// The preview page has its own "Save as PDF" button that triggers the
// browser's print dialog, so this component intentionally stays simple -
// no Puppeteer fetch, no auth header, no loading state.
interface ReportLinkButtonProps {
  label: string;
  reportPath: string;
}

export function ReportLinkButton({ label, reportPath }: ReportLinkButtonProps) {
  const searchParams = useSearchParams();

  function handleClick() {
    const qs = searchParams.toString();
    const url = qs ? `${reportPath}?${qs}` : reportPath;
    window.open(url, "_blank");
  }

  return (
    <button
      onClick={handleClick}
      aria-label={`Open ${label} preview in a new tab`}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-warning/15 px-3.5 py-2 text-xs font-semibold text-warning transition-colors hover:bg-warning/25"
    >
      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
