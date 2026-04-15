import type { ReportData, HerdReportData } from "@/lib/types/reports";
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
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444",
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

  const extras: { label: string; value: string }[] = [];
  if (herd.breedPremiumApplied !== 0) {
    extras.push({ label: "Breed Adj.", value: `${herd.breedPremiumApplied >= 0 ? "+" : ""}${herd.breedPremiumApplied}%` });
  }
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

  return (
    <div className="break-inside-avoid overflow-hidden rounded-xl border border-[#271F16]/15">
      {/* Header: name + value with background */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: "rgba(39, 31, 22, 0.15)" }}>
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-bold text-[#271F16]">{herd.name}</h4>
          <p className="text-xs text-[#271F16]/60">{herd.category}</p>
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

      {/* Supplementary metrics: only rows with data */}
      {extras.length > 0 && (
        <div className="grid grid-cols-4 gap-x-3 border-t border-[#271F16]/10 px-4 py-2">
          {extras.map((e) => (
            <PrintStat key={e.label} label={e.label} value={e.value} />
          ))}
        </div>
      )}

      {/* Breed premium justification */}
      {herd.breedPremiumJustification && (
        <p className="border-t border-[#271F16]/10 px-4 py-2 text-[10px] italic text-[#271F16]/50">
          {herd.breedPremiumJustification}
        </p>
      )}
    </div>
  );
}

// -- Main template ------------------------------------------------------------

export function AssetRegisterTemplate({ data }: { data: ReportData }) {
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

        {/* Logo + title */}
        <div className="flex items-end justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sw-logo-light.svg" alt="Stockman's Wallet" className="h-16 w-auto" />
          <p className="text-3xl font-bold" style={{ color: "#271F16" }}>Asset Register</p>
        </div>

        {/* Executive Summary: full width */}
        {executiveSummary && (
          <div className="mt-4 overflow-hidden rounded-xl">
            <div className="px-5 py-4" style={{ backgroundColor: "#271F16" }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-white/70">Executive Summary</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-white">{fmtFull(executiveSummary.totalPortfolioValue)}</p>
            </div>
            <div className="grid grid-cols-4 gap-x-4 border-x border-b border-[#271F16]/15 px-5 py-3" style={{ borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#271F16]/55">Head Count</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#271F16]">{executiveSummary.totalHeadCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#271F16]/55">Avg per Head</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#271F16]">{fmt(executiveSummary.averageValuePerHead)}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#271F16]/55">Valuation Date</p>
                <p className="mt-0.5 text-sm font-medium tabular-nums text-[#271F16]/80">{fmtDate(executiveSummary.valuationDate)}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#271F16]/55">Report Period</p>
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
            <div style={{ flex: 1, borderRadius: "12px", border: "1px solid rgba(39, 31, 22, 0.15)", padding: "16px 20px" }}>
              <div className="mb-3">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#271F16]/55">Producer</p>
                <p className="mt-0.5 text-base font-semibold text-[#271F16]">{userDetails.preparedFor}</p>
              </div>
              {properties.length > 0 && (
                <div className="border-t border-[#271F16]/15 pt-3">
                  <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#271F16]/55">
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
            <div style={{ flex: 1, borderRadius: "12px", border: "1px solid rgba(39, 31, 22, 0.15)", padding: "16px 20px" }}>
              <p className="mb-3 text-[9px] font-semibold uppercase tracking-widest text-[#271F16]/55">Herd Composition</p>
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

        {/* LIVESTOCK ASSETS */}
        <section className="mt-5">
          <h2 className="mb-2 text-base font-bold text-[#271F16]">Livestock Assets</h2>

          {[...grouped.entries()].map(([propertyName, herds]) => (
            <div key={propertyName} className="mb-4">
              <div className="mb-1.5 flex items-center justify-between rounded-lg px-4 py-2" style={{ backgroundColor: "#271F16" }}>
                <h3 className="text-sm font-semibold text-white">{propertyName}</h3>
                <p className="text-xs tabular-nums text-white/60">
                  {herds.reduce((s, h) => s + h.headCount, 0).toLocaleString()} head &middot; <span className="font-semibold text-white">{fmt(herds.reduce((s, h) => s + h.netValue, 0))}</span>
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
          <div className="mt-3 flex items-center justify-between border-t border-[#271F16]/30 pt-2">
            <p className="text-sm font-bold text-[#271F16]">TOTAL</p>
            <div className="flex items-center gap-6">
              <p className="text-xs tabular-nums text-[#271F16]/60">{totalHead.toLocaleString()} head</p>
              <p className="text-sm font-bold tabular-nums text-[#271F16]">{fmtFull(totalValue)}</p>
            </div>
          </div>
        </section>

        {/* End-of-report footer (inline, always visible) */}
        <div className="mt-6 border-t border-[#271F16]/20 pt-2 text-[7px] text-[#271F16]/55">
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

function PrintStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] font-semibold uppercase tracking-wider text-[#271F16]/55">{label}</p>
      <p className="text-xs font-semibold tabular-nums text-[#271F16]">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#271F16]/55">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[#271F16]">{value}</p>
    </div>
  );
}
