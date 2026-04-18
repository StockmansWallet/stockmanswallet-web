"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";

interface FarmerDirectorySearchProps {
  currentSearch: string;
  currentState: string;
  currentSpecies: string;
}

const AUSTRALIAN_STATES = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"] as const;
const SPECIES_OPTIONS = ["Cattle", "Sheep", "Pig", "Goat"] as const;

export function FarmerDirectorySearch({
  currentSearch,
  currentState,
  currentSpecies,
}: FarmerDirectorySearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch);

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value && value.length > 0) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/dashboard/farmer-network/directory?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    pushParams({ q: searchValue });
  };

  const anyFilterActive = Boolean(currentSearch || currentState || currentSpecies);

  const stateChip = (value: string, label: string) => {
    const active = currentState === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => pushParams({ state: active ? null : value })}
        aria-pressed={active}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          active
            ? "border-orange-500/40 bg-orange-500/15 text-orange-300"
            : "border-white/[0.08] bg-surface text-text-muted hover:border-white/20 hover:text-text-secondary"
        }`}
      >
        {label}
      </button>
    );
  };

  const speciesChip = (value: string) => {
    const active = currentSpecies === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => pushParams({ species: active ? null : value })}
        aria-pressed={active}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          active
            ? "border-orange-500/40 bg-orange-500/15 text-orange-300"
            : "border-white/[0.08] bg-surface text-text-muted hover:border-white/20 hover:text-text-secondary"
        }`}
      >
        {value}
      </button>
    );
  };

  return (
    <div className="mb-6 space-y-3">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search by name or property..."
          aria-label="Search producers"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onBlur={() => pushParams({ q: searchValue })}
          className="w-full rounded-full border border-white/5 bg-surface py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-orange-500/30 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">State:</span>
        {AUSTRALIAN_STATES.map((s) => stateChip(s, s))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Species:</span>
        {SPECIES_OPTIONS.map((s) => speciesChip(s))}
      </div>

      {anyFilterActive && (
        <button
          type="button"
          onClick={() => {
            setSearchValue("");
            pushParams({ q: null, state: null, species: null });
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}
