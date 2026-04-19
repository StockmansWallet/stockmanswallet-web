"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPinned, ChevronDown, ChevronRight, Search, Loader2 } from "lucide-react";
import type { SaleyardStats } from "./page";

const dateRanges = [
  { label: "All time", value: "" },
  { label: "Past month", value: "1" },
  { label: "Past 3 months", value: "3" },
  { label: "Past 6 months", value: "6" },
  { label: "Past year", value: "12" },
  { label: "Past 2 years", value: "24" },
  { label: "Past 3 years", value: "36" },
] as const;

function sinceDate(months: string): string | null {
  if (!months) return null;
  const d = new Date();
  d.setMonth(d.getMonth() - parseInt(months));
  return d.toISOString().slice(0, 10);
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function freshnessColor(days: number | null): string {
  if (days === null) return "text-text-muted";
  if (days <= 7) return "text-success";
  if (days <= 30) return "text-amber-400";
  return "text-error";
}

function freshnessBg(days: number | null): string {
  if (days === null) return "bg-white/[0.03]";
  if (days <= 7) return "bg-success/[0.06]";
  if (days <= 30) return "bg-amber-500/[0.06]";
  return "bg-error/[0.06]";
}

function freshnessLabel(days: number | null): string {
  if (days === null) return "No data";
  if (days < 0) return `${Math.abs(days)}d ahead`;
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export function SaleyardStatus() {
  const [stats, setStats] = useState<SaleyardStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [range, setRange] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = useCallback((months: string) => {
    setLoading(true);
    setError(null);
    const since = sinceDate(months);
    const url = since ? `/api/admin/saleyard-stats?since=${since}` : "/api/admin/saleyard-stats";
    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Failed to load saleyard data (${res.status})`);
        }
        return res.json();
      })
      .then((data) => setStats(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData(range);
  }, [range, loadData]);

  if (error) {
    return (
      <div className="rounded-xl border border-error/20 bg-error/[0.04] px-5 py-8 text-center">
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  if (!stats && loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-surface-secondary px-5 py-12">
        <Loader2 className="h-4 w-4 animate-spin text-brand" />
        <span className="text-sm text-text-muted">Loading saleyard data...</span>
      </div>
    );
  }

  if (!stats) return null;

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
            <span className="inline-flex items-center rounded-md bg-error/15 px-1.5 py-0.5 text-[10px] font-medium text-error">
              {staleCount} stale (&gt;30 days)
            </span>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search saleyards..."
            aria-label="Search saleyards"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/[0.06] bg-surface-secondary py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-brand/40"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {dateRanges.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                range === r.value
                  ? "bg-brand/20 text-brand border border-brand/30"
                  : "bg-white/[0.03] text-text-muted border border-white/[0.06] hover:bg-white/[0.06]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />}
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
              <th className="px-3 py-2.5 font-medium text-text-muted">Oldest Data</th>
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
                    <td className="px-3 py-2.5 text-text-muted">
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-text-primary">{s.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{s.totalEntries.toLocaleString()}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-muted">{s.newestDataDate ?? "-"}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-muted">{s.oldestDataDate ?? "-"}</td>
                    <td className={`px-3 py-2.5 font-medium ${freshnessColor(days)}`}>{freshnessLabel(days)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{s.categories.length}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{s.weightRanges.length}</td>
                    <td className="px-3 py-2.5 text-center">
                      {s.hasBreedSpecific ? (
                        <span className="inline-flex rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          {s.breeds.length} breeds
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {s.herdsUsing > 0 ? (
                        <span className="font-medium text-brand">{s.herdsUsing}</span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-white/[0.04]">
                      <td colSpan={10} className="bg-white/[0.01] px-6 py-3">
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
                <td colSpan={10} className="px-3 py-8 text-center text-text-muted">
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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item}
            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] ${
              muted
                ? "text-text-muted"
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
