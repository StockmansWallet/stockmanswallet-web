"use client";

import { useState } from "react";
import { MapPinned, ChevronDown, ChevronRight, Search } from "lucide-react";
import type { SaleyardStats } from "./page";

interface Props {
  stats: SaleyardStats[];
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function freshnessColor(days: number | null): string {
  if (days === null) return "text-text-muted";
  if (days <= 7) return "text-emerald-400";
  if (days <= 30) return "text-amber-400";
  return "text-red-400";
}

function freshnessBg(days: number | null): string {
  if (days === null) return "bg-white/[0.03]";
  if (days <= 7) return "bg-emerald-500/[0.06]";
  if (days <= 30) return "bg-amber-500/[0.06]";
  return "bg-red-500/[0.06]";
}

function freshnessLabel(days: number | null): string {
  if (days === null) return "No data";
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function SaleyardStatus({ stats }: Props) {
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filtered = stats.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalEntries = stats.reduce((sum, s) => sum + s.totalEntries, 0);
  const withData = stats.filter((s) => s.totalEntries > 0).length;
  const staleCount = stats.filter((s) => {
    const d = daysSince(s.newestDataDate);
    return d !== null && d > 30;
  }).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-surface-secondary px-4 py-3">
        <div className="flex items-center gap-1.5">
          <MapPinned className="h-3.5 w-3.5 text-sky-400" />
          <span className="text-xs text-text-muted">Saleyards with data</span>
          <span className="text-sm font-semibold text-text-primary">{withData}</span>
        </div>
        <div className="h-4 w-px bg-white/[0.08]" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">Total price entries</span>
          <span className="text-sm font-semibold text-text-primary">{totalEntries.toLocaleString()}</span>
        </div>
        {staleCount > 0 && (
          <>
            <div className="h-4 w-px bg-white/[0.08]" />
            <span className="inline-flex items-center rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
              {staleCount} stale (&gt;30 days)
            </span>
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted/50" />
        <input
          type="text"
          placeholder="Search saleyards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-white/[0.06] bg-surface-secondary py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted/40 outline-none focus:border-brand/40"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-surface-secondary text-left">
              <th className="w-8 px-3 py-2.5" />
              <th className="px-3 py-2.5 font-medium text-text-muted">Saleyard</th>
              <th className="px-3 py-2.5 font-medium text-text-muted text-right">Entries</th>
              <th className="px-3 py-2.5 font-medium text-text-muted">Latest Data</th>
              <th className="px-3 py-2.5 font-medium text-text-muted">Freshness</th>
              <th className="px-3 py-2.5 font-medium text-text-muted text-right">Categories</th>
              <th className="px-3 py-2.5 font-medium text-text-muted text-right">Weight Ranges</th>
              <th className="px-3 py-2.5 font-medium text-text-muted text-center">Breed Data</th>
              <th className="px-3 py-2.5 font-medium text-text-muted text-right">Herds Using</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const days = daysSince(s.newestDataDate);
              const isExpanded = expandedRow === s.name;
              return (
                <RowGroup key={s.name}>
                  <tr
                    className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] cursor-pointer ${freshnessBg(days)}`}
                    onClick={() => setExpandedRow(isExpanded ? null : s.name)}
                  >
                    <td className="px-3 py-2.5 text-text-muted/50">
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-text-primary">{s.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{s.totalEntries.toLocaleString()}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-muted">{s.newestDataDate ?? "-"}</td>
                    <td className={`px-3 py-2.5 font-medium ${freshnessColor(days)}`}>{freshnessLabel(days)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{s.categories.length}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{s.weightRanges.length}</td>
                    <td className="px-3 py-2.5 text-center">
                      {s.hasBreedSpecific ? (
                        <span className="inline-flex rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                          {s.breeds.length} breeds
                        </span>
                      ) : (
                        <span className="text-text-muted/40">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {s.herdsUsing > 0 ? (
                        <span className="font-medium text-brand">{s.herdsUsing}</span>
                      ) : (
                        <span className="text-text-muted/40">0</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-white/[0.04]">
                      <td colSpan={9} className="bg-white/[0.01] px-6 py-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <DetailList title="Categories" items={s.categories} />
                          <DetailList title="Weight Ranges" items={s.weightRanges} />
                          <DetailList title="Breeds" items={s.breeds.length > 0 ? s.breeds : ["No breed-specific data"]} muted={s.breeds.length === 0} />
                        </div>
                        {s.oldestDataDate && s.newestDataDate && (
                          <p className="mt-2 text-[10px] text-text-muted">
                            Data range: {s.oldestDataDate} to {s.newestDataDate}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </RowGroup>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-text-muted">
                  No saleyards match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DetailList({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/60 mb-1">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item}
            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] ${
              muted
                ? "text-text-muted/40"
                : "bg-white/[0.05] text-text-muted"
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
