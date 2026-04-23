"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Search, ChevronUp, MapPinned, Trash2 } from "lucide-react";
import { deleteHerds } from "./actions";
import { resolveShortSaleyardName } from "@/lib/data/reference-data";
import { isLocalHerdId, removeLocalHerd } from "@/lib/demo-overlay";

type HerdWithProperty = {
  id: string;
  name: string;
  species: string;
  breed: string;
  category: string;
  sub_category?: string | null;
  sex: string;
  head_count: number;
  current_weight: number;
  age_months?: number | null;
  livestock_owner?: string | null;
  daily_weight_gain?: number | null;
  mortality_rate?: number | null;
  calving_rate?: number | null;
  is_breeder?: boolean | null;
  breed_premium_override?: number | null;
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

type SortKey =
  | "name"
  | "breed"
  | "category"
  | "selected_saleyard"
  | "head_count"
  | "current_weight"
  | "value"
  | "price_per_kg"
  | null;

type StatAccent = "none" | "brand" | "warning" | "error" | "success";

// Snapshot time once per module load - 42-day staleness threshold doesn't need sub-minute precision
const NOW_MS = Date.now();

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "head_count", label: "Head" },
  { key: "value", label: "Value" },
  { key: "breed", label: "Breed" },
  { key: "current_weight", label: "Weight" },
];

function SortIcon({ active, sortDir }: { active: boolean; sortDir: "asc" | "desc" }) {
  if (!active) return null;
  return (
    <ChevronUp
      className={`ml-0.5 inline h-3 w-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`}
    />
  );
}

function Stat({
  label,
  value,
  accent = "none",
}: {
  label: string;
  value: string;
  accent?: StatAccent;
}) {
  const colour =
    accent === "brand"
      ? "text-brand"
      : accent === "warning"
        ? "text-warning"
        : accent === "error"
          ? "text-error"
          : accent === "success"
            ? "text-success"
            : "text-text-primary";
  return (
    <div className="min-w-0">
      <p className="text-text-muted truncate text-[10px] font-medium tracking-wider uppercase">
        {label}
      </p>
      <p className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${colour}`}>{value}</p>
    </div>
  );
}

interface HerdCardProps {
  herd: HerdWithProperty;
  value: number;
  source: string | undefined;
  pricePerKg: number;
  accrual: number;
  nearestSaleyard: string | null;
  projectedWeight: number | undefined;
  defaultPremium: number;
  customDelta: number | null;
  dataDate: string | null | undefined;
  isEditing: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onNavigate: (id: string) => void;
}

function HerdCard({
  herd,
  value,
  source,
  pricePerKg,
  accrual,
  nearestSaleyard,
  projectedWeight,
  defaultPremium,
  customDelta,
  dataDate,
  isEditing,
  isSelected,
  onToggleSelect,
  onNavigate,
}: HerdCardProps) {
  const isFallback = source !== undefined && source !== "saleyard";
  const dataAgeDays = dataDate ? Math.floor((NOW_MS - new Date(dataDate).getTime()) / 86400000) : 0;
  const isStale = dataAgeDays > 42 && !isFallback;

  const categoryLabel =
    herd.sub_category && herd.sub_category !== herd.category
      ? `${herd.category} (${herd.sub_category})`
      : herd.category;

  const weightNumber = projectedWeight ?? herd.current_weight ?? 0;
  const calvingPct =
    (herd.calving_rate ?? 0) > 1 ? (herd.calving_rate ?? 0) : (herd.calving_rate ?? 0) * 100;
  const mortalityPct =
    (herd.mortality_rate ?? 0) > 1 ? (herd.mortality_rate ?? 0) : (herd.mortality_rate ?? 0) * 100;
  const dwg = herd.daily_weight_gain ?? 0;
  const headCount = herd.head_count ?? 0;
  const avgPerHead = headCount > 0 ? value / headCount : 0;

  let saleyardLabel: string | null = null;
  let saleyardAccent: StatAccent = "none";
  if (isFallback) {
    saleyardLabel = source === "national" ? "National Avg" : "Est. Fallback";
    saleyardAccent = "error";
  } else if (nearestSaleyard) {
    saleyardLabel = `Via ${resolveShortSaleyardName(nearestSaleyard) ?? nearestSaleyard}`;
    saleyardAccent = "warning";
  } else if (herd.selected_saleyard) {
    saleyardLabel = resolveShortSaleyardName(herd.selected_saleyard) ?? herd.selected_saleyard;
    saleyardAccent = isStale ? "warning" : "none";
  }

  const extras: { label: string; value: string; accent?: StatAccent }[] = [];
  if (saleyardLabel) {
    extras.push({
      label:
        isStale && saleyardAccent === "warning" && !nearestSaleyard
          ? "Saleyard (stale)"
          : "Saleyard",
      value: saleyardLabel,
      accent: saleyardAccent,
    });
  }
  if (headCount > 0 && value > 0) {
    extras.push({ label: "Avg per Head", value: `$${Math.round(avgPerHead).toLocaleString()}` });
  }
  if (dwg > 0) {
    extras.push({ label: "DWG", value: `${dwg.toFixed(2)} kg/day` });
  }
  if (herd.is_breeder && calvingPct > 0) {
    extras.push({ label: "Calving", value: `${calvingPct.toFixed(0)}%` });
  }
  if (accrual > 0) {
    extras.push({
      label: "Calf Accrual",
      value: `$${Math.round(accrual).toLocaleString()}`,
      accent: "success",
    });
  }
  if (mortalityPct > 0) {
    extras.push({ label: "Mortality", value: `${mortalityPct.toFixed(1)}% p.a.` });
  }
  if (defaultPremium !== 0) {
    extras.push({
      label: "Breed Premium",
      value: `${defaultPremium > 0 ? "+" : ""}${defaultPremium}%`,
    });
  }
  if (customDelta !== null) {
    extras.push({
      label: "Custom Premium",
      value: `${customDelta > 0 ? "+" : ""}${customDelta}%`,
      accent: customDelta > 0 ? "success" : customDelta < 0 ? "error" : "none",
    });
  }

  const extraRows: (typeof extras)[] = [];
  for (let i = 0; i < extras.length; i += 4) extraRows.push(extras.slice(i, i + 4));

  function handleCardClick() {
    if (isEditing) onToggleSelect(herd.id);
    else onNavigate(herd.id);
  }

  return (
    <Card
      onClick={handleCardClick}
      className={`cursor-pointer overflow-hidden transition-colors ${isSelected ? "ring-brand/60 ring-1" : "hover:bg-white/[0.03]"}`}
    >
      {/* Header: tinted row with head-count pill, name, category, value */}
      <div className="flex items-center gap-3 bg-white/[0.04] px-4 py-2.5">
        {isEditing && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(herd.id)}
              aria-label={`Select ${herd.name}`}
              className="accent-brand h-4 w-4 cursor-pointer rounded border-white/20 bg-transparent"
            />
          </div>
        )}
        <span className="text-text-primary flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sm font-semibold tabular-nums">
          {headCount.toLocaleString()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h5 className="text-text-primary truncate text-sm font-semibold">{herd.name}</h5>
            <p className="text-text-muted shrink-0 text-xs">
              {herd.breed} | {categoryLabel}
            </p>
          </div>
          {herd.livestock_owner && (
            <p className="text-text-muted mt-0.5 text-[11px]">
              <span className="text-text-muted/70">Livestock Owner:</span>{" "}
              <span className="text-text-secondary">{herd.livestock_owner}</span>
            </p>
          )}
        </div>
        <p
          className={`ml-3 shrink-0 text-base font-bold tabular-nums ${isFallback ? "text-error" : "text-text-primary"}`}
        >
          {value > 0 ? `$${Math.round(value).toLocaleString()}` : "\u2014"}
        </p>
      </div>

      {/* Core 4-col grid */}
      <CardContent className="px-4 py-2">
        <div className="grid grid-cols-4 gap-x-3">
          <Stat label="Head" value={headCount.toLocaleString()} />
          <Stat label="Age" value={herd.age_months ? `${herd.age_months} months` : "\u2014"} />
          <Stat
            label="Weight"
            value={weightNumber > 0 ? `${Math.round(weightNumber).toLocaleString()} kg` : "\u2014"}
          />
          <Stat label="Price" value={pricePerKg > 0 ? `$${pricePerKg.toFixed(2)}/kg` : "\u2014"} />
        </div>

        {extraRows.map((row, ri) => (
          <div
            key={ri}
            className="mt-1.5 grid grid-cols-4 gap-x-3 border-t border-white/[0.04] pt-1.5"
          >
            {row.map((e) => (
              <Stat key={e.label} label={e.label} value={e.value} accent={e.accent} />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

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
  const navigateToHerd = useCallback(
    (id: string) => {
      router.push(`/dashboard/herds/${id}`);
    },
    [router]
  );
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
  }, [searched, sortKey, sortDir, herdValues, herdPricePerKg]);

  // Group herds by property, preserving the property order from server
  const groupedHerds = useMemo(() => {
    const byProperty = new Map<string | null, HerdWithProperty[]>();
    for (const h of sorted) {
      const pid = h.property_id ?? null;
      const arr = byProperty.get(pid) ?? [];
      arr.push(h);
      byProperty.set(pid, arr);
    }

    const groups: {
      id: string | null;
      name: string;
      isDefault: boolean;
      herds: HerdWithProperty[];
    }[] = [];

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
    const ids = Array.from(selectedIds);
    // Split demo-overlay herds (local-*) from real Supabase rows. Local herds
    // are removed from localStorage; the rest go through the server action.
    const localIds = ids.filter((id) => isLocalHerdId(id));
    const remoteIds = ids.filter((id) => !isLocalHerdId(id));
    for (const id of localIds) removeLocalHerd(id);
    const result = remoteIds.length > 0 ? await deleteHerds(remoteIds) : undefined;
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    if (!result?.error) {
      setSelectedIds(new Set());
      setIsEditing(false);
    }
  }

  return (
    <div>
      {/* Toolbar: species pills + manage + search */}
      <div className="bg-surface-lowest mb-4 flex flex-col gap-3 rounded-full px-2 py-2 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
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
            <Search className="text-text-muted pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search herds..."
              aria-label="Search herds"
              className="bg-surface text-text-primary placeholder:text-text-muted focus:ring-brand/20 h-8 w-full rounded-full pr-4 pl-9 text-xs transition-all outline-none focus:ring-2 sm:w-48"
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
        <div className="bg-surface-lowest overflow-hidden rounded-2xl">
          <p className="text-text-muted px-5 py-16 text-center text-sm">
            {search ? "No herds match your search." : "No herds found."}
          </p>
        </div>
      ) : (
        <>
          {/* Single sort bar above all groups */}
          <div className="bg-surface-lowest mb-3 rounded-full px-2 py-1.5 backdrop-blur-md">
            <div className="flex items-center gap-1 px-2 py-0.5">
              <span className="text-text-muted mr-1.5 text-[10px] font-medium">Sort by</span>
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
                    <SortIcon active={sortKey === opt.key} sortDir={sortDir} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {showPropertyHeaders ? (
            <div className="flex flex-col gap-5">
              {groupedHerds.map((group) => {
                const groupHead = group.herds.reduce((s, h) => s + (h.head_count ?? 0), 0);
                const groupValue = group.herds.reduce((s, h) => s + (herdValues[h.id] ?? 0), 0);
                return (
                  <div key={group.id ?? "_unassigned"}>
                    {/* Property header pill */}
                    <div className="mb-2 flex items-center justify-between rounded-full bg-white/[0.06] px-4 py-2.5 backdrop-blur-md">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-brand/10 flex h-7 w-7 items-center justify-center rounded-lg">
                          <MapPinned className="text-brand h-3.5 w-3.5" />
                        </div>
                        <span className="text-text-primary text-sm font-semibold">
                          {group.name}
                        </span>
                        {group.isDefault && (
                          <Badge variant="brand" className="px-1.5 py-0 text-[10px]">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <span className="text-text-muted text-xs tabular-nums">
                        {groupHead.toLocaleString()} head
                        {groupValue > 0 && (
                          <>
                            {" "}
                            &middot;{" "}
                            <span className="text-brand font-semibold">
                              ${Math.round(groupValue).toLocaleString()}
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Herd cards */}
                    <div className="flex flex-col gap-2">
                      {group.herds.map((herd) => (
                        <HerdCard
                          key={herd.id}
                          herd={herd}
                          value={herdValues[herd.id] ?? 0}
                          source={herdSources?.[herd.id]}
                          pricePerKg={herdPricePerKg?.[herd.id] ?? 0}
                          accrual={herdBreedingAccrual?.[herd.id] ?? 0}
                          nearestSaleyard={herdNearestSaleyard?.[herd.id] ?? null}
                          projectedWeight={herdProjectedWeight?.[herd.id]}
                          defaultPremium={herdDefaultBreedPremium?.[herd.id] ?? 0}
                          customDelta={herdCustomBreedPremium?.[herd.id] ?? null}
                          dataDate={herdDataDates?.[herd.id]}
                          isEditing={isEditing}
                          isSelected={selectedIds.has(herd.id)}
                          onToggleSelect={toggleSelect}
                          onNavigate={navigateToHerd}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sorted.map((herd) => (
                <HerdCard
                  key={herd.id}
                  herd={herd}
                  value={herdValues[herd.id] ?? 0}
                  source={herdSources?.[herd.id]}
                  pricePerKg={herdPricePerKg?.[herd.id] ?? 0}
                  accrual={herdBreedingAccrual?.[herd.id] ?? 0}
                  nearestSaleyard={herdNearestSaleyard?.[herd.id] ?? null}
                  projectedWeight={herdProjectedWeight?.[herd.id]}
                  defaultPremium={herdDefaultBreedPremium?.[herd.id] ?? 0}
                  customDelta={herdCustomBreedPremium?.[herd.id] ?? null}
                  dataDate={herdDataDates?.[herd.id]}
                  isEditing={isEditing}
                  isSelected={selectedIds.has(herd.id)}
                  onToggleSelect={toggleSelect}
                  onNavigate={navigateToHerd}
                />
              ))}
              <p className="text-text-muted mt-2 text-xs">
                {sorted.length === herds.length
                  ? `${herds.length} ${herds.length === 1 ? "herd" : "herds"}`
                  : `${sorted.length} of ${herds.length} herds`}
              </p>
            </div>
          )}
        </>
      )}

      {/* Floating action bar when items selected */}
      {isEditing && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="bg-bg-alt flex items-center gap-3 rounded-full border border-white/10 px-5 py-3 shadow-2xl">
            <span className="text-text-primary text-sm font-medium tabular-nums">
              {selectedIds.size} selected
            </span>
            <div className="h-4 w-px bg-white/10" />
            <button
              onClick={toggleSelectAll}
              className="text-brand hover:text-brand/80 text-sm font-medium transition-colors"
            >
              {allVisibleSelected ? "Deselect All" : "Select All"}
            </button>
            <div className="h-4 w-px bg-white/10" />
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
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
        <p className="text-text-secondary mb-6 text-sm">
          Are you sure you want to delete <strong>{selectedIds.size}</strong>{" "}
          {selectedIds.size === 1 ? "herd" : "herds"}? This will also remove all associated muster,
          health, and sales records.
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
            {isDeleting
              ? "Deleting..."
              : `Delete ${selectedIds.size} ${selectedIds.size === 1 ? "Herd" : "Herds"}`}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
