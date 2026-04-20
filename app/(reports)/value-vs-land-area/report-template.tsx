import type { ReportData } from "@/lib/types/reports";
import { ReportPrintStyles } from "../asset-register/print-styles";

// ---------- Formatters -------------------------------------------------------

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

function fmtAcres(v: number) {
  return `${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(v)} ac`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------- Template ---------------------------------------------------------

export function ValueVsLandAreaTemplate({ data }: { data: ReportData }) {
  const { landValueAnalysis: rows, userDetails, dateRange } = data;

  if (rows.length === 0) {
    return (
      <>
        <ReportPrintStyles />
        <div className="report-page font-sans text-[#271F16]">
          <p className="text-sm text-[#6B5B45]">
            No properties with acreage and livestock available for this report.
          </p>
        </div>
      </>
    );
  }

  const totalAcreage = rows.reduce((s, r) => s + r.acreage, 0);
  const totalValue = rows.reduce((s, r) => s + r.livestockValue, 0);
  const totalHead = rows.reduce((s, r) => s + r.totalHeadCount, 0);
  const avgPerAcre = totalAcreage > 0 ? totalValue / totalAcreage : 0;
  const best = rows[0];

  return (
    <>
      <ReportPrintStyles />

      <div className="report-page font-sans text-[#271F16]">
        {/* Logo + title */}
        <div className="flex items-end justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sw-logo-light.svg" alt="Stockman's Wallet" className="h-16 w-auto" />
          <p className="text-3xl font-bold" style={{ color: "#271F16" }}>
            Value vs Land Area
          </p>
        </div>

        {/* Executive Summary */}
        <div className="mt-4 overflow-hidden rounded-xl">
          <div className="px-5 py-4" style={{ backgroundColor: "#271F16" }}>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/70">
              Total Livestock Value
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-white">{fmtFull(totalValue)}</p>
            <p className="mt-0.5 text-sm text-white/60">
              across {fmtAcres(totalAcreage)}
            </p>
          </div>
          <div
            className="grid grid-cols-4 gap-x-4 border-x border-b border-[#8B7355]/25 px-5 py-3"
            style={{ borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}
          >
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Avg $/Acre</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#271F16]">{fmt(avgPerAcre)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Properties</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#271F16]">{rows.length}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Head</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#271F16]">
                {totalHead.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Best Density</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#271F16]">{fmt(best.valuePerAcre)}</p>
              <p className="text-[10px] text-[#271F16]/50">{best.propertyName}</p>
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
                <p className="mt-0.5 text-sm text-[#271F16]">
                  {fmtDate(dateRange.start)} - {fmtDate(dateRange.end)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Full Table */}
        <section className="mt-5">
          <h2 className="mb-2 text-base font-bold text-[#271F16]">Property Breakdown</h2>

          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-[#8B7355]/30 text-[#6B5B45]">
                <th className="pb-1.5 pr-2 text-left font-semibold">#</th>
                <th className="pb-1.5 pr-2 text-left font-semibold">Property</th>
                <th className="pb-1.5 pr-2 text-right font-semibold">Acreage</th>
                <th className="pb-1.5 pr-2 text-right font-semibold">Head</th>
                <th className="pb-1.5 pr-2 text-right font-semibold">Livestock Value</th>
                <th className="pb-1.5 text-right font-semibold">$/Acre</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isFirst = i === 0;
                return (
                  <tr
                    key={row.propertyName}
                    className="border-b border-[#8B7355]/15"
                    style={isFirst ? { backgroundColor: "rgba(255, 170, 0, 0.08)" } : {}}
                  >
                    <td
                      className={`py-1.5 pr-2 tabular-nums ${
                        isFirst ? "font-bold text-[#FFAA00]" : "text-[#6B5B45]"
                      }`}
                    >
                      {i + 1}
                    </td>
                    <td className="py-1.5 pr-2">
                      <p className={`${isFirst ? "font-bold" : "font-medium"} text-[#271F16]`}>
                        {row.propertyName}
                      </p>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-[#271F16]/80">
                      {fmtAcres(row.acreage)}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-[#271F16]/80">
                      {row.totalHeadCount.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-[#271F16]/80">
                      {fmt(row.livestockValue)}
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${
                        isFirst ? "font-bold text-[#271F16]" : "text-[#271F16]"
                      }`}
                    >
                      {fmt(row.valuePerAcre)}
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
            <p>
              Stockman&apos;s Wallet &nbsp;|&nbsp; Intelligent Livestock Valuation &nbsp;|&nbsp;
              www.stockmanswallet.com.au
            </p>
            <p>Generated {fmtDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>
    </>
  );
}
