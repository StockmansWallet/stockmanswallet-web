import type { ReportData, SaleyardComparisonData } from "@/lib/types/reports";
import { shortSaleyardName } from "@/lib/data/reference-data";
import { ReportPrintStyles } from "../asset-register/print-styles";

// -- Formatters ---------------------------------------------------------------

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtFull(v: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtPrice(v: number) {
  return `$${v.toFixed(2)}/kg`;
}

// -- Main template ------------------------------------------------------------

export function SaleyardComparisonTemplate({ data }: { data: ReportData }) {
  const { saleyardComparison: sc, userDetails, dateRange } = data;

  if (sc.length === 0) {
    return (
      <>
        <ReportPrintStyles />
        <div className="report-page font-sans text-[#271F16]">
          <p className="text-sm text-[#6B5B45]">No market data available for your herd categories.</p>
        </div>
      </>
    );
  }

  const best = sc[0];
  const worst = sc[sc.length - 1];
  const bestByPrice = [...sc].sort((a, b) => b.avgPrice - a.avgPrice)[0];

  return (
    <>
      <ReportPrintStyles />

      <div className="report-page font-sans text-[#271F16]">

        {/* Logo + title */}
        <div className="flex items-end justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sw-logo-light.svg" alt="Stockman's Wallet" className="h-16 w-auto" />
          <p className="text-3xl font-bold" style={{ color: "#271F16" }}>Saleyard Comparison</p>
        </div>

        {/* Executive Summary */}
        <div className="mt-4 overflow-hidden rounded-xl">
          <div className="px-5 py-4" style={{ backgroundColor: "#271F16" }}>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/70">Best Portfolio Value</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-white">{fmtFull(best.totalPortfolioValue)}</p>
            <p className="mt-0.5 text-sm text-white/60">{shortSaleyardName(best.saleyardName)}</p>
          </div>
          <div className="grid grid-cols-4 gap-x-4 border-x border-b border-[#8B7355]/25 px-5 py-3" style={{ borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Best Avg $/kg</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#271F16]">{fmtPrice(bestByPrice.avgPrice)}</p>
              <p className="text-[10px] text-[#271F16]/50">{shortSaleyardName(bestByPrice.saleyardName)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Saleyards</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#271F16]">{sc.length}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Head in Portfolio</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#271F16]">{best.totalHeadCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Best vs Worst</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#271F16]">{fmt(best.totalPortfolioValue - worst.totalPortfolioValue)}</p>
            </div>
          </div>
        </div>

        {/* Producer details */}
        {userDetails && (
          <div className="mt-4 rounded-xl border border-[#8B7355]/25 px-5 py-3">
            <div className="flex gap-8">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B5B45]">Prepared For</p>
                <p className="mt-0.5 text-sm font-semibold text-[#271F16]">{userDetails.preparedFor}</p>
              </div>
              {userDetails.propertyName && (
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B5B45]">Property</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#271F16]">{userDetails.propertyName}</p>
                </div>
              )}
              {userDetails.location && (
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B5B45]">Location</p>
                  <p className="mt-0.5 text-sm text-[#271F16]">{userDetails.location}</p>
                </div>
              )}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B5B45]">Report Period</p>
                <p className="mt-0.5 text-sm text-[#271F16]">{fmtDate(dateRange.start)} - {fmtDate(dateRange.end)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 callout */}
        <div className="mt-4 flex gap-2">
          {sc.slice(0, 3).map((s, i) => (
            <div
              key={s.saleyardName}
              className="flex-1 rounded-xl border border-[#8B7355]/25 px-4 py-3"
              style={i === 0 ? { backgroundColor: "rgba(139, 115, 85, 0.12)" } : {}}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: i === 0 ? "#FFAA00" : "#8B7355" }}>
                  {i + 1}
                </span>
                <p className="text-xs font-semibold text-[#271F16]">{shortSaleyardName(s.saleyardName)}</p>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#271F16]">{fmt(s.totalPortfolioValue)}</p>
              <p className="text-[10px] tabular-nums text-[#271F16]/50">
                {fmtPrice(s.avgPrice)} avg
                {s.distanceKm != null && <> | {s.distanceKm.toLocaleString("en-AU")} km</>}
              </p>
            </div>
          ))}
        </div>

        {/* Full Comparison Table */}
        <section className="mt-5">
          <h2 className="mb-2 text-base font-bold text-[#271F16]">Full Saleyard Comparison</h2>

          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-[#8B7355]/30 text-[#6B5B45]">
                <th className="pb-1.5 pr-2 text-left font-semibold">#</th>
                <th className="pb-1.5 pr-2 text-left font-semibold">Saleyard</th>
                <th className="pb-1.5 pr-2 text-right font-semibold">Portfolio Value</th>
                <th className="pb-1.5 pr-2 text-right font-semibold">Avg $/kg</th>
                <th className="pb-1.5 pr-2 text-right font-semibold">Avg $/hd</th>
                <th className="pb-1.5 pr-2 text-right font-semibold">Spread</th>
                <th className="pb-1.5 pr-2 text-right font-semibold">Diff ($)</th>
                <th className="pb-1.5 pr-2 text-right font-semibold">Diff (%)</th>
                <th className="pb-1.5 pr-2 text-left font-semibold">State</th>
                <th className="pb-1.5 text-right font-semibold">Distance</th>
              </tr>
            </thead>
            <tbody>
              {sc.map((s) => {
                const isFirst = s.rank === 1;
                const short = shortSaleyardName(s.saleyardName);
                return (
                  <tr
                    key={s.saleyardName}
                    className="border-b border-[#8B7355]/15"
                    style={isFirst ? { backgroundColor: "rgba(255, 170, 0, 0.08)" } : {}}
                  >
                    <td className={`py-1.5 pr-2 tabular-nums ${isFirst ? "font-bold text-[#FFAA00]" : "text-[#6B5B45]"}`}>{s.rank}</td>
                    <td className="py-1.5 pr-2">
                      <p className={`${isFirst ? "font-bold" : "font-medium"} text-[#271F16]`}>{short}</p>
                      {short !== s.saleyardName && (
                        <p className="text-[8px] text-[#271F16]/40">{s.saleyardName}</p>
                      )}
                    </td>
                    <td className={`py-1.5 pr-2 text-right tabular-nums ${isFirst ? "font-bold text-[#271F16]" : "text-[#271F16]"}`}>{fmt(s.totalPortfolioValue)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-[#271F16]/80">{fmtPrice(s.avgPrice)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-[#271F16]/80">{fmt(s.avgPerHead)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-[#271F16]/50">{fmtPrice(s.spread)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-[#271F16]/50">
                      {s.diffToBestDollars > 0 ? `-${fmt(s.diffToBestDollars)}` : "-"}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-[#271F16]/50">
                      {s.diffToBestPercent > 0 ? `-${s.diffToBestPercent.toFixed(1)}%` : "-"}
                    </td>
                    <td className="py-1.5 pr-2 text-[#6B5B45]">{s.state ?? ""}</td>
                    <td className="py-1.5 text-right tabular-nums text-[#271F16]/80">
                      {s.distanceKm != null ? `${s.distanceKm.toLocaleString("en-AU")} km` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <div className="mt-6 pt-2 text-[7px] text-[#6B5B45]">
          <div className="flex items-center justify-between">
            <p>Stockman&apos;s Wallet &nbsp;|&nbsp; Intelligent Livestock Valuation &nbsp;|&nbsp; www.stockmanswallet.com.au</p>
            <p>Generated {fmtDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>
    </>
  );
}
