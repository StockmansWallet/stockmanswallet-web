"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { saleyards, saleyardToState } from "@/lib/data/reference-data";
import { Info } from "lucide-react";

interface StepSaleyardProps {
  selectedSaleyard: string;
  onSaleyardChange: (v: string) => void;
}

// Group saleyards by state
function groupedSaleyards() {
  const groups: Record<string, string[]> = {};
  for (const s of saleyards) {
    const state = saleyardToState[s] ?? "Other";
    if (!groups[state]) groups[state] = [];
    groups[state].push(s);
  }
  // Sort states: NSW, QLD, VIC, SA, WA, TAS
  const order = ["NSW", "QLD", "VIC", "SA", "WA", "TAS", "Other"];
  return order.filter((st) => groups[st]).map((st) => ({ state: st, yards: groups[st] }));
}

export function StepSaleyard({ selectedSaleyard, onSaleyardChange }: StepSaleyardProps) {
  const [search, setSearch] = useState("");
  const groups = groupedSaleyards();

  const lowerSearch = search.toLowerCase();
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      yards: g.yards.filter((y) => y.toLowerCase().includes(lowerSearch)),
    }))
    .filter((g) => g.yards.length > 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Saleyard</h2>
        <p className="mt-1 text-sm text-text-secondary">Select the saleyard used for valuation.</p>
      </div>

      <Input
        id="saleyard_search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search saleyards..."
      />

      <div className="max-h-80 space-y-4 overflow-y-auto rounded-xl">
        {filteredGroups.map((g) => (
          <div key={g.state}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">{g.state}</p>
            <div className="space-y-1">
              {g.yards.map((yard) => (
                <button
                  key={yard}
                  type="button"
                  onClick={() => onSaleyardChange(yard)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                    selectedSaleyard === yard
                      ? "bg-brand/15 text-brand font-medium"
                      : "text-text-primary hover:bg-surface-raised"
                  }`}
                >
                  {yard}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <p className="py-4 text-center text-sm text-text-muted">No saleyards match your search.</p>
        )}
      </div>

      <div className="flex gap-3 rounded-xl bg-surface-lowest p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p className="text-xs text-text-secondary">
          Your herd is valued using the selected saleyard. You can change this anytime.
        </p>
      </div>
    </div>
  );
}
