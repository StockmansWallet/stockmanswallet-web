"use client";

import { useState, useMemo, useCallback } from "react";
import { Download, ArrowUpDown, ChevronDown, ChevronRight, FlaskConical } from "lucide-react";
import type { HerdWithValuation } from "./page";

type SortKey = "name" | "netValue" | "physicalValue" | "projectedWeight" | "pricePerKg" | "head_count" | "daysHeld";
type SortDir = "asc" | "desc";

const speciesFilters = ["All", "Cattle", "Sheep", "Pig", "Goat"] as const;

interface Props {
  herds: HerdWithValuation[];
  onTestHerd?: (herdId: string) => void;
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDollar(n: number): string {
  return `$${fmt(Math.round(n))}`;
}

function fmtCents(n: number): string {
  return `$${fmt(n, 2)}`;
}

function fmtPct(n: number): string {
  if (n === 0) return "-";
  return `${n > 0 ? "+" : ""}${fmt(n, 1)}%`;
}

export function ValuationTable({ herds, onTestHerd }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [speciesFilter, setSpeciesFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }, [sortKey]);

  const filtered = useMemo(() => {
    let result = herds;
    if (speciesFilter !== "All") {
      result = result.filter((h) => h.species === speciesFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.breed.toLowerCase().includes(q) ||
          h.category.toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return dir * a.name.localeCompare(b.name);
      const aVal = sortKey === "head_count" ? a.head_count : sortKey === "daysHeld" ? a.valuation.daysHeld : a.valuation[sortKey as keyof typeof a.valuation] as number;
      const bVal = sortKey === "head_count" ? b.head_count : sortKey === "daysHeld" ? b.valuation.daysHeld : b.valuation[sortKey as keyof typeof b.valuation] as number;
      return dir * ((aVal as number) - (bVal as number));
    });
  }, [herds, speciesFilter, search, sortKey, sortDir]);

  const totals = useMemo(() => ({
    head: filtered.reduce((s, h) => s + (h.head_count ?? 0), 0),
    physicalValue: filtered.reduce((s, h) => s + h.valuation.physicalValue, 0),
    baseMarketValue: filtered.reduce((s, h) => s + h.valuation.baseMarketValue, 0),
    weightGainAccrual: filtered.reduce((s, h) => s + h.valuation.weightGainAccrual, 0),
    breedingAccrual: filtered.reduce((s, h) => s + h.valuation.breedingAccrual, 0),
    grossValue: filtered.reduce((s, h) => s + h.valuation.grossValue, 0),
    mortalityDeduction: filtered.reduce((s, h) => s + h.valuation.mortalityDeduction, 0),
    netValue: filtered.reduce((s, h) => s + h.valuation.netValue, 0),
  }), [filtered]);

  const exportCsv = useCallback(() => {
    const headers = [
      "Name", "Species", "Breed", "Category", "MLA Category", "Saleyard",
      "Head", "Initial Weight (kg)", "Projected Weight (kg)", "DWG (kg/day)", "Days Held",
      "Mortality Rate (%)", "Is Breeder", "Breeding Program", "Calving Rate (%)",
      "Price Source", "Base Price ($/kg)", "Breed Premium (%)", "Adjusted Price ($/kg)", "Weight Range",
      "Base Market Value ($)", "Weight Gain Accrual ($)", "Physical Value ($)",
      "Breeding Accrual ($)", "Gross Value ($)", "Mortality Deduction ($)", "Net Value ($)",
    ];
    const rows = filtered.map((h) => {
      const v = h.valuation;
      return [
        h.name, h.species, h.breed, h.category, v.mlaCategory, h.selected_saleyard ?? "",
        h.head_count, h.initial_weight, v.projectedWeight.toFixed(1), h.daily_weight_gain, v.daysHeld,
        ((v.mortalityRate ?? 0) * 100).toFixed(1), h.is_breeder, h.breeding_program_type ?? "", ((h.calving_rate ?? 0) * 100).toFixed(0),
        v.priceSource, v.basePrice.toFixed(4), v.breedPremiumApplied.toFixed(1), v.pricePerKg.toFixed(4), v.matchedWeightRange ?? "",
        v.baseMarketValue.toFixed(2), v.weightGainAccrual.toFixed(2), v.physicalValue.toFixed(2),
        v.breedingAccrual.toFixed(2), v.grossValue.toFixed(2), v.mortalityDeduction.toFixed(2), v.netValue.toFixed(2),
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    navigator.clipboard.writeText(csv);
  }, [filtered]);

  const sourceColor: Record<string, string> = {
    saleyard: "bg-emerald-500/15 text-emerald-400",
    national: "bg-amber-500/15 text-amber-400",
    fallback: "bg-red-500/15 text-red-400",
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-surface-secondary p-0.5">
          {speciesFilters.map((s) => (
            <button
              key={s}
              onClick={() => setSpeciesFilter(s)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                speciesFilter === s
                  ? "bg-white/[0.08] text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search herds..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-white/[0.06] bg-surface-secondary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/50 outline-none focus:border-brand/40 w-48"
        />
        <button
          onClick={exportCsv}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-surface-secondary px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <Download className="h-3 w-3" />
          Copy CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-white/[0.06] bg-surface-secondary">
              {/* Identity */}
              <ColGroup label="IDENTITY" span={4} first />
              {/* Inputs */}
              <ColGroup label="INPUTS" span={4} />
              {/* Price */}
              <ColGroup label="PRICE RESOLUTION" span={4} />
              {/* Breakdown */}
              <ColGroup label="VALUATION BREAKDOWN" span={7} />
            </tr>
            <tr className="border-b border-white/[0.06] bg-surface-secondary/50">
              <Th sticky>Name</Th>
              <Th>Breed</Th>
              <Th>Category</Th>
              <Th>Saleyard</Th>

              <SortTh sortKey="head_count" currentKey={sortKey} dir={sortDir} onSort={toggleSort}>Head</SortTh>
              <Th>Init Wt</Th>
              <SortTh sortKey="projectedWeight" currentKey={sortKey} dir={sortDir} onSort={toggleSort}>Proj Wt</SortTh>
              <SortTh sortKey="daysHeld" currentKey={sortKey} dir={sortDir} onSort={toggleSort}>Days</SortTh>

              <Th>Source</Th>
              <Th>Base $/kg</Th>
              <Th>Premium</Th>
              <SortTh sortKey="pricePerKg" currentKey={sortKey} dir={sortDir} onSort={toggleSort}>Adj $/kg</SortTh>

              <Th>Base MV</Th>
              <Th>WG Accrual</Th>
              <SortTh sortKey="physicalValue" currentKey={sortKey} dir={sortDir} onSort={toggleSort}>Physical</SortTh>
              <Th>Breeding</Th>
              <Th>Gross</Th>
              <Th>Mortality</Th>
              <SortTh sortKey="netValue" currentKey={sortKey} dir={sortDir} onSort={toggleSort}>Net Value</SortTh>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => {
              const v = h.valuation;
              const isExpanded = expandedId === h.id;
              return (
                <Fragment key={h.id}>
                  <tr
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : h.id)}
                  >
                    <Td sticky className="font-medium text-text-primary">
                      <span className="flex items-center gap-1">
                        {isExpanded ? <ChevronDown className="h-3 w-3 text-text-muted" /> : <ChevronRight className="h-3 w-3 text-text-muted" />}
                        {h.name}
                        {onTestHerd && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onTestHerd(h.id); }}
                            className="ml-1 rounded p-0.5 text-text-muted hover:text-brand hover:bg-white/[0.06] transition-colors"
                            title="Test in calculator"
                          >
                            <FlaskConical className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    </Td>
                    <Td>{h.breed}</Td>
                    <Td>{h.category}</Td>
                    <Td className="max-w-[120px] truncate">{h.selected_saleyard ?? "-"}</Td>

                    <Td right>{fmt(h.head_count)}</Td>
                    <Td right>{fmt(h.initial_weight, 1)}</Td>
                    <Td right>{fmt(v.projectedWeight, 1)}</Td>
                    <Td right>{fmt(v.daysHeld)}</Td>

                    <Td>
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${sourceColor[v.priceSource] ?? ""}`}>
                        {v.priceSource}
                      </span>
                    </Td>
                    <Td right>{fmtCents(v.basePrice)}</Td>
                    <Td right>{fmtPct(v.breedPremiumApplied)}</Td>
                    <Td right className="font-medium">{fmtCents(v.pricePerKg)}</Td>

                    <Td right>{fmtDollar(v.baseMarketValue)}</Td>
                    <Td right className={v.weightGainAccrual > 0 ? "text-emerald-400" : ""}>{fmtDollar(v.weightGainAccrual)}</Td>
                    <Td right>{fmtDollar(v.physicalValue)}</Td>
                    <Td right className={v.breedingAccrual > 0 ? "text-sky-400" : ""}>{v.breedingAccrual > 0 ? fmtDollar(v.breedingAccrual) : "-"}</Td>
                    <Td right>{fmtDollar(v.grossValue)}</Td>
                    <Td right className={v.mortalityDeduction > 0 ? "text-red-400" : ""}>{v.mortalityDeduction > 0 ? `-${fmtDollar(v.mortalityDeduction)}` : "-"}</Td>
                    <Td right className="font-semibold text-text-primary">{fmtDollar(v.netValue)}</Td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-white/[0.015]">
                      <td colSpan={19} className="px-4 py-3">
                        <ExpandedDetail herd={h} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/[0.08] bg-surface-secondary/50 font-semibold">
              <Td sticky className="text-text-primary">Totals</Td>
              <Td />
              <Td />
              <Td />
              <Td right>{fmt(totals.head)}</Td>
              <Td />
              <Td />
              <Td />
              <Td />
              <Td />
              <Td />
              <Td />
              <Td right>{fmtDollar(totals.baseMarketValue)}</Td>
              <Td right className="text-emerald-400">{fmtDollar(totals.weightGainAccrual)}</Td>
              <Td right>{fmtDollar(totals.physicalValue)}</Td>
              <Td right className="text-sky-400">{totals.breedingAccrual > 0 ? fmtDollar(totals.breedingAccrual) : "-"}</Td>
              <Td right>{fmtDollar(totals.grossValue)}</Td>
              <Td right className="text-red-400">{totals.mortalityDeduction > 0 ? `-${fmtDollar(totals.mortalityDeduction)}` : "-"}</Td>
              <Td right className="text-brand">{fmtDollar(totals.netValue)}</Td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-[10px] text-text-muted/50">
        {filtered.length} herd{filtered.length !== 1 ? "s" : ""} shown. Click a row to expand formula details. CSV copies to clipboard.
      </p>
    </div>
  );
}

// Expanded row showing the actual formula with numbers
function ExpandedDetail({ herd }: { herd: HerdWithValuation }) {
  const v = herd.valuation;
  const lines = [
    { label: "MLA Category", value: v.mlaCategory },
    { label: "Weight Range", value: v.matchedWeightRange ?? "none (any-weight or clamped)" },
    { label: "Mortality Rate", value: `${((v.mortalityRate ?? 0) * 100).toFixed(1)}%` },
    { label: "DWG", value: `${herd.daily_weight_gain} kg/day` },
    { label: "Created", value: new Date(herd.created_at).toLocaleDateString("en-AU") },
    ...(herd.is_breeder ? [
      { label: "Breeding Program", value: herd.breeding_program_type ?? "none" },
      { label: "Calving Rate", value: `${((herd.calving_rate ?? 0) * 100).toFixed(0)}%` },
      { label: "Joined Date", value: herd.joined_date ? new Date(herd.joined_date).toLocaleDateString("en-AU") : "not set" },
    ] : []),
  ];

  const formulas = [
    `ProjectedWeight = ${herd.initial_weight} + (${herd.daily_weight_gain} x ${v.daysHeld} days) = ${v.projectedWeight.toFixed(1)} kg`,
    `PhysicalValue = ${herd.head_count} x ${v.projectedWeight.toFixed(1)} x $${v.pricePerKg.toFixed(4)} = ${fmtDollar(v.physicalValue)}`,
    `BaseMarketValue = ${herd.head_count} x ${herd.initial_weight} x $${v.pricePerKg.toFixed(4)} = ${fmtDollar(v.baseMarketValue)}`,
    `WeightGainAccrual = ${fmtDollar(v.physicalValue)} - ${fmtDollar(v.baseMarketValue)} = ${fmtDollar(v.weightGainAccrual)}`,
    ...(v.mortalityDeduction > 0
      ? [`MortalityDeduction = ${fmtDollar(v.baseMarketValue)} x (${v.daysHeld}/365) x ${((v.mortalityRate ?? 0) * 100).toFixed(1)}% = ${fmtDollar(v.mortalityDeduction)}`]
      : []),
    ...(v.breedingAccrual > 0
      ? [`BreedingAccrual = ${fmtDollar(v.breedingAccrual)}`]
      : []),
    `NetValue = ${fmtDollar(v.physicalValue)} - ${fmtDollar(v.mortalityDeduction)} + ${fmtDollar(v.breedingAccrual)} = ${fmtDollar(v.netValue)}`,
  ];

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Details</p>
        <div className="space-y-1">
          {lines.map((l) => (
            <div key={l.label} className="flex items-center gap-2 text-[11px]">
              <span className="text-text-muted w-28 shrink-0">{l.label}</span>
              <span className="text-text-primary font-mono">{l.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Formulas (with values)</p>
        <div className="space-y-1">
          {formulas.map((f, i) => (
            <p key={i} className="font-mono text-[11px] text-amber-200/70">{f}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// Table helper components
import { Fragment, type ReactNode } from "react";

function ColGroup({ label, span, first }: { label: string; span: number; first?: boolean }) {
  return (
    <th
      colSpan={span}
      className={`px-2 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-text-muted/60 text-center ${
        !first ? "border-l border-white/[0.06]" : ""
      }`}
    >
      {label}
    </th>
  );
}

function Th({ children, sticky, right }: { children?: ReactNode; sticky?: boolean; right?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap px-2 py-2 text-[10px] font-medium text-text-muted ${
        right ? "text-right" : "text-left"
      } ${sticky ? "sticky left-0 z-10 bg-surface-secondary/90 backdrop-blur-sm" : ""}`}
    >
      {children}
    </th>
  );
}

function SortTh({
  sortKey,
  currentKey,
  dir,
  onSort,
  children,
}: {
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  children: ReactNode;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="whitespace-nowrap px-2 py-2 text-right text-[10px] font-medium text-text-muted cursor-pointer hover:text-text-primary transition-colors select-none"
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        <ArrowUpDown className={`h-2.5 w-2.5 ${active ? "text-brand" : "text-text-muted/30"}`} />
        {active && <span className="text-[8px] text-brand">{dir === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  );
}

function Td({ children, sticky, right, className = "" }: { children?: ReactNode; sticky?: boolean; right?: boolean; className?: string }) {
  return (
    <td
      className={`whitespace-nowrap px-2 py-2 text-text-secondary ${
        right ? "text-right tabular-nums" : "text-left"
      } ${sticky ? "sticky left-0 z-10 bg-inherit backdrop-blur-sm" : ""} ${className}`}
    >
      {children}
    </td>
  );
}
