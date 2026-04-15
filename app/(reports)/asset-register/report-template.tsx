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
    <div className="break-inside-avoid rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      {/* Header: name + value */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-bold text-gray-900">{herd.name}</h4>
          <p className="text-xs text-gray-500">{herd.category}</p>
        </div>
        <p className="ml-4 shrink-0 text-base font-bold tabular-nums text-gray-900">
          {fmtFull(herd.netValue)}
        </p>
      </div>

      {/* Core metrics: structured 4-column grid */}
      <div className="mt-2 grid grid-cols-4 gap-x-3 border-t border-gray-200 pt-2">
        <PrintStat label="Head Count" value={`${herd.headCount}`} />
        <PrintStat label="Age" value={`${herd.ageMonths} months`} />
        <PrintStat label="Weight" value={`${herd.weight.toFixed(0)} kg`} />
        <PrintStat label="Price" value={`$${herd.pricePerKg.toFixed(2)}/kg`} />
      </div>

      {/* Supplementary metrics: only rows with data */}
      {extras.length > 0 && (
        <div className="mt-1.5 grid grid-cols-4 gap-x-3 border-t border-gray-100 pt-1.5">
          {extras.map((e) => (
            <PrintStat key={e.label} label={e.label} value={e.value} />
          ))}
        </div>
      )}
    </div>
  );
}

// -- Main template ------------------------------------------------------------

export function AssetRegisterTemplate({ data }: { data: ReportData }) {
  const { executiveSummary, herdData, herdComposition, userDetails, dateRange } = data;

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

      <div className="report-page font-sans text-gray-900">

        {/* Title + logo + date */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-900">Asset Register</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {fmtDate(dateRange.start)} to {fmtDate(dateRange.end)}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sw-report-logo.png" alt="Stockman's Wallet" className="h-14 w-auto" />
        </div>

        {userDetails && (
          <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 border-t border-gray-200 pt-3">
            <Detail label="Prepared For" value={userDetails.preparedFor} />
            <Detail label="Property" value={userDetails.propertyName} />
            <Detail label="PIC Code" value={userDetails.picCode} />
            <Detail label="Location" value={userDetails.location} />
          </div>
        )}

        {/* SUMMARY ROW: Portfolio value + Composition side by side */}
        {executiveSummary && (
          <div className="mt-4 flex gap-4">
            {/* Executive summary card */}
            <div className="flex-1 rounded border border-gray-200 bg-gray-50 px-5 py-4">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Executive Summary</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-gray-900">{fmtFull(executiveSummary.totalPortfolioValue)}</p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-200 pt-2">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Head Count</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">{executiveSummary.totalHeadCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Avg per Head</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">{fmt(executiveSummary.averageValuePerHead)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Valuation Date</p>
                  <p className="mt-0.5 text-sm font-medium tabular-nums text-gray-700">{fmtDate(executiveSummary.valuationDate)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Report Period</p>
                  <p className="mt-0.5 text-sm font-medium tabular-nums text-gray-700">{fmtDate(dateRange.start)} to {fmtDate(dateRange.end)}</p>
                </div>
              </div>
            </div>

            {/* Composition card */}
            {herdComposition.length > 0 && (
              <div className="flex-1 rounded border border-gray-200 bg-gray-50 px-5 py-4">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-gray-400">Herd Composition</p>
                <div className="flex items-center gap-4">
                  <DonutChart items={herdComposition.map((c) => ({ label: c.assetClass, percentage: c.percentage }))} />
                  <div className="flex flex-1 flex-col gap-0.5 text-xs">
                    {herdComposition.map((c, i) => (
                      <div key={c.assetClass} className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLOURS[i % CHART_COLOURS.length] }} />
                        <span className="flex-1 text-gray-700">{c.assetClass}</span>
                        <span className="tabular-nums text-gray-500">{c.headCount}</span>
                        <span className="w-10 text-right tabular-nums font-medium text-gray-900">{c.percentage.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LIVESTOCK ASSETS */}
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-bold text-gray-900">Livestock Assets</h2>

          {[...grouped.entries()].map(([propertyName, herds]) => (
            <div key={propertyName} className="mb-4">
              <div className="mb-1.5 flex items-center justify-between rounded bg-gray-100 px-3 py-1.5">
                <h3 className="text-xs font-bold text-gray-800">{propertyName}</h3>
                <p className="text-[10px] tabular-nums text-gray-500">
                  {herds.reduce((s, h) => s + h.headCount, 0).toLocaleString()} head &middot; <span className="font-semibold text-gray-800">{fmt(herds.reduce((s, h) => s + h.netValue, 0))}</span>
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
          <div className="mt-3 flex items-center justify-between border-t-2 border-gray-900 pt-2">
            <p className="text-sm font-bold text-gray-900">TOTAL</p>
            <div className="flex items-center gap-6">
              <p className="text-xs tabular-nums text-gray-600">{totalHead.toLocaleString()} head</p>
              <p className="text-sm font-bold tabular-nums text-gray-900">{fmtFull(totalValue)}</p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-6 border-t border-gray-300 pt-2 text-[7px] text-gray-400">
          <div className="flex items-center justify-between">
            <p>Stockman&apos;s Wallet &nbsp;|&nbsp; Intelligent Livestock Valuation &nbsp;|&nbsp; www.stockmanswallet.com.au</p>
            <p>Generated {fmtDate(new Date().toISOString())}</p>
          </div>
        </footer>
      </div>
    </>
  );
}

// -- Small helpers ------------------------------------------------------------

function PrintStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-xs font-semibold tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
