"use client";

import { useRouter } from "next/navigation";
import { useViewMode } from "@/lib/hooks/use-view-mode";
import { Tractor, Briefcase } from "lucide-react";

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useViewMode();
  const router = useRouter();

  return (
    <div className="flex gap-1 rounded-xl bg-surface p-1">
      <button
        onClick={() => { setViewMode("farmer"); router.push("/dashboard"); }}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
          viewMode === "farmer"
            ? "bg-brand/20 text-brand shadow-sm"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        <Tractor className="h-3.5 w-3.5" />
        Farmer
      </button>
      <button
        onClick={() => { setViewMode("advisor"); router.push("/dashboard/advisor"); }}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
          viewMode === "advisor"
            ? "bg-purple-500/20 text-purple-400 shadow-sm"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        <Briefcase className="h-3.5 w-3.5" />
        Advisor
      </button>
    </div>
  );
}
