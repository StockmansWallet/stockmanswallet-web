"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, ChevronDown, X, Search } from "lucide-react";
import { saleyards, saleyardToState } from "@/lib/data/reference-data";

const stateOrder = ["NSW", "QLD", "VIC", "SA", "WA", "TAS", "Other"] as const;

function groupedSaleyards() {
  const groups: Record<string, string[]> = {};
  for (const s of saleyards) {
    const state = saleyardToState[s] ?? "Other";
    if (!groups[state]) groups[state] = [];
    groups[state].push(s);
  }
  return stateOrder.filter((st) => groups[st]).map((st) => ({ state: st, yards: groups[st] }));
}

/** Short display name: strips common suffixes like "Saleyards", "Livestock Exchange", etc. */
function shortName(name: string): string {
  return name
    .replace(/ Livestock (Marketing Centre|Selling Centre|Exchange|Centre)$/i, "")
    .replace(/ Regional Livestock (Exchange|Market)$/i, "")
    .replace(/ Central [\w ]+ Livestock Exchange$/i, "")
    .replace(/ (Dalrymple |Northern Victoria |Great Southern Regional Cattle |Gippsland Regional |South Eastern |Western Victorian |Victorian |Southern |South Australian )?Saleyards?$/i, "")
    .replace(/ Livestock Exchange$/i, "")
    .trim();
}

interface DashboardSaleyardSelectorProps {
  currentSaleyard: string | null;
}

export function DashboardSaleyardSelector({ currentSaleyard }: DashboardSaleyardSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function selectSaleyard(yard: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (yard) {
      params.set("saleyard", yard);
    } else {
      params.delete("saleyard");
    }
    router.push(`/dashboard?${params.toString()}`);
    setOpen(false);
    setSearch("");
  }

  const groups = groupedSaleyards();
  const lowerSearch = search.toLowerCase();
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      yards: g.yards.filter((y) => y.toLowerCase().includes(lowerSearch)),
    }))
    .filter((g) => g.yards.length > 0);

  const displayName = currentSaleyard ? shortName(currentSaleyard) : null;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!open); } }}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-3 py-3 text-left text-sm transition-colors hover:from-white/[0.09] hover:to-white/[0.04]"
      >
        <MapPin className="h-4 w-4 shrink-0 text-brand" />
        <span className={`flex-1 truncate ${displayName ? "text-text-primary font-medium" : "text-text-muted"}`}>
          {displayName ?? "Your Herd\u2019s Combined Saleyards"}
        </span>
        {currentSaleyard ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              selectSaleyard(null);
            }}
            className="rounded p-1 hover:bg-white/10"
            aria-label="Clear saleyard"
          >
            <X className="h-3.5 w-3.5 text-text-muted" />
          </button>
        ) : (
          <ChevronDown className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1e] shadow-xl">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-text-muted" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saleyards..."
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            />
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {/* "All saleyards" default option */}
            <button
              type="button"
              onClick={() => selectSaleyard(null)}
              className={`mb-1 w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all ${
                !currentSaleyard
                  ? "bg-brand/15 text-brand font-medium"
                  : "text-text-primary hover:bg-surface-raised"
              }`}
            >
              Your Herd&#8217;s Combined Saleyards
            </button>

            {filteredGroups.map((g) => (
              <div key={g.state} className="mt-2">
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {g.state}
                </p>
                {g.yards.map((yard) => (
                  <button
                    key={yard}
                    type="button"
                    onClick={() => selectSaleyard(yard)}
                    className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all ${
                      currentSaleyard === yard
                        ? "bg-brand/15 text-brand font-medium"
                        : "text-text-primary hover:bg-surface-raised"
                    }`}
                  >
                    {shortName(yard)}
                  </button>
                ))}
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <p className="py-4 text-center text-sm text-text-muted">No saleyards match your search.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
