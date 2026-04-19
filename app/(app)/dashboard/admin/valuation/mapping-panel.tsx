"use client";

import { useMemo, useState } from "react";
import {
  cattleBreedPremiums,
  mlaSaleyardNameMapping,
  saleyardToState,
} from "@/lib/data/reference-data";
import { cattleMasterCategories, mlaCsvCategoryMapping } from "@/lib/data/weight-mapping";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { categoryFallback, defaultFallbackPrice } from "@/lib/engines/valuation-engine";

// Build reverse CSV mapping: stored category -> CSV source entries
function buildCsvSourceMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [key, stored] of Object.entries(mlaCsvCategoryMapping)) {
    const [csvCat, prefix] = key.split("|");
    const label = prefix === "*" ? csvCat : `${csvCat} (${prefix})`;
    const entries = map.get(stored) ?? [];
    entries.push(label);
    map.set(stored, entries);
  }
  return map;
}

type SpeciesKey = "Cattle" | "Sheep" | "Pig" | "Goat";

const speciesTabs: { key: SpeciesKey; label: string }[] = [
  { key: "Cattle", label: "Cattle" },
  { key: "Sheep", label: "Sheep" },
  { key: "Pig", label: "Pig" },
  { key: "Goat", label: "Goat" },
];

function categoriesFor(species: SpeciesKey): string[] {
  switch (species) {
    case "Cattle": return [...cattleMasterCategories];
    case "Sheep": return [];
    case "Pig": return [];
    case "Goat": return [];
  }
}

export function MappingPanel() {
  const [species, setSpecies] = useState<SpeciesKey>("Cattle");
  const csvSourceMap = useMemo(() => buildCsvSourceMap(), []);

  const categories = categoriesFor(species);

  const rows = useMemo(() => {
    return categories.map((cat) => {
      const mla = resolveMLACategory(cat, 0).primaryMLACategory;
      const fallback = categoryFallback(mla);
      const csvSources = csvSourceMap.get(mla) ?? [];
      const defPrice = defaultFallbackPrice(cat);
      const isMapped = mla !== cat;
      return { appCategory: cat, mlaCategory: mla, fallback, csvSources, defPrice, isMapped };
    });
  }, [categories, csvSourceMap]);

  // CSV inbound mapping entries
  const csvEntries = useMemo(() => {
    return Object.entries(mlaCsvCategoryMapping).map(([key, stored]) => {
      const [csvCat, prefix] = key.split("|");
      return { csvCategory: csvCat, salePrefix: prefix === "*" ? "Any" : prefix, storedAs: stored };
    });
  }, []);

  // Breed premiums sorted by premium desc
  const breedRows = useMemo(() => {
    return Object.entries(cattleBreedPremiums)
      .sort((a, b) => b[1] - a[1])
      .map(([breed, pct]) => ({ breed, pct }));
  }, []);

  // Saleyard mappings sorted by state then name
  const saleyardRows = useMemo(() => {
    return Object.entries(mlaSaleyardNameMapping)
      .map(([shortName, fullName]) => ({
        shortName,
        fullName,
        state: saleyardToState[fullName] ?? "-",
      }))
      .sort((a, b) => a.state.localeCompare(b.state) || a.shortName.localeCompare(b.shortName));
  }, []);

  return (
    <div className="space-y-6">
      {/* Section 1: Category Mapping */}
      <Section title="Category Mapping" description="How app categories map to MLA database categories for price lookup">
        <div className="flex items-center gap-1 mb-3">
          {speciesTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setSpecies(t.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                species === t.key
                  ? "bg-rose-500/15 text-rose-400"
                  : "text-text-muted hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-text-muted">
                <th className="pb-2 pr-4 font-medium">App Category</th>
                <th className="pb-2 pr-4 font-medium">MLA Category</th>
                <th className="pb-2 pr-4 font-medium">CSV Sources</th>
                <th className="pb-2 pr-4 font-medium">Fallback</th>
                <th className="pb-2 font-medium text-right">Default $/kg</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.appCategory} className="border-b border-white/[0.03]">
                  <td className="py-1.5 pr-4 text-text-primary">{r.appCategory}</td>
                  <td className="py-1.5 pr-4">
                    {r.isMapped ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-warning">{r.mlaCategory}</span>
                        <span className="text-[10px] text-text-muted">(remapped)</span>
                      </span>
                    ) : (
                      <span className="text-success">{r.mlaCategory}</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-4 text-text-muted">
                    {r.csvSources.length > 0 ? r.csvSources.join(", ") : <span className="text-white/20">-</span>}
                  </td>
                  <td className="py-1.5 pr-4">
                    {r.fallback ? (
                      <span className="text-info">{r.fallback}</span>
                    ) : (
                      <span className="text-white/20">-</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-text-muted">${r.defPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 2: CSV Inbound Mapping */}
      <Section title="CSV Inbound Mapping" description="How raw MLA CSV categories are transformed when scraped and stored in the database">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-text-muted">
                <th className="pb-2 pr-4 font-medium">MLA CSV Category</th>
                <th className="pb-2 pr-4 font-medium">Sale Prefix</th>
                <th className="pb-2 font-medium">Stored As</th>
              </tr>
            </thead>
            <tbody>
              {csvEntries.map((e, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  <td className="py-1.5 pr-4 text-text-primary">{e.csvCategory}</td>
                  <td className="py-1.5 pr-4">
                    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      e.salePrefix === "Any"
                        ? "bg-white/[0.06] text-text-muted"
                        : "bg-info/15 text-info"
                    }`}>
                      {e.salePrefix}
                    </span>
                  </td>
                  <td className="py-1.5">
                    {e.storedAs === e.csvCategory ? (
                      <span className="text-success">{e.storedAs}</span>
                    ) : (
                      <span className="text-warning">{e.storedAs}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 3: Breed Premiums */}
      <Section title="Breed Premiums (Cattle)" description="Percentage adjustments applied to base market price by breed">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-0.5">
          {breedRows.map((r) => (
            <div key={r.breed} className="flex items-center justify-between py-1 text-xs border-b border-white/[0.03]">
              <span className="text-text-primary">{r.breed}</span>
              <span className={`tabular-nums font-medium ${
                r.pct > 0 ? "text-success" : r.pct < 0 ? "text-error" : "text-text-muted"
              }`}>
                {r.pct > 0 ? "+" : ""}{r.pct}%
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-text-muted">
          Sheep, pig, and goat breed premiums are sourced from Supabase breed_premiums table.
        </p>
      </Section>

      {/* Section 4: Saleyard Name Resolution */}
      <Section title="Saleyard Name Resolution" description="How short MLA CSV saleyard names resolve to full app names">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-secondary">
              <tr className="border-b border-white/[0.06] text-left text-text-muted">
                <th className="pb-2 pr-4 font-medium">MLA Short Name</th>
                <th className="pb-2 pr-4 font-medium">Full App Name</th>
                <th className="pb-2 font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {saleyardRows.map((r, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  <td className="py-1.5 pr-4 text-text-primary">{r.shortName}</td>
                  <td className="py-1.5 pr-4 text-text-muted">{r.fullName}</td>
                  <td className="py-1.5">
                    <span className="inline-flex rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                      {r.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-surface-secondary p-4">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mb-3 text-[11px] text-text-muted">{description}</p>
      {children}
    </div>
  );
}
