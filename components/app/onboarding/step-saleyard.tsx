"use client";

import { useState, useMemo } from "react";
import {
  saleyards,
  saleyardLocality,
  saleyardToState,
} from "@/lib/data/reference-data";
import { Search, Building2, ChevronRight } from "lucide-react";

export function StepSaleyard({
  value,
  propertyState,
  onChange,
}: {
  value?: string;
  propertyState?: string;
  onChange: (v: string) => void;
}) {
  const [showBrowse, setShowBrowse] = useState(false);
  const [search, setSearch] = useState("");

  // Get the 3 closest saleyards by state match
  const closeSaleyards = useMemo(() => {
    if (!propertyState) return saleyards.slice(0, 3);
    const stateMatches = saleyards.filter(
      (s) => saleyardToState[s] === propertyState
    );
    return stateMatches.slice(0, 3);
  }, [propertyState]);

  // Filtered list for browse mode
  const filtered = useMemo(() => {
    if (!search.trim()) return [...saleyards];
    const lower = search.toLowerCase();
    return saleyards.filter((s) => s.toLowerCase().includes(lower));
  }, [search]);

  // Check if current selection is in close saleyards or the National option
  const isSelectionInClose = value
    ? value === "National" || (closeSaleyards as readonly string[]).includes(value)
    : false;

  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary">
        Preferred Saleyard
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Select your preferred saleyard for valuations and freight estimates
      </p>

      {/* National Averages option */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => onChange("National")}
          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
            value === "National"
              ? "border-brand bg-brand/10"
              : "border-white/10 bg-white/[0.02] hover:border-white/20"
          }`}
        >
          <div
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
              value === "National"
                ? "border-brand bg-brand"
                : "border-white/30"
            }`}
          >
            {value === "National" && (
              <div className="h-2 w-2 rounded-full bg-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-text-primary">Use National Averages</p>
            <p className="text-xs text-text-muted">
              Aggregated pricing across all Australian saleyards
            </p>
          </div>
        </button>
      </div>

      {/* Close to your property */}
      {closeSaleyards.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            Close to your property
          </p>
          <div className="space-y-1.5">
            {closeSaleyards.map((sy) => (
              <button
                key={sy}
                type="button"
                onClick={() => onChange(sy)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                  value === sy
                    ? "border-brand bg-brand/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <div
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    value === sy
                      ? "border-brand bg-brand"
                      : "border-white/30"
                  }`}
                >
                  {value === sy && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">{sy}</p>
                  {saleyardLocality[sy] && (
                    <p className="text-xs text-text-muted">
                      {saleyardLocality[sy]}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Browse All Saleyards */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowBrowse(!showBrowse)}
          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
            !isSelectionInClose && value
              ? "border-brand bg-brand/10"
              : "border-white/10 bg-white/[0.02] hover:border-white/20"
          }`}
        >
          <Building2 className="h-4 w-4 flex-shrink-0 text-text-muted" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text-primary">
              {!isSelectionInClose && value
                ? value
                : "Browse All Saleyards"}
            </p>
            {!isSelectionInClose && value && saleyardLocality[value] && (
              <p className="text-xs text-text-muted">
                {saleyardLocality[value]}
              </p>
            )}
          </div>
          <ChevronRight
            className={`h-4 w-4 flex-shrink-0 text-text-muted transition-transform ${
              showBrowse ? "rotate-90" : ""
            }`}
          />
        </button>

        {showBrowse && (
          <div className="mt-2 rounded-lg border border-white/10 p-2">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search saleyards..."
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-text-muted">
                  No saleyards found
                </p>
              ) : (
                filtered.map((sy) => (
                  <button
                    key={sy}
                    type="button"
                    onClick={() => {
                      onChange(sy);
                      setShowBrowse(false);
                    }}
                    className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                      value === sy
                        ? "bg-brand/15 font-medium text-brand"
                        : "text-text-secondary hover:bg-white/[0.03]"
                    }`}
                  >
                    <span>{sy}</span>
                    {saleyardLocality[sy] && (
                      <span className="ml-2 text-xs text-text-muted">
                        {saleyardLocality[sy]}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        This will be set as the default saleyard for your primary property. You
        can change it later in Settings.
      </p>
    </div>
  );
}
