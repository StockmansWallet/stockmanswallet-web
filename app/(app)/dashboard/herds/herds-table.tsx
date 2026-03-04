"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronUp, ChevronRight, Home } from "lucide-react";

type HerdWithProperty = {
  id: string;
  name: string;
  species: string;
  breed: string;
  category: string;
  sex: string;
  head_count: number;
  current_weight: number;
  property_id: string | null;
  properties: { property_name: string } | null;
  [key: string]: unknown;
};

type PropertyGroup = {
  id: string;
  name: string;
  isDefault: boolean;
};

const SPECIES_TABS = ["All", "Cattle", "Sheep", "Pig", "Goat"] as const;

const speciesBadgeVariant: Record<string, "brand" | "success" | "info" | "warning"> = {
  Cattle: "brand",
  Sheep: "success",
  Pig: "info",
  Goat: "warning",
};

type SortKey = "name" | "breed" | "category" | "head_count" | "current_weight" | "value" | null;

export function HerdsTable({
  herds,
  herdValues,
  propertyGroups,
}: {
  herds: HerdWithProperty[];
  herdValues: Record<string, number>;
  propertyGroups: PropertyGroup[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const speciesCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of herds) {
      counts[h.species] = (counts[h.species] || 0) + 1;
    }
    return counts;
  }, [herds]);

  const speciesFiltered = useMemo(
    () => (activeTab === "All" ? herds : herds.filter((h) => h.species === activeTab)),
    [herds, activeTab]
  );

  const searched = useMemo(() => {
    if (!search.trim()) return speciesFiltered;
    const q = search.toLowerCase();
    return speciesFiltered.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.breed.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q) ||
        (h.properties?.property_name ?? "").toLowerCase().includes(q)
    );
  }, [speciesFiltered, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return searched;
    return [...searched].sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;
      if (sortKey === "value") {
        aVal = herdValues[a.id] ?? 0;
        bVal = herdValues[b.id] ?? 0;
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [searched, sortKey, sortDir, herdValues]);

  // Group herds by property, preserving the property order from server
  const groupedHerds = useMemo(() => {
    const byProperty = new Map<string | null, HerdWithProperty[]>();
    for (const h of sorted) {
      const pid = h.property_id ?? null;
      const arr = byProperty.get(pid) ?? [];
      arr.push(h);
      byProperty.set(pid, arr);
    }

    const groups: { id: string | null; name: string; isDefault: boolean; herds: HerdWithProperty[] }[] = [];

    // Add groups in property order (default first, then alphabetical)
    for (const pg of propertyGroups) {
      const groupHerds = byProperty.get(pg.id);
      if (groupHerds && groupHerds.length > 0) {
        groups.push({ id: pg.id, name: pg.name, isDefault: pg.isDefault, herds: groupHerds });
        byProperty.delete(pg.id);
      }
    }

    // Any remaining (unassigned or unknown property_id)
    const unassigned = byProperty.get(null);
    if (unassigned && unassigned.length > 0) {
      groups.push({ id: null, name: "Unassigned", isDefault: false, herds: unassigned });
    }

    // Any property_ids not in propertyGroups (shouldn't happen, but safe)
    for (const [pid, groupHerds] of byProperty) {
      if (pid !== null && groupHerds.length > 0) {
        const name = groupHerds[0]?.properties?.property_name ?? "Unknown Property";
        groups.push({ id: pid, name, isDefault: false, herds: groupHerds });
      }
    }

    return groups;
  }, [sorted, propertyGroups]);

  const hasMultipleGroups = groupedHerds.length > 1 || (groupedHerds.length === 1 && propertyGroups.length > 1);

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

  function TableHeaders() {
    return (
      <>
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
          className="hidden cursor-pointer select-none px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary md:table-cell"
        >
          Breed <SortIcon column="breed" />
        </th>
        <th
          onClick={() => handleSort("category")}
          className="hidden cursor-pointer select-none px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary lg:table-cell"
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
          onClick={() => handleSort("value")}
          className="cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary"
        >
          Value <SortIcon column="value" />
        </th>
        <th
          onClick={() => handleSort("current_weight")}
          className="hidden cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary xl:table-cell"
        >
          Weight <SortIcon column="current_weight" />
        </th>
        <th className="w-10 px-3 py-3.5" />
      </>
    );
  }

  function HerdRow({ herd }: { herd: HerdWithProperty }) {
    const value = herdValues[herd.id] ?? 0;
    return (
      <tr
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
        <td className="hidden px-5 py-3.5 text-text-secondary md:table-cell">{herd.breed}</td>
        <td className="hidden px-5 py-3.5 text-text-secondary lg:table-cell">{herd.category}</td>
        <td className="px-5 py-3.5 text-right tabular-nums font-medium text-text-primary">
          {herd.head_count?.toLocaleString() ?? "\u2014"}
        </td>
        <td className="px-5 py-3.5 text-right tabular-nums text-text-secondary">
          {value > 0 ? `$${Math.round(value).toLocaleString()}` : "\u2014"}
        </td>
        <td className="hidden px-5 py-3.5 text-right tabular-nums text-text-secondary xl:table-cell">
          {herd.current_weight ? `${herd.current_weight.toLocaleString()} kg` : "\u2014"}
        </td>
        <td className="px-3 py-3.5">
          <ChevronRight className="h-4 w-4 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
        </td>
      </tr>
    );
  }

  return (
    <div>
      {/* Toolbar: species pills + search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <span className={`tabular-nums ${isActive ? "text-brand/70" : "text-text-muted/60"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

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

      {sorted.length === 0 ? (
        <div className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-inset ring-white/8">
          <p className="px-5 py-16 text-center text-sm text-text-muted">
            {search ? "No herds match your search." : "No herds found."}
          </p>
        </div>
      ) : hasMultipleGroups ? (
        <div className="flex flex-col gap-5">
          {groupedHerds.map((group) => {
            const groupHead = group.herds.reduce((s, h) => s + (h.head_count ?? 0), 0);
            const groupValue = group.herds.reduce((s, h) => s + (herdValues[h.id] ?? 0), 0);
            return (
              <div key={group.id ?? "_unassigned"} className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-inset ring-white/8">
                {/* Property header */}
                <div className="flex items-center justify-between border-b border-white/6 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10">
                      <Home className="h-3.5 w-3.5 text-brand" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">
                      {group.name}
                    </span>
                    {group.isDefault && (
                      <Badge variant="brand" className="text-[10px] px-1.5 py-0">Primary</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs tabular-nums text-text-muted">
                    <span>{groupHead.toLocaleString()} head</span>
                    {groupValue > 0 && (
                      <span>${Math.round(groupValue).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/6">
                        <TableHeaders />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {group.herds.map((herd) => (
                        <HerdRow key={herd.id} herd={herd} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-white/6 px-5 py-2.5">
                  <p className="text-xs text-text-muted">
                    {group.herds.length} {group.herds.length === 1 ? "herd" : "herds"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-inset ring-white/8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  <TableHeaders />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {sorted.map((herd) => (
                  <HerdRow key={herd.id} herd={herd} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/6 px-5 py-3">
            <p className="text-xs text-text-muted">
              {sorted.length === herds.length
                ? `${herds.length} ${herds.length === 1 ? "herd" : "herds"}`
                : `${sorted.length} of ${herds.length} herds`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
