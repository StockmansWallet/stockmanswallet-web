"use client";

// Client view for the Saleyard Comparison report. Owns the distance filter
// so the stats cards, top-10 chart, and full list all react in lockstep
// without a server round-trip. The page server component does the heavy
// lifting (valuation + sort) and hands us a ready ranked list.

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { shortSaleyardName } from "@/lib/data/reference-data";
import type { SaleyardComparisonData } from "@/lib/types/reports";
import { LazyChart } from "./lazy-chart";

function fmtPrice(v: number) {
  return `$${v.toFixed(2)}/kg`;
}

function fmtValue(v: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(v);
}

// Distance filter buttons. null = "All" (no filter). Keep the set small so the
// pill row stays compact on mobile; these values cover the realistic range of
// how far a producer is willing to consider trucking livestock.
const DISTANCE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "All", value: null },
  { label: "100 km", value: 100 },
  { label: "250 km", value: 250 },
  { label: "500 km", value: 500 },
];

export function SaleyardComparisonView({
  saleyardComparison,
}: {
  saleyardComparison: SaleyardComparisonData[];
}) {
  const searchParams = useSearchParams();
  const maxDistanceKm = parseDistanceParam(searchParams.get("distance"));

  // Only offer distance filtering when at least some rows carry a distance.
  // Otherwise the filter would silently empty the list and confuse the user.
  // Apply the distance filter. Rows with a null distance (eg. when the user
  // has no default property with coordinates) are always kept so the report
  // remains usable in that case.
  const filtered = useMemo(() => {
    if (maxDistanceKm == null) return saleyardComparison;
    return saleyardComparison.filter(
      (s) => s.distanceKm == null || s.distanceKm <= maxDistanceKm
    );
  }, [saleyardComparison, maxDistanceKm]);

  const isEmpty = filtered.length === 0;

  // Recompute summary stats over the filtered set so the "best/worst/spread"
  // cards reflect what the user is actually looking at.
  const best = filtered[0] ?? null;
  const worst = filtered[filtered.length - 1] ?? null;
  const bestByPrice = useMemo(
    () => (best ? [...filtered].sort((a, b) => b.avgPrice - a.avgPrice)[0] : null),
    [filtered, best]
  );

  const chartData = filtered.slice(0, 10).map((s) => ({
    name: shortSaleyardName(s.saleyardName),
    portfolioValue: Math.round(s.totalPortfolioValue),
    distanceKm: s.distanceKm,
  }));

  return (
    <div className="flex flex-col gap-4">
      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-text-muted">
              No saleyards within {maxDistanceKm} km of your property. Try a wider distance.
            </p>
            <Link href="/dashboard/herds/new">
              <Button>Add Herd</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Best Saleyard</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-reports">
                  {fmtValue(best!.totalPortfolioValue)}
                </p>
                <p className="mt-0.5 truncate text-xs text-text-secondary">
                  {shortSaleyardName(best!.saleyardName)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Best Avg $/kg</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">
                  {fmtPrice(bestByPrice!.avgPrice)}
                </p>
                <p className="mt-0.5 truncate text-xs text-text-secondary">
                  {shortSaleyardName(bestByPrice!.saleyardName)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Saleyards Compared</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">
                  {filtered.length}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {best!.totalHeadCount.toLocaleString()} head in portfolio
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-text-muted">Best vs Worst</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">
                  {fmtValue(best!.totalPortfolioValue - worst!.totalPortfolioValue)}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">portfolio value spread</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart (lazy loaded) */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>
                    {chartData.length === filtered.length && filtered.length <= 10
                      ? "Saleyards by Portfolio Value"
                      : `Top ${chartData.length} Saleyards by Portfolio Value`}
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Your portfolio valued using each saleyard&apos;s latest MLA category prices.
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <LazyChart data={chartData} />
              </CardContent>
            </Card>
          )}

          {/* Full Comparison Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Saleyards</CardTitle>
                <span className="text-xs text-text-muted">ranked by portfolio value</span>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-text-muted">
                      <th className="px-5 pb-2 font-medium">#</th>
                      <th className="px-3 pb-2 font-medium">Saleyard</th>
                      <th className="px-3 pb-2 text-right font-medium">Portfolio Value</th>
                      <th className="px-3 pb-2 text-right font-medium">Avg $/kg</th>
                      <th className="px-3 pb-2 text-right font-medium">Avg $/hd</th>
                      <th className="hidden px-3 pb-2 text-right font-medium sm:table-cell">Spread</th>
                      <th className="hidden px-3 pb-2 text-right font-medium sm:table-cell">Diff ($)</th>
                      <th className="hidden px-3 pb-2 text-right font-medium sm:table-cell">Diff (%)</th>
                      <th className="px-5 pb-2 font-medium">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((s, index) => {
                      // Rank is the index within the filtered list so "1" always
                      // refers to the top row the user can actually see.
                      const displayRank = index + 1;
                      const isFirst = displayRank === 1;
                      const short = shortSaleyardName(s.saleyardName);
                      const showFull = short !== s.saleyardName;
                      return (
                        <tr key={s.saleyardName} className="transition-colors hover:bg-white/[0.02]">
                          <td
                            className={`px-5 py-2.5 tabular-nums ${
                              isFirst ? "font-semibold text-reports" : "text-text-muted"
                            }`}
                          >
                            {displayRank}
                          </td>
                          <td className="px-3 py-2.5">
                            <p
                              className={`${
                                isFirst ? "font-semibold text-text-primary" : "text-text-primary"
                              }`}
                            >
                              {short}
                            </p>
                            {showFull && (
                              <p className="text-[10px] text-text-muted">{s.saleyardName}</p>
                            )}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-right tabular-nums ${
                              isFirst ? "font-semibold text-reports" : "text-text-primary"
                            }`}
                          >
                            {fmtValue(s.totalPortfolioValue)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">
                            {fmtPrice(s.avgPrice)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">
                            {fmtValue(s.avgPerHead)}
                          </td>
                          <td className="hidden px-3 py-2.5 text-right tabular-nums text-text-muted sm:table-cell">
                            {fmtPrice(s.spread)}
                          </td>
                          <td className="hidden px-3 py-2.5 text-right tabular-nums text-text-muted sm:table-cell">
                            {s.diffToBestDollars > 0 ? `-${fmtValue(s.diffToBestDollars)}` : "-"}
                          </td>
                          <td className="hidden px-3 py-2.5 text-right tabular-nums text-text-muted sm:table-cell">
                            {s.diffToBestPercent > 0 ? `-${s.diffToBestPercent.toFixed(1)}%` : "-"}
                          </td>
                          <td className="px-5 py-2.5 text-text-muted">{s.state ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function parseDistanceParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return DISTANCE_OPTIONS.some((option) => option.value === parsed) ? parsed : null;
}

export function SaleyardDistanceFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const maxDistanceKm = parseDistanceParam(searchParams.get("distance"));

  function handleChange(value: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value == null) {
      params.delete("distance");
    } else {
      params.set("distance", String(value));
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <div className="flex shrink-0 items-center gap-2 pl-1 pr-0.5 text-xs lg:ml-auto">
      <span className="text-text-muted">Distance</span>
      <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-0.5">
        {DISTANCE_OPTIONS.map((opt) => {
          const active = maxDistanceKm === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => handleChange(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-reports/60 ${
                active
                  ? "bg-reports/20 text-reports"
                  : "text-text-muted hover:text-text-secondary"
              }`}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
