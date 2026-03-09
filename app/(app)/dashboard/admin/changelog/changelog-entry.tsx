"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DevUpdate } from "@/lib/types/dev-docs";

export function ChangelogEntry({ entry }: { entry: DevUpdate }) {
  const [showDetail, setShowDetail] = useState(false);
  const bullets = entry.summary.split("\n").filter((line) => line.trim());

  return (
    <div className="border-b border-white/5 py-3 last:border-b-0">
      {/* Section title */}
      <h3 className="text-sm font-medium text-text-primary">{entry.title}</h3>

      {/* Summary bullets */}
      <ul className="mt-2 space-y-1">
        {bullets.map((bullet, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-xs text-text-secondary"
          >
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-muted" />
            {bullet}
          </li>
        ))}
      </ul>

      {/* Detail toggle */}
      {entry.detail && (
        <div className="mt-2">
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="inline-flex items-center gap-1 text-xs font-medium text-text-muted transition-colors hover:text-text-secondary"
          >
            {showDetail ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {showDetail ? "Hide details" : "View details"}
          </button>

          {showDetail && (
            <div className="mt-2 rounded-xl bg-white/[0.03] px-4 py-3">
              {entry.detail.split("\n\n").map((paragraph, i) => (
                <p
                  key={i}
                  className="mb-2 text-xs leading-relaxed text-text-muted last:mb-0"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
