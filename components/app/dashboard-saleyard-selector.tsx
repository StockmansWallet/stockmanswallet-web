"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, ChevronDown, X, Search } from "lucide-react";
import {
  saleyards,
  saleyardToState,
  saleyardCoordinates,
  saleyardLocality,
} from "@/lib/data/reference-data";
import { useActiveSaleyards } from "@/lib/data/use-active-saleyards";

const stateOrder = ["NSW", "QLD", "VIC", "SA", "WA", "TAS", "Other"] as const;

function groupedSaleyards(visible: readonly string[]) {
  const groups: Record<string, string[]> = {};
  for (const s of visible) {
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
    .replace(
      / (Dalrymple |Northern Victoria |Great Southern Regional Cattle |Gippsland Regional |South Eastern |Western Victorian |Victorian |Southern |South Australian )?Saleyards?$/i,
      ""
    )
    .replace(/ Livestock Exchange$/i, "")
    .trim();
}

/** Haversine great-circle distance in km */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns up to 3 closest saleyards to a property, using coordinates or state fallback */
function closestSaleyards(
  property: { latitude?: number | null; longitude?: number | null; state?: string | null } | null,
  visible: readonly string[]
): string[] {
  if (!property) return [];
  if (property.latitude != null && property.longitude != null) {
    const distances = visible
      .filter((s) => saleyardCoordinates[s])
      .map((s) => ({
        name: s,
        dist: haversineDistance(
          property.latitude!,
          property.longitude!,
          saleyardCoordinates[s].lat,
          saleyardCoordinates[s].lon
        ),
      }))
      .sort((a, b) => a.dist - b.dist);
    return distances.slice(0, 3).map((d) => d.name);
  }
  if (property.state) {
    return visible.filter((s) => saleyardToState[s] === property.state).slice(0, 3);
  }
  return [];
}

interface DashboardSaleyardSelectorProps {
  currentSaleyard: string | null;
  primaryProperty?: {
    latitude?: number | null;
    longitude?: number | null;
    state?: string | null;
  } | null;
}

export function DashboardSaleyardSelector({
  currentSaleyard,
  primaryProperty,
}: DashboardSaleyardSelectorProps) {
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

  // Hide MLA yards with stale (>365d) data. Empty active set means "still
  // loading or fetch failed" - fall back to the full canonical list so the
  // selector stays usable rather than appearing empty.
  const activeSaleyards = useActiveSaleyards();
  const visibleYards = useMemo(
    () => (activeSaleyards.size === 0 ? saleyards : saleyards.filter((s) => activeSaleyards.has(s))),
    [activeSaleyards]
  );

  const nearbyYards = closestSaleyards(primaryProperty ?? null, visibleYards);
  const nearbySet = new Set(nearbyYards);

  const groups = groupedSaleyards(visibleYards);
  const lowerSearch = search.toLowerCase();

  const filteredNearby = nearbyYards.filter((y) => y.toLowerCase().includes(lowerSearch));
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      yards: g.yards.filter((y) => y.toLowerCase().includes(lowerSearch) && !nearbySet.has(y)),
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
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-3 py-3 text-left text-sm transition-colors hover:from-white/[0.09] hover:to-white/[0.04]"
      >
        <MapPin className="text-brand h-4 w-4 shrink-0" />
        <span
          className={`flex-1 truncate ${displayName ? "text-text-primary font-medium" : "text-text-muted"}`}
        >
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
            <X className="text-text-muted h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown
            className={`text-text-muted h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 left-0 z-50 mt-1 max-h-80 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding shadow-2xl shadow-black/35 backdrop-blur-xl backdrop-saturate-150">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
            <Search className="text-text-muted h-3.5 w-3.5" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saleyards..."
              className="text-text-primary placeholder:text-text-muted flex-1 bg-transparent text-sm outline-none"
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

            {/* National averages option */}
            <button
              type="button"
              onClick={() => selectSaleyard("National")}
              className={`mb-1 w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all ${
                currentSaleyard === "National"
                  ? "bg-brand/15 text-brand font-medium"
                  : "text-text-primary hover:bg-surface-raised"
              }`}
            >
              Use National Averages
            </button>

            {/* Close to your property */}
            {filteredNearby.length > 0 && (
              <div className="mt-2">
                <p className="text-text-muted mb-1 px-3 text-[10px] font-semibold tracking-wider uppercase">
                  Close to Your Property
                </p>
                {filteredNearby.map((yard) => (
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
                    <span>{shortName(yard)}</span>
                    {saleyardLocality[yard] && (
                      <span className="text-text-muted ml-2 text-xs">{saleyardLocality[yard]}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {filteredGroups.map((g) => (
              <div key={g.state} className="mt-2">
                <p className="text-text-muted mb-1 px-3 text-[10px] font-semibold tracking-wider uppercase">
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
              <p className="text-text-muted py-4 text-center text-sm">
                No saleyards match your search.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
