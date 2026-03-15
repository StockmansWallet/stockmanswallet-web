"use client";

import { useState, useMemo } from "react";
import { saleyards } from "@/lib/data/reference-data";
import { Search } from "lucide-react";

export function StepSaleyard({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return saleyards;
    const lower = search.toLowerCase();
    return saleyards.filter((s) => s.toLowerCase().includes(lower));
  }, [search]);

  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary">Preferred Saleyard</h2>
      <p className="mt-1 text-sm text-text-muted">
        Select your closest saleyard for accurate local pricing. You can change this later.
      </p>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saleyards..."
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-brand"
        />
      </div>

      <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-white/5 p-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-xs text-text-muted">No saleyards found</p>
        ) : (
          filtered.map((sy) => (
            <button
              key={sy}
              type="button"
              onClick={() => onChange(sy)}
              className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                value === sy
                  ? "bg-brand/15 font-medium text-brand"
                  : "text-text-secondary hover:bg-white/[0.03]"
              }`}
            >
              {sy}
            </button>
          ))
        )}
      </div>

      {value && (
        <p className="mt-2 text-xs text-brand">Selected: {value}</p>
      )}
    </div>
  );
}
