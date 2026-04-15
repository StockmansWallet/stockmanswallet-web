"use client";

export function PrintActions() {
  return (
    <div className="no-print fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm text-gray-500">
        Preview your report below. Uncheck &quot;Headers and footers&quot; in print settings for a clean PDF.
      </p>
      <button
        onClick={() => window.print()}
        className="rounded-full bg-[#FFAA00] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#E69900]"
      >
        Save as PDF
      </button>
    </div>
  );
}
