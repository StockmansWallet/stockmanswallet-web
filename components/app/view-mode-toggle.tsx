"use client";

import { useViewMode } from "@/lib/hooks/use-view-mode";
import { Tractor, Briefcase } from "lucide-react";

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div className="px-5 pb-4">
      <div className="flex gap-1 rounded-xl bg-surface p-1">
        <button
          onClick={() => setViewMode("farmer")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
            viewMode === "farmer"
              ? "bg-brand/20 text-brand shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Tractor className="h-3.5 w-3.5" />
          Farmer
        </button>
        <button
          onClick={() => setViewMode("advisor")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
            viewMode === "advisor"
              ? "bg-purple-500/20 text-purple-400 shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          Advisor
        </button>
      </div>
      <p className="mt-1 text-center text-[10px] text-text-muted/50">Dev toggle</p>
    </div>
  );
}
