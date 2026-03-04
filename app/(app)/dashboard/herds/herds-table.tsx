"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronUp, ChevronRight } from "lucide-react";

type HerdWithProperty = {
  id: string;
  name: string;
  species: string;
  breed: string;
  category: string;
  sex: string;
  head_count: number;
  current_weight: number;
  properties: { property_name: string } | null;
  [key: string]: unknown;
};

const SPECIES_TABS = ["All", "Cattle", "Sheep", "Pig", "Goat"] as const;

const speciesBadgeVariant: Record<string, "brand" | "success" | "info" | "warning"> = {
  Cattle: "brand",
  Sheep: "success",
  Pig: "info",
  Goat: "warning",
};

type SortKey = "name" | "breed" | "category" | "head_count" | "current_weight" | null;

export function HerdsTable({ herds }: { herds: HerdWithProperty[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Count per species for tab badges
  const speciesCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of herds) {
      counts[h.species] = (counts[h.species] || 0) + 1;
    }
    return counts;
  }, [herds]);

  // Filter by species
  const speciesFiltered = useMemo(
    () => (activeTab === "All" ? herds : herds.filter((h) => h.species === activeTab)),
    [herds, activeTab]
  );

  // Search
  const searched = useMemo(() => {
    if (!search.trim()) return speciesFiltered;
    const q = search.toLowerCase();
    return speciesFiltered.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.breed.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q)
    );
  }, [speciesFiltered, search]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return searched;
    return [...searched].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [searched, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null;
    return (
      <ChevronUp
        className={`ml-0.5 inline h-3 w-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`}
      />
    );
  }

  return (
    <div>
      {/* Toolbar: species pills + search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Species filter pills */}
        <div className="flex gap-1.5">
          {SPECIES_TABS.map((tab) => {
            const count = tab === "All" ? herds.length : speciesCounts[tab] || 0;
            if (tab !== "All" && count === 0) return null;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-brand/15 text-brand ring-1 ring-inset ring-brand/25"
                    : "bg-white/5 text-text-muted ring-1 ring-inset ring-white/8 hover:bg-white/8 hover:text-text-secondary"
                }`}
              >
                {tab}
                <span
                  className={`tabular-nums ${isActive ? "text-brand/70" : "text-text-muted/60"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search herds..."
            className="w-full rounded-xl border border-white/8 bg-white/5 py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-brand/50 focus:ring-2 focus:ring-brand/20 sm:w-64"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-inset ring-white/8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/6">
                <th
                  onClick={() => handleSort("name")}
                  className="cursor-pointer select-none px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary"
                >
                  Name <SortIcon column="name" />
                </th>
                <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                  Species
                </th>
                <th
                  onClick={() => handleSort("breed")}
                  className="cursor-pointer select-none px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary"
                >
                  Breed <SortIcon column="breed" />
                </th>
                <th
                  onClick={() => handleSort("category")}
                  className="hidden cursor-pointer select-none px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary md:table-cell"
                >
                  Category <SortIcon column="category" />
                </th>
                <th
                  onClick={() => handleSort("head_count")}
                  className="cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary"
                >
                  Head <SortIcon column="head_count" />
                </th>
                <th
                  onClick={() => handleSort("current_weight")}
                  className="hidden cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary lg:table-cell"
                >
                  Weight <SortIcon column="current_weight" />
                </th>
                <th className="hidden px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted xl:table-cell">
                  Property
                </th>
                <th className="w-10 px-3 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm text-text-muted">
                    {search ? "No herds match your search." : "No herds found."}
                  </td>
                </tr>
              ) : (
                sorted.map((herd) => (
                  <tr
                    key={herd.id}
                    onClick={() => router.push(`/dashboard/herds/${herd.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-text-primary">{herd.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={speciesBadgeVariant[herd.species] ?? "default"}>
                        {herd.species}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">{herd.breed}</td>
                    <td className="hidden px-5 py-3.5 text-text-secondary md:table-cell">
                      {herd.category}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-medium text-text-primary">
                      {herd.head_count?.toLocaleString() ?? "—"}
                    </td>
                    <td className="hidden px-5 py-3.5 text-right tabular-nums text-text-secondary lg:table-cell">
                      {herd.current_weight ? `${herd.current_weight.toLocaleString()} kg` : "—"}
                    </td>
                    <td className="hidden px-5 py-3.5 text-text-muted xl:table-cell">
                      {herd.properties?.property_name ?? "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      <ChevronRight className="h-4 w-4 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {sorted.length > 0 && (
          <div className="border-t border-white/6 px-5 py-3">
            <p className="text-xs text-text-muted">
              {sorted.length === herds.length
                ? `${herds.length} ${herds.length === 1 ? "herd" : "herds"}`
                : `${sorted.length} of ${herds.length} herds`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
