"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronUp, ChevronRight, Leaf } from "lucide-react";
import { resolveShortSaleyardName } from "@/lib/data/reference-data";

type ClientHerd = {
  id: string;
  name: string;
  species: string;
  breed: string;
  category: string;
  sub_category: string | null;
  sex: string;
  head_count: number;
  current_weight: number;
  selected_saleyard: string | null;
  [key: string]: unknown;
};

type SortKey = "name" | "breed" | "category" | "selected_saleyard" | "head_count" | "current_weight" | "value" | "price_per_kg" | null;

interface ClientHerdsTableProps {
  herds: ClientHerd[];
  herdValues: Record<string, number>;
  herdPricePerKg?: Record<string, number>;
  herdSources?: Record<string, string>;
  herdNearestSaleyard?: Record<string, string | null>;
  herdProjectedWeight?: Record<string, number>;
  herdBreedPremium?: Record<string, number>;
  herdBreedingAccrual?: Record<string, number>;
  connectionId: string;
}

export function ClientHerdsTable({
  herds,
  herdValues,
  herdPricePerKg,
  herdSources,
  herdNearestSaleyard,
  herdProjectedWeight,
  herdBreedPremium,
  herdBreedingAccrual,
  connectionId,
}: ClientHerdsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const searched = useMemo(() => {
    if (!search.trim()) return herds;
    const q = search.toLowerCase();
    return herds.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.breed.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q)
    );
  }, [herds, search]);

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

  if (herds.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-lowest py-12 text-center">
        <p className="text-sm text-text-muted">No herds shared by this client.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface-lowest px-4 py-3">
        <p className="text-xs text-text-muted">
          {sorted.length} herd{sorted.length !== 1 ? "s" : ""}
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search herds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-48 rounded-lg border border-border bg-surface pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-white/10 sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl bg-surface-lowest">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th onClick={() => handleSort("head_count")} className="cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary">
                Head <SortIcon column="head_count" />
              </th>
              <th onClick={() => handleSort("name")} className="cursor-pointer select-none px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary">
                Name <SortIcon column="name" />
              </th>
              <th onClick={() => handleSort("breed")} className="hidden cursor-pointer select-none px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary md:table-cell">
                Breed <SortIcon column="breed" />
              </th>
              <th onClick={() => handleSort("category")} className="hidden cursor-pointer select-none px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary lg:table-cell">
                Category <SortIcon column="category" />
              </th>
              <th onClick={() => handleSort("selected_saleyard")} className="hidden cursor-pointer select-none px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary xl:table-cell">
                Saleyard <SortIcon column="selected_saleyard" />
              </th>
              <th onClick={() => handleSort("price_per_kg")} className="hidden cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary lg:table-cell">
                $/kg <SortIcon column="price_per_kg" />
              </th>
              <th className="hidden px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted lg:table-cell">
                Premium
              </th>
              <th onClick={() => handleSort("current_weight")} className="hidden cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary xl:table-cell">
                Weight <SortIcon column="current_weight" />
              </th>
              <th onClick={() => handleSort("value")} className="cursor-pointer select-none px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary">
                Value <SortIcon column="value" />
              </th>
              <th className="w-10 px-3 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((herd) => {
              const value = herdValues[herd.id] ?? 0;
              const source = herdSources?.[herd.id];
              const isFallback = source !== undefined && source !== "saleyard";
              const pricePerKg = herdPricePerKg?.[herd.id] ?? 0;
              const accrual = herdBreedingAccrual?.[herd.id] ?? 0;
              const nearestSaleyard = herdNearestSaleyard?.[herd.id] ?? null;
              const projectedWeight = herdProjectedWeight?.[herd.id];
              const breedPremium = herdBreedPremium?.[herd.id] ?? 0;

              return (
                <tr
                  key={herd.id}
                  onClick={() => router.push(`/dashboard/advisor/clients/${connectionId}/herds/${herd.id}`)}
                  className="group cursor-pointer transition-colors hover:bg-surface-hover"
                >
                  <td className="px-5 py-3.5 text-right tabular-nums font-medium text-text-primary">
                    {herd.head_count?.toLocaleString() ?? "\u2014"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-text-primary">{herd.name}</span>
                  </td>
                  <td className="hidden px-5 py-3.5 text-text-secondary md:table-cell">{herd.breed}</td>
                  <td className="hidden px-5 py-3.5 text-text-secondary lg:table-cell">
                    {herd.sub_category && herd.sub_category !== herd.category ? `${herd.category} (${herd.sub_category})` : herd.category}
                  </td>
                  <td className={`hidden px-5 py-3.5 xl:table-cell ${!herd.selected_saleyard ? "text-error/70 italic" : nearestSaleyard || isFallback ? "text-text-muted/50 line-through" : "text-text-muted"}`}>
                    {herd.selected_saleyard ? resolveShortSaleyardName(herd.selected_saleyard) ?? herd.selected_saleyard : "No Saleyard"}
                  </td>
                  <td className={`hidden px-5 py-3.5 text-right tabular-nums lg:table-cell ${isFallback ? "text-error" : nearestSaleyard ? "text-amber-400" : "text-text-secondary"}`}>
                    <div className="flex items-center justify-end gap-1.5">
                      {nearestSaleyard && !isFallback && (
                        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                          Via {resolveShortSaleyardName(nearestSaleyard) ?? nearestSaleyard}
                        </span>
                      )}
                      {isFallback && (
                        <span className="inline-flex items-center rounded-full bg-error/15 px-1.5 py-0.5 text-[9px] font-medium text-error">
                          {source === "national" ? "National Avg" : "Est. Fallback"}
                        </span>
                      )}
                      {pricePerKg > 0 ? `$${pricePerKg.toFixed(2)}` : "\u2014"}
                    </div>
                  </td>
                  <td className={`hidden px-5 py-3.5 text-right tabular-nums text-xs lg:table-cell ${breedPremium > 0 ? "text-success" : breedPremium < 0 ? "text-error" : "text-text-muted"}`}>
                    {breedPremium !== 0 ? `${breedPremium > 0 ? "+" : ""}${breedPremium}%` : "\u2014"}
                  </td>
                  <td className="hidden px-5 py-3.5 text-right tabular-nums text-text-secondary xl:table-cell">
                    {projectedWeight ? `${Math.round(projectedWeight).toLocaleString()} kg` : herd.current_weight ? `${herd.current_weight.toLocaleString()} kg` : "\u2014"}
                  </td>
                  <td className={`px-5 py-3.5 text-right tabular-nums ${isFallback ? "text-error" : "text-text-secondary"}`}>
                    <div className="flex flex-col items-end">
                      <span>{value > 0 ? `$${Math.round(value).toLocaleString()}` : "\u2014"}</span>
                      {accrual > 0 && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <Leaf className="h-3 w-3" />
                          +${Math.round(accrual).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <ChevronRight className="h-4 w-4 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && search && (
          <div className="py-8 text-center text-sm text-text-muted">
            No herds matching &quot;{search}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
