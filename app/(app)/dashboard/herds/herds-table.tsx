"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Search, ChevronUp, ChevronRight, MapPinned, Trash2, ArrowUpRight, Leaf, TrendingUp, Receipt } from "lucide-react";
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
  herdDefaultBreedPremium,
  herdCustomBreedPremium,
  propertyGroups,
  headerActions,
}: {
  herds: HerdWithProperty[];
  herdValues: Record<string, number>;
  herdSources?: Record<string, string>;
  herdPricePerKg?: Record<string, number>;
  herdBreedingAccrual?: Record<string, number>;
  herdDataDates?: Record<string, string | null>;
  herdNearestSaleyard?: Record<string, string | null>;
  herdProjectedWeight?: Record<string, number>;
  herdDefaultBreedPremium?: Record<string, number>;
  herdCustomBreedPremium?: Record<string, number>;
  propertyGroups: PropertyGroup[];
  headerActions?: ReactNode;
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

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "head_count", label: "Head" },
    { key: "value", label: "Value" },
    { key: "breed", label: "Breed" },
    { key: "current_weight", label: "Weight" },
  ];

  function SortBar() {
    return (
      <div className="flex items-center gap-1 border-b border-white/[0.04] px-5 py-2">
        <span className="mr-1.5 text-[10px] font-medium text-text-muted">Sort by</span>
        <div className="flex items-center gap-0.5 rounded-full bg-white/[0.03] p-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleSort(opt.key)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                sortKey === opt.key
                  ? "bg-brand/15 text-brand"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {opt.label}
              <SortIcon column={opt.key} />
            </button>
          ))}
        </div>
      </div>
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
    const defaultPremium = herdDefaultBreedPremium?.[herd.id] ?? 0;
    const customDelta = herdCustomBreedPremium?.[herd.id] ?? null;
    const dataDate = herdDataDates?.[herd.id];
    const dataAgeDays = dataDate ? Math.floor((Date.now() - new Date(dataDate).getTime()) / 86400000) : 0;
    const isStale = dataAgeDays > 42 && !isFallback;
    const isSelected = selectedIds.has(herd.id);

    const categoryLabel = herd.sub_category && herd.sub_category !== herd.category
      ? `${herd.category} (${herd.sub_category})`
      : herd.category;

    const weightDisplay = projectedWeight
      ? `${Math.round(projectedWeight).toLocaleString()} kg`
      : herd.current_weight
        ? `${herd.current_weight.toLocaleString()} kg`
        : null;

    function handleRowClick() {
      if (isEditing) {
        toggleSelect(herd.id);
      } else {
        router.push(`/dashboard/herds/${herd.id}`);
      }
    }

    return (
      <div
        onClick={handleRowClick}
        className={`group flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors ${
          isSelected ? "bg-brand/10" : "hover:bg-white/[0.03]"
        }`}
      >
        {isEditing && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(herd.id)}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-brand cursor-pointer"
            />
          </div>
        )}

        {/* Head count pill */}
        <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-sm font-semibold tabular-nums text-text-primary">
          {herd.head_count?.toLocaleString() ?? "\u2014"}
        </span>

        {/* Name + details + pills */}
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2 truncate">
            <span className="text-sm font-medium text-text-primary">{herd.name}</span>
            <span className="truncate text-xs text-text-muted">
              {herd.breed} | {categoryLabel}
              {weightDisplay && <> | {weightDisplay}</>}
              {pricePerKg > 0 && <> | ${pricePerKg.toFixed(2)}/kg</>}
            </span>
          </p>
          {(defaultPremium !== 0 || customDelta !== null || accrual > 0 || herd.selected_saleyard || isFallback) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {defaultPremium !== 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium text-text-muted">
                  <TrendingUp className="h-2.5 w-2.5" />
                  Breed Premium {defaultPremium > 0 ? "+" : ""}{defaultPremium}%
                </span>
              )}
              {customDelta !== null && (
                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${customDelta > 0 ? "bg-emerald-500/15 text-emerald-400" : customDelta < 0 ? "bg-red-500/15 text-red-400" : "bg-white/[0.06] text-text-muted"}`}>
                  <TrendingUp className="h-2.5 w-2.5" />
                  Custom Premium {customDelta > 0 ? "+" : ""}{customDelta}%
                </span>
              )}
              {accrual > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-lime-500/15 px-1.5 py-0.5 text-[9px] font-medium text-lime-400">
                  <Leaf className="h-2.5 w-2.5" />
                  Breeding Value +${Math.round(accrual).toLocaleString()}
                </span>
              )}
              {herd.selected_saleyard && (
                <span className={`inline-flex items-center gap-0.5 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium ${nearestSaleyard && !isFallback ? "line-through text-text-muted/50" : isStale ? "text-amber-400" : "text-text-muted"}`}>
                  <Receipt className="h-2.5 w-2.5 shrink-0 no-underline" style={{ textDecoration: "none" }} />
                  {resolveShortSaleyardName(herd.selected_saleyard) ?? herd.selected_saleyard}
                </span>
              )}
              {nearestSaleyard && !isFallback && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                  <ArrowUpRight className="h-2.5 w-2.5" />
                  Via {resolveShortSaleyardName(nearestSaleyard) ?? nearestSaleyard}
                </span>
              )}
              {isStale && !nearestSaleyard && (
                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                  Stale Data
                </span>
              )}
              {isFallback && (
                <span className="inline-flex items-center rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-medium text-red-400">
                  {source === "national" ? "National Avg" : "Est. Fallback"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Value */}
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${isFallback ? "text-red-400" : "text-text-primary"}`}>
          {value > 0 ? `$${Math.round(value).toLocaleString()}` : "\u2014"}
        </span>

        {!isEditing && (
          <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar: species pills + manage + search */}
      <div className="mb-4 flex flex-col gap-3 rounded-full bg-surface-lowest px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: species filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {SPECIES_TABS.map((tab) => {
            const count = tab === "All" ? herds.length : speciesCounts[tab] || 0;
            if (tab !== "All" && count === 0) return null;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-brand/15 text-brand"
                    : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text-secondary"
                }`}
              >
                {tab}
                <span className={`tabular-nums ${isActive ? "text-brand/70" : "text-text-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: search + select + actions */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search herds..."
              aria-label="Search herds"
              className="h-8 w-full rounded-full bg-surface pl-9 pr-4 text-xs text-text-primary placeholder:text-text-muted outline-none transition-all focus:ring-2 focus:ring-brand/20 sm:w-48"
            />
          </div>
          {herds.length > 0 && (
            <button
              onClick={isEditing ? exitEditMode : () => setIsEditing(true)}
              className={`inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-xs font-medium transition-all ${
                isEditing
                  ? "bg-brand/15 text-brand"
                  : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text-secondary"
              }`}
            >
              {isEditing ? "Done" : "Select"}
            </button>
          )}
          {headerActions}
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
                  {groupValue > 0 && (
                    <span className="text-sm font-semibold tabular-nums text-brand">
                      ${Math.round(groupValue).toLocaleString()}
                    </span>
                  )}
                </div>
                <SortBar />
                <div className="divide-y divide-white/[0.06]">
                  {group.herds.map((herd) => (
                    <HerdRow key={herd.id} herd={herd} />
                  ))}
                </div>
                <div className="border-t border-border-subtle px-5 py-2.5">
                  <p className="text-right text-xs text-text-muted">
                    {group.herds.length} {group.herds.length === 1 ? "herd" : "herds"} | {groupHead.toLocaleString()} head
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface-lowest">
          <SortBar />
          <div className="divide-y divide-white/[0.06]">
            {sorted.map((herd) => (
              <HerdRow key={herd.id} herd={herd} />
            ))}
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
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-bg-alt px-5 py-3 shadow-2xl">
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
