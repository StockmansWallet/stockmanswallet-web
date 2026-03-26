"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Search, ChevronUp, ChevronRight, MapPinned, Trash2, CheckSquare, Leaf } from "lucide-react";
import { deleteHerds } from "./actions";
import { resolveShortSaleyardName } from "@/lib/data/reference-data";

type HerdWithProperty = {
  id: string;
  name: string;
  species: string;
  breed: string;
  category: string;
  sex: string;
  head_count: number;
  current_weight: number;
  selected_saleyard: string | null;
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


type SortKey = "name" | "breed" | "category" | "selected_saleyard" | "head_count" | "current_weight" | "value" | "price_per_kg" | null;

export function HerdsTable({
  herds,
  herdValues,
  herdSources,
  herdPricePerKg,
  herdBreedingAccrual,
  herdDataDates,
  herdNearestSaleyard,
  herdProjectedWeight,
  propertyGroups,
}: {
  herds: HerdWithProperty[];
  herdValues: Record<string, number>;
  herdSources?: Record<string, string>;
  herdPricePerKg?: Record<string, number>;
  herdBreedingAccrual?: Record<string, number>;
  herdDataDates?: Record<string, string | null>;
  herdNearestSaleyard?: Record<string, string | null>;
  herdProjectedWeight?: Record<string, number>;
  propertyGroups: PropertyGroup[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      } else if (sortKey === "price_per_kg") {
        aVal = herdPricePerKg?.[a.id] ?? 0;
        bVal = herdPricePerKg?.[b.id] ?? 0;
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

  const showPropertyHeaders = propertyGroups.length > 0;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // Selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visibleIds = useMemo(() => sorted.map((h) => h.id), [sorted]);

  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  }

  function exitEditMode() {
    setIsEditing(false);
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    setIsDeleting(true);
    const result = await deleteHerds(Array.from(selectedIds));
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    if (!result?.error) {
      setSelectedIds(new Set());
      setIsEditing(false);
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
        {isEditing && (
          <th className="w-10 px-3 py-3.5">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-brand cursor-pointer"
            />
          </th>
        )}
        <th
          onClick={() => handleSort("head_count")}
          className="cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary"
        >
          Head <SortIcon column="head_count" />
        </th>
        <th
          onClick={() => handleSort("name")}
          className="cursor-pointer select-none px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary"
        >
          Name <SortIcon column="name" />
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
          onClick={() => handleSort("selected_saleyard")}
          className="hidden cursor-pointer select-none px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary xl:table-cell"
        >
          Saleyard <SortIcon column="selected_saleyard" />
        </th>
        <th
          onClick={() => handleSort("price_per_kg")}
          className="hidden cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary lg:table-cell"
        >
          $/kg <SortIcon column="price_per_kg" />
        </th>
        <th
          onClick={() => handleSort("current_weight")}
          className="hidden cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary xl:table-cell"
        >
          Weight <SortIcon column="current_weight" />
        </th>
        <th
          onClick={() => handleSort("value")}
          className="cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary"
        >
          Value <SortIcon column="value" />
        </th>
        {!isEditing && <th className="w-10 px-3 py-3.5" />}
      </>
    );
  }

  function HerdRow({ herd }: { herd: HerdWithProperty }) {
    const value = herdValues[herd.id] ?? 0;
    const source = herdSources?.[herd.id];
    const isFallback = source !== undefined && source !== "saleyard";
    const pricePerKg = herdPricePerKg?.[herd.id] ?? 0;
    const accrual = herdBreedingAccrual?.[herd.id] ?? 0;
    const nearestSaleyard = herdNearestSaleyard?.[herd.id] ?? null;
    const projectedWeight = herdProjectedWeight?.[herd.id];
    // Debug: Stale data amber warning (6-8 weeks old)
    const dataDate = herdDataDates?.[herd.id];
    const dataAgeDays = dataDate ? Math.floor((Date.now() - new Date(dataDate).getTime()) / 86400000) : 0;
    const isStale = dataAgeDays > 42 && !isFallback;
    const isSelected = selectedIds.has(herd.id);

    function handleRowClick() {
      if (isEditing) {
        toggleSelect(herd.id);
      } else {
        router.push(`/dashboard/herds/${herd.id}`);
      }
    }

    return (
      <tr
        onClick={handleRowClick}
        className={`group cursor-pointer transition-colors ${
          isSelected ? "bg-brand/10" : "hover:bg-surface-hover"
        }`}
      >
        {isEditing && (
          <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(herd.id)}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-brand cursor-pointer"
            />
          </td>
        )}
        <td className="px-5 py-3.5 text-right tabular-nums font-medium text-text-primary">
          {herd.head_count?.toLocaleString() ?? "\u2014"}
        </td>
        <td className="px-5 py-3.5">
          <span className="font-medium text-text-primary">{herd.name}</span>
        </td>
        <td className="hidden px-5 py-3.5 text-text-secondary md:table-cell">{herd.breed}</td>
        <td className="hidden px-5 py-3.5 text-text-secondary lg:table-cell">{herd.sub_category && herd.sub_category !== herd.category ? `${herd.category} (${herd.sub_category})` : herd.category}</td>
        <td className={`hidden px-5 py-3.5 xl:table-cell ${!herd.selected_saleyard ? "text-red-400/70 italic" : nearestSaleyard || isFallback ? "text-text-muted/50 line-through" : "text-text-muted"}`}>
          {herd.selected_saleyard ? resolveShortSaleyardName(herd.selected_saleyard) ?? herd.selected_saleyard : "No Saleyard"}
        </td>
        <td className={`hidden px-5 py-3.5 text-right tabular-nums lg:table-cell ${isFallback ? "text-red-400" : (isStale || nearestSaleyard) ? "text-amber-400" : "text-text-secondary"}`}>
          <div className="flex items-center justify-end gap-1.5">
            {isStale && !nearestSaleyard && (
              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                Stale - {Math.floor(dataAgeDays / 7)}w
              </span>
            )}
            {nearestSaleyard && !isFallback && (
              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                Via {resolveShortSaleyardName(nearestSaleyard) ?? nearestSaleyard}
              </span>
            )}
            {isFallback && (
              <span className="inline-flex items-center rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-medium text-red-400">
                {source === "national" ? "National Avg" : "Est. Fallback"}
              </span>
            )}
            {pricePerKg > 0 ? `$${pricePerKg.toFixed(2)}` : "\u2014"}
          </div>
        </td>
        <td className="hidden px-5 py-3.5 text-right tabular-nums text-text-secondary xl:table-cell">
          {projectedWeight ? `${Math.round(projectedWeight).toLocaleString()} kg` : herd.current_weight ? `${herd.current_weight.toLocaleString()} kg` : "\u2014"}
        </td>
        <td className={`px-5 py-3.5 text-right tabular-nums ${isFallback ? "text-red-400" : "text-text-secondary"}`}>
          <div className="flex flex-col items-end">
            <span>{value > 0 ? `$${Math.round(value).toLocaleString()}` : "\u2014"}</span>
            {accrual > 0 && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Leaf className="h-3 w-3" />
                +${Math.round(accrual).toLocaleString()}
              </span>
            )}
          </div>
        </td>
        {!isEditing && (
          <td className="px-3 py-3.5">
            <ChevronRight className="h-4 w-4 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
          </td>
        )}
      </tr>
    );
  }

  return (
    <div>
      {/* Toolbar: species pills + manage + search */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-surface-lowest px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto">
          {SPECIES_TABS.map((tab) => {
            const count = tab === "All" ? herds.length : speciesCounts[tab] || 0;
            if (tab !== "All" && count === 0) return null;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-brand/15 text-brand"
                    : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text-secondary"
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

        <div className="flex items-center gap-2">
          {herds.length > 0 && (
            <button
              onClick={isEditing ? exitEditMode : () => setIsEditing(true)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                isEditing
                  ? "bg-brand/15 text-brand"
                  : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text-secondary"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {isEditing ? "Done" : "Select"}
            </button>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search herds..."
              className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-brand/50 focus:ring-2 focus:ring-brand/20 sm:w-64"
            />
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="overflow-hidden rounded-2xl bg-surface-lowest">
          <p className="px-5 py-16 text-center text-sm text-text-muted">
            {search ? "No herds match your search." : "No herds found."}
          </p>
        </div>
      ) : showPropertyHeaders ? (
        <div className="flex flex-col gap-5">
          {groupedHerds.map((group) => {
            const groupHead = group.herds.reduce((s, h) => s + (h.head_count ?? 0), 0);
            const groupValue = group.herds.reduce((s, h) => s + (herdValues[h.id] ?? 0), 0);
            return (
              <div key={group.id ?? "_unassigned"} className="overflow-hidden rounded-2xl bg-surface-lowest">
                {/* Property header */}
                <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10">
                      <MapPinned className="h-3.5 w-3.5 text-brand" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">
                      {group.name}
                    </span>
                    {group.isDefault && (
                      <Badge variant="brand" className="text-[10px] px-1.5 py-0">Primary</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm font-semibold tabular-nums text-brand">
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
                      <tr className="border-b border-border-subtle">
                        <TableHeaders />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                      {group.herds.map((herd) => (
                        <HerdRow key={herd.id} herd={herd} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-border-subtle px-5 py-2.5">
                  <p className="text-xs text-text-muted">
                    {group.herds.length} {group.herds.length === 1 ? "herd" : "herds"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface-lowest">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <TableHeaders />
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {sorted.map((herd) => (
                  <HerdRow key={herd.id} herd={herd} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border-subtle px-5 py-3">
            <p className="text-xs text-text-muted">
              {sorted.length === herds.length
                ? `${herds.length} ${herds.length === 1 ? "herd" : "herds"}`
                : `${sorted.length} of ${herds.length} herds`}
            </p>
          </div>
        </div>
      )}

      {/* Floating action bar when items selected */}
      {isEditing && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-bg-alt px-5 py-3 shadow-2xl">
            <span className="text-sm font-medium text-text-primary tabular-nums">
              {selectedIds.size} selected
            </span>
            <div className="h-4 w-px bg-white/10" />
            <button
              onClick={toggleSelectAll}
              className="text-sm font-medium text-brand hover:text-brand/80 transition-colors"
            >
              {allVisibleSelected ? "Deselect All" : "Select All"}
            </button>
            <div className="h-4 w-px bg-white/10" />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Herds"
        size="sm"
      >
        <p className="mb-6 text-sm text-text-secondary">
          Are you sure you want to delete <strong>{selectedIds.size}</strong>{" "}
          {selectedIds.size === 1 ? "herd" : "herds"}? This will also remove
          all associated muster, health, and sales records.
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : `Delete ${selectedIds.size} ${selectedIds.size === 1 ? "Herd" : "Herds"}`}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
