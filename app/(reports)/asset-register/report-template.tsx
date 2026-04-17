import type { ReportData, HerdReportData } from "@/lib/types/reports";
import type { PortfolioMovementSummary } from "@/lib/types/portfolio-movement";
import { PrintActions } from "./print-actions";
import { ReportPrintStyles } from "./print-styles";

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

// -- Colour palette (matches web app) -----------------------------------------

const CHART_COLOURS = [
  "#FFAA00", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#a855f7",
];

// -- Donut chart via SVG ------------------------------------------------------

function DonutChart({
  items,
}: {
  items: { label: string; percentage: number }[];
}) {
  const size = 100;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {items.map((item, i) => {
        const dash = (item.percentage / 100) * circumference;
        const gap = circumference - dash;
        const currentOffset = offset;
        offset += dash;
        return (
          <circle
            key={item.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={CHART_COLOURS[i % CHART_COLOURS.length]}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-currentOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
    </svg>
  );
}

// -- Herd card (compact for print) --------------------------------------------

function HerdCard({ herd }: { herd: HerdReportData }) {
  const calvingPct = herd.calvingRate > 1 ? herd.calvingRate : herd.calvingRate * 100;
  const mortalityPct = herd.mortalityRate > 1 ? herd.mortalityRate : herd.mortalityRate * 100;

  const extras: { label: string; value: string; accent?: boolean }[] = [];
  extras.push({ label: "Avg per Head", value: fmtFull(herd.netValue / herd.headCount) });
  if (herd.dailyWeightGain > 0) {
    extras.push({ label: "DWG", value: `${herd.dailyWeightGain.toFixed(2)} kg/day` });
  }
  if (herd.isBreeder && calvingPct > 0) {
    extras.push({ label: "Calving", value: `${calvingPct.toFixed(0)}%` });
  }
  if (herd.breedingAccrual != null && herd.breedingAccrual > 0) {
    extras.push({ label: "Calf Accrual", value: fmtFull(herd.breedingAccrual) });
  }
  if (mortalityPct > 0) {
    extras.push({ label: "Mortality", value: `${mortalityPct.toFixed(1)}% p.a.` });
  }
  if (herd.baseBreedPremium !== 0) {
    extras.push({ label: "Breed Premium", value: `${herd.baseBreedPremium >= 0 ? "+" : ""}${herd.baseBreedPremium}%` });
  }
  if (herd.breedPremiumOverride != null) {
    extras.push({ label: "Custom Breed Premium", value: `${herd.breedPremiumOverride >= 0 ? "+" : ""}${herd.breedPremiumOverride}%`, accent: true });
  }

  return (
    <div className="break-inside-avoid overflow-hidden rounded-xl border border-[#8B7355]/25">
      {/* Header: name + value with background */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: "rgba(139, 115, 85, 0.25)" }}>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h4 className="text-sm font-bold text-[#271F16]">{herd.name}</h4>
            <p className="text-xs text-[#271F16]/60">{herd.category}</p>
          </div>
          {herd.livestockOwner && (
            <p className="text-[10px] text-[#271F16]/60">
              <span className="text-[#271F16]/45">Livestock Owner:</span>{" "}
              <span>{herd.livestockOwner}</span>
            </p>
          )}
        </div>
        <p className="ml-4 shrink-0 text-base font-bold tabular-nums text-[#271F16]">
          {fmtFull(herd.netValue)}
        </p>
      </div>

      {/* Core metrics: structured 4-column grid */}
      <div className="grid grid-cols-4 gap-x-3 px-4 py-2">
        <PrintStat label="Head Count" value={`${herd.headCount}`} />
        <PrintStat label="Age" value={`${herd.ageMonths} months`} />
        <PrintStat label="Weight" value={`${herd.weight.toFixed(0)} kg`} />
        <PrintStat label="Price" value={`$${herd.pricePerKg.toFixed(2)}/kg`} />
      </div>

      {/* Supplementary metrics: rows of 4 */}
      {extras.length > 0 && (() => {
        const rows: typeof extras[] = [];
        for (let i = 0; i < extras.length; i += 4) rows.push(extras.slice(i, i + 4));
        return rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-4 gap-x-3 border-t border-[#8B7355]/20 px-4 py-2">
            {row.map((e) => (
              <PrintStat key={e.label} label={e.label} value={e.value} accent={e.accent} />
            ))}
          </div>
        ));
      })()}

      {/* Breed premium justification */}
      {herd.breedPremiumOverride != null && herd.breedPremiumJustification && (
        <p className="px-4 py-2 text-[10px] text-[#271F16]/70" style={{ backgroundColor: "rgba(255, 170, 0, 0.10)", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
          <span className="font-medium text-[#271F16]/45">Baseline breed premium:</span> <span className="font-semibold text-[#271F16]">{herd.baseBreedPremium >= 0 ? "+" : ""}{herd.baseBreedPremium}%</span> <span className="mx-1.5 text-[#271F16]/20">|</span> <span className="font-medium text-[#271F16]/45">Custom breed premium:</span> <span className="font-bold text-[#FFAA00]">{herd.breedPremiumOverride >= 0 ? "+" : ""}{herd.breedPremiumOverride}%</span> <span className="mx-1.5 text-[#271F16]/20">|</span> <span className="font-medium text-[#271F16]/45">Justification:</span> <span className="text-[#271F16]">{herd.breedPremiumJustification}</span>
        </p>
      )}
    </div>
  );
}

// -- Main template ------------------------------------------------------------

export function AssetRegisterTemplate({ data, movementSummary }: { data: ReportData; movementSummary?: PortfolioMovementSummary | null }) {
  const { executiveSummary, herdData, herdComposition, userDetails, properties, dateRange } = data;

  const grouped = new Map<string, HerdReportData[]>();
  for (const h of herdData) {
    const key = h.propertyName ?? "Unassigned";
    const arr = grouped.get(key) ?? [];
    arr.push(h);
    grouped.set(key, arr);
  }

  const totalHead = herdData.reduce((s, h) => s + h.headCount, 0);
  const totalValue = herdData.reduce((s, h) => s + h.netValue, 0);

  return (
    <>
      <ReportPrintStyles />
      <PrintActions />

      <div className="report-page font-sans text-[#271F16]">

        {/* Logo + title: text baseline aligned with bottom of logo */}
        <div className="flex items-end justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sw-logo-light.svg" alt="Stockman's Wallet" className="h-16 w-auto" />
          <p className="text-3xl font-bold leading-none" style={{ color: "#271F16", paddingBottom: "2px" }}>Asset Register</p>
        </div>

        {/* Executive Summary: full width */}
        {executiveSummary && (
          <div className="mt-4 overflow-hidden rounded-xl">
            <div className="px-5 py-4" style={{ backgroundColor: "#271F16" }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-white/70">Executive Summary</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-white">{fmt(executiveSummary.totalPortfolioValue)}</p>
            </div>
            <div className="grid grid-cols-4 gap-x-4 border-x border-b border-[#8B7355]/25 px-5 py-3" style={{ borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Head Count</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#271F16]">{executiveSummary.totalHeadCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Avg per Head</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#271F16]">{fmt(executiveSummary.averageValuePerHead)}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Valuation Date</p>
                <p className="mt-0.5 text-sm font-medium tabular-nums text-[#271F16]/80">{fmtDate(executiveSummary.valuationDate)}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Report Period</p>
                <p className="mt-0.5 text-sm font-medium tabular-nums text-[#271F16]/80">{fmtDate(dateRange.start)}</p>
                <p className="text-sm font-medium tabular-nums text-[#271F16]/80">{fmtDate(dateRange.end)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Details row: Producer/Properties + Herd Composition side by side */}
        <div className="mt-4" style={{ display: "flex", gap: "16px" }}>
          {/* Producer and properties */}
          {userDetails && (
            <div style={{ flex: 1, borderRadius: "12px", border: "1px solid rgba(139, 115, 85, 0.25)", padding: "16px 20px" }}>
              <div className="mb-3">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B5B45]">Producer</p>
                <p className="mt-0.5 text-base font-semibold text-[#271F16]">{userDetails.preparedFor}</p>
              </div>
              {properties.length > 0 && (
                <div className="border-t border-[#8B7355]/25 pt-3">
                  <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#6B5B45]">
                    {properties.length > 1 ? "Properties" : "Property"}
                  </p>
                  <div className="flex flex-col gap-1">
                    {properties.map((p) => (
                      <div key={p.name} className="text-sm">
                        <span className="font-medium text-[#271F16]">{p.name}</span>
                        {p.picCode && <span className="ml-2 text-xs text-[#271F16]/50">PIC: {p.picCode}</span>}
                        {p.state && <span className="ml-2 text-xs text-[#271F16]/50">{p.state}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Herd Composition */}
          {herdComposition.length > 0 && (
            <div style={{ flex: 1, borderRadius: "12px", border: "1px solid rgba(139, 115, 85, 0.25)", padding: "16px 20px" }}>
              <p className="mb-3 text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Herd Composition</p>
              <div className="flex items-center gap-4">
                <DonutChart items={herdComposition.map((c) => ({ label: c.assetClass, percentage: c.percentage }))} />
                <div className="flex flex-1 flex-col gap-0.5 text-xs">
                  {herdComposition.map((c, i) => (
                    <div key={c.assetClass} className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLOURS[i % CHART_COLOURS.length] }} />
                      <span className="flex-1 text-[#271F16]/80">{c.assetClass}</span>
                      <span className="tabular-nums text-[#271F16]/50">{c.headCount}</span>
                      <span className="w-10 text-right tabular-nums font-medium text-[#271F16]">{c.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PORTFOLIO MOVEMENT */}
        {movementSummary && (
          <section className="mt-5">
            {/* Keep the section heading, date range, and the exec stat card as one unit
                so a page break cannot clip the card away from its own label. */}
            <div className="break-inside-avoid">
              <h2 className="mb-2 text-base font-bold text-[#271F16]">Portfolio Movement</h2>
              <p className="mb-3 text-xs text-[#6B5B45]">{fmtDate(movementSummary.openingDate)} to {fmtDate(movementSummary.closingDate)}</p>

              {/* Executive movement stats */}
              <div className="mb-3 grid grid-cols-4 gap-3 rounded-xl border border-[#8B7355]/25 px-5 py-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Opening Value</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-[#271F16]">{fmt(movementSummary.openingValue)}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Closing Value</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-[#271F16]">{fmt(movementSummary.closingValue)}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Net Change</p>
                <p className={`mt-0.5 text-base font-bold tabular-nums ${movementSummary.netChangeDollars >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {fmt(movementSummary.netChangeDollars)}
                </p>
                {movementSummary.netChangePercent != null && (
                  <p className={`text-[11px] font-medium tabular-nums ${movementSummary.netChangeDollars >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {movementSummary.netChangePercent >= 0 ? "+" : ""}{movementSummary.netChangePercent.toFixed(1)}%
                  </p>
                )}
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Head Count</p>
                <p className="mt-0.5 text-sm tabular-nums text-[#271F16]">{movementSummary.openingHeadCount} → {movementSummary.closingHeadCount}</p>
              </div>
              </div>
            </div>

            {/* Movement bridge */}
            <div className="mb-3 break-inside-avoid rounded-xl border border-[#8B7355]/25">
              <div className="px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]" style={{ backgroundColor: "rgba(139, 115, 85, 0.10)" }}>Movement Bridge</div>
              <div className="flex flex-col">
                <BridgeRow label="Opening Portfolio Value" value={movementSummary.openingValue} isTotal />
                <BridgeRow label="Additions" value={movementSummary.additionsValue} />
                <BridgeRow label="Removals/Sales" value={-movementSummary.removalsValue} />
                <BridgeRow label="Market Movement" value={movementSummary.marketMovement} />
                <BridgeRow label="Weight Gain" value={movementSummary.biologicalMovement.weightGain} />
                <BridgeRow label="Breeding Accrual" value={movementSummary.biologicalMovement.breedingAccrual} />
                <BridgeRow label="Mortality" value={movementSummary.biologicalMovement.mortality} />
                {Math.abs(movementSummary.assumptionChanges) > 1 && (
                  <BridgeRow label="Other / Assumptions" value={movementSummary.assumptionChanges} />
                )}
                <BridgeRow label="Closing Portfolio Value" value={movementSummary.closingValue} isTotal />
              </div>
            </div>

            {/* Like-for-like */}
            <div className="mb-3 break-inside-avoid rounded-xl border border-[#8B7355]/25 px-5 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">
                Like-for-Like <span className="font-normal normal-case tracking-normal text-[#8B7355]">(Excludes buy/sell)</span>
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Opening</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#271F16]">{fmt(movementSummary.likeForLikeOpeningValue)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Closing</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#271F16]">{fmt(movementSummary.likeForLikeClosingValue)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Change</p>
                  <p className={`mt-0.5 text-sm font-bold tabular-nums ${movementSummary.likeForLikeChangeDollars >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {fmt(movementSummary.likeForLikeChangeDollars)}
                    {movementSummary.likeForLikeChangePercent != null && <span className="ml-1 text-xs font-medium">({movementSummary.likeForLikeChangePercent >= 0 ? "+" : ""}{movementSummary.likeForLikeChangePercent.toFixed(1)}%)</span>}
                  </p>
                </div>
              </div>
              <p className="mt-3 border-t border-[#8B7355]/20 pt-2 text-[10px] leading-snug text-[#271F16]/55">
                Excludes herds added or removed during the period and shows how the existing portfolio changed on a comparable basis through market and biological movements.
              </p>
            </div>

            {/* Movement by herd - per-driver breakdown */}
            {movementSummary.herdMovements.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-[#8B7355]/25">
                <div className="flex items-center justify-between px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]" style={{ backgroundColor: "rgba(139, 115, 85, 0.10)" }}>
                  <span>Movement by Herd</span>
                  <span className="font-normal normal-case tracking-normal text-[9px]">Per-driver breakdown</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#8B7355]/20 text-left text-[8px] font-semibold uppercase tracking-wider text-[#6B5B45]">
                      <th className="px-4 py-1.5">Herd</th>
                      <th className="px-2 py-1.5 text-right">Market</th>
                      <th className="px-2 py-1.5 text-right">DWG</th>
                      <th className="px-2 py-1.5 text-right">Breeding</th>
                      <th className="px-2 py-1.5 text-right">Mortality</th>
                      <th className="px-2 py-1.5 text-right">Head Δ</th>
                      <th className="px-2 py-1.5 text-right">Premium</th>
                      <th className="px-4 py-1.5 text-right">Net Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementSummary.herdMovements.map((m) => {
                      const headDelta = m.closingHeadCount - m.openingHeadCount;
                      const headCell = m.mainDriver === "Added"
                        ? `New +${m.closingHeadCount}`
                        : m.mainDriver === "Removed/Sold"
                          ? `-${m.openingHeadCount}`
                          : headDelta === 0
                            ? `${m.openingHeadCount}`
                            : `${m.openingHeadCount}→${m.closingHeadCount}`;
                      const premiumCell = m.currentBreedPremium === 0
                        ? "-"
                        : `${m.currentBreedPremium > 0 ? "+" : ""}${m.currentBreedPremium.toFixed(0)}%`;
                      return (
                        <tr key={m.id} className="break-inside-avoid border-b border-[#8B7355]/10">
                          <td className="px-4 py-1.5 font-medium text-[#271F16]">{m.herdName}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${driverTone(m.marketComponent)}`}>{driverCellText(m.marketComponent)}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${driverTone(m.weightGainComponent)}`}>{driverCellText(m.weightGainComponent)}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${driverTone(m.breedingComponent)}`}>{driverCellText(m.breedingComponent)}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${driverTone(m.mortalityComponent)}`}>{driverCellText(m.mortalityComponent)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-[#271F16]/70">{headCell}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-[#271F16]/70">{premiumCell}</td>
                          <td className={`px-4 py-1.5 text-right font-semibold tabular-nums ${m.dollarChange >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(m.dollarChange)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* LIVESTOCK ASSETS */}
        <section className="mt-5">
          <h2 className="mb-2 text-base font-bold text-[#271F16]">Livestock Assets</h2>

          {[...grouped.entries()].map(([propertyName, herds]) => (
            <div key={propertyName} className="mb-4">
              <div className="mb-1.5 flex items-center justify-between px-4 py-2" style={{ backgroundColor: "#271F16", borderRadius: "9999px" }}>
                <h3 className="text-sm font-semibold text-white">{propertyName}</h3>
                <p className="text-xs tabular-nums text-white/60">
                  {herds.reduce((s, h) => s + h.headCount, 0).toLocaleString()} head &middot; <span className="font-semibold text-[#FFAA00]">{fmt(herds.reduce((s, h) => s + h.netValue, 0))}</span>
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                {herds.map((h) => (
                  <HerdCard key={h.id} herd={h} />
                ))}
              </div>
            </div>
          ))}

          {/* Grand total */}
          <div className="mt-3 flex items-center justify-between pt-2">
            <p className="text-sm font-bold text-[#271F16]">TOTAL</p>
            <div className="flex items-center gap-6">
              <p className="text-xs tabular-nums text-[#271F16]/60">{totalHead.toLocaleString()} head</p>
              <p className="text-sm font-bold tabular-nums text-[#271F16]">{fmtFull(totalValue)}</p>
            </div>
          </div>
        </section>

        {/* End-of-report footer (inline, always visible) */}
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

// -- Small helpers ------------------------------------------------------------

function BridgeRow({ label, value, isTotal }: { label: string; value: number; isTotal?: boolean }) {
  const absFormatted = fmt(Math.abs(value));
  const display = isTotal ? absFormatted : value >= 0 ? `+${absFormatted}` : `-${absFormatted}`;
  const color = isTotal ? "text-[#271F16]" : value > 0 ? "text-emerald-700" : value < 0 ? "text-red-700" : "text-[#6B5B45]";
  return (
    <div className={`flex items-center justify-between px-4 py-1.5 ${isTotal ? "font-semibold" : ""}`} style={isTotal ? { backgroundColor: "rgba(139, 115, 85, 0.08)" } : undefined}>
      <span className={`text-xs ${isTotal ? "font-semibold text-[#271F16]" : "text-[#271F16]/80"}`}>{label}</span>
      <span className={`text-xs tabular-nums ${isTotal ? "font-semibold" : "font-medium"} ${color}`}>{display}</span>
    </div>
  );
}

function PrintStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B5B45]">{label}</p>
      <p className={`text-xs font-semibold tabular-nums ${accent ? "text-[#FFAA00]" : "text-[#271F16]"}`}>{value}</p>
    </div>
  );
}

function driverCellText(value: number) {
  if (value === 0) return "-";
  return `${value > 0 ? "+" : ""}${fmt(value)}`;
}

function driverTone(value: number) {
  if (value > 0) return "text-emerald-700";
  if (value < 0) return "text-red-700";
  return "text-[#271F16]/40";
}

