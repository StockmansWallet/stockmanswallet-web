"use client";

// Client wrapper for the Saleyards page. Owns:
// - filter / search state (state dropdown, "show stale" toggle, search box)
// - selected yard state (clicking a list row flies the map to that marker)
// - distance computation against the user's primary property
//
// The actual Leaflet map is dynamically imported with ssr:false so the
// `window`-dependent leaflet bundle never lands in the server graph.

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

export interface SaleyardRow {
  name: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  streetAddress: string | null;
  locality: string | null;
  lastDataDate: string | null;
  daysSinceLast: number | null;
  isStale: boolean;
}

interface Props {
  yards: SaleyardRow[];
  primaryProperty: { name: string; latitude: number | null; longitude: number | null } | null;
}

// Loading placeholder while the leaflet bundle is fetched. Sized to match the
// real map so the layout doesn't jump when it hydrates.
function MapLoading() {
  return (
    <div className="bg-surface-lowest text-text-muted flex h-[38vh] min-h-[300px] w-full items-center justify-center rounded-2xl text-sm">
      Loading map...
    </div>
  );
}

const SaleyardsGoogleMap = dynamic(() => import("./saleyards-google-map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

const STATE_ORDER = ["NSW", "QLD", "VIC", "SA", "WA", "TAS", "NT", "ACT"] as const;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDataDate(iso: string | null, days: number | null): string {
  if (!iso) return "No reports on file";
  const date = new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (days == null) return date;
  if (days < 7) return `${date} (this week)`;
  if (days < 30) return `${date} (${days} days ago)`;
  if (days < 365) return `${date} (${Math.round(days / 30)} months ago)`;
  const years = (days / 365).toFixed(1);
  return `${date} (${years} years ago)`;
}

export function SaleyardsMapView({ yards, primaryProperty }: Props) {
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [showStale, setShowStale] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedYard, setSelectedYard] = useState<string | null>(null);

  // Hydrate yards with distance + apply filters.
  const enriched = useMemo(() => {
    const lat = primaryProperty?.latitude;
    const lon = primaryProperty?.longitude;
    return yards.map((y) => {
      const distanceKm =
        lat != null && lon != null && y.latitude != null && y.longitude != null
          ? haversineKm(lat, lon, y.latitude, y.longitude)
          : null;
      return { ...y, distanceKm };
    });
  }, [yards, primaryProperty]);

  const filtered = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return enriched.filter((y) => {
      if (!showStale && y.isStale) return false;
      if (stateFilter !== "all" && y.state !== stateFilter) return false;
      if (lower && !y.name.toLowerCase().includes(lower) && !(y.locality ?? "").toLowerCase().includes(lower)) {
        return false;
      }
      return y.latitude != null && y.longitude != null;
    });
  }, [enriched, search, stateFilter, showStale]);

  // Sort: by distance if we have one, else by name. Active first within each group.
  const sortedForList = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.isStale !== b.isStale) return a.isStale ? 1 : -1;
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filtered]);

  const activeCount = filtered.filter((y) => !y.isStale).length;
  const staleCount = filtered.filter((y) => y.isStale).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-full border border-white/[0.08] bg-surface-lowest px-3 py-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="text-text-muted pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search yards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface-lowest text-text-primary placeholder:text-text-muted focus:ring-brangus w-full rounded-full py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2"
            />
          </div>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="bg-surface-lowest text-text-primary rounded-full px-3 py-2 text-sm"
          >
            <option value="all">All states</option>
            {STATE_ORDER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="text-text-secondary flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showStale}
              onChange={(e) => setShowStale(e.target.checked)}
              className="accent-brangus"
            />
            Show stale yards
          </label>
          <span className="text-text-muted text-xs">
            {activeCount} active{staleCount > 0 ? ` · ${staleCount} stale` : ""}
          </span>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <SaleyardsGoogleMap
          yards={filtered}
          primaryProperty={primaryProperty}
          selectedYard={selectedYard}
          onSelectYard={setSelectedYard}
          formatDataDate={formatDataDate}
        />
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 gap-3 border-b border-white/[0.06] px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">
            <span className="col-span-5">Yard</span>
            <span className="col-span-1">State</span>
            <span className="col-span-3">Last MLA report</span>
            <span className="col-span-2 text-right">Distance</span>
            <span className="col-span-1 text-right">Status</span>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {sortedForList.map((y) => (
              <li key={y.name}>
                <button
                  onClick={() => setSelectedYard(y.name)}
                  className={`grid w-full grid-cols-12 gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] ${
                    selectedYard === y.name ? "bg-white/[0.05]" : ""
                  } ${y.isStale ? "opacity-60" : ""}`}
                >
                  <span className="col-span-5 truncate text-sm text-text-primary">{y.name}</span>
                  <span className="col-span-1 text-xs text-text-muted">{y.state}</span>
                  <span className="col-span-3 truncate text-xs text-text-muted">
                    {formatDataDate(y.lastDataDate, y.daysSinceLast)}
                  </span>
                  <span className="col-span-2 text-right text-xs text-text-muted">
                    {y.distanceKm != null ? `${Math.round(y.distanceKm)} km` : "—"}
                  </span>
                  <span className="col-span-1 text-right text-[10px] font-semibold uppercase">
                    {y.isStale ? (
                      <span className="text-text-muted">Stale</span>
                    ) : (
                      <span className="text-ch40">Active</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {sortedForList.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-text-muted">
                No saleyards match your filters.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
