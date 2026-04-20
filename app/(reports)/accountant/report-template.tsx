import type { ReportData } from "@/lib/types/reports";
import { ReportPrintStyles } from "../asset-register/print-styles";

// Formatters
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

function fmtGeneratedAt(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date}, ${time}`;
}

export function AccountantReportTemplate({ data }: { data: ReportData }) {
  const snap = data.accountantSnapshot;
  const { userDetails } = data;

  if (!snap) {
    return (
      <>
        <ReportPrintStyles />
        <div className="report-page font-sans text-[#271F16]">
          <p className="text-sm text-[#6B5B45]">No accountant data available.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <ReportPrintStyles />
      <div className="report-page font-sans text-[#271F16]">
        {/* Logo + title */}
        <div className="flex items-end justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sw-logo-light.svg" alt="Stockman's Wallet" className="h-16 w-auto" />
          <p className="text-3xl font-bold leading-none" style={{ color: "#271F16", paddingBottom: "2px" }}>
            Accountant Report
          </p>
        </div>

        {/* Statement header */}
        <div className="mt-4 overflow-hidden rounded-xl">
          <div className="px-5 py-4" style={{ backgroundColor: "#271F16" }}>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/70">
              Financial Year Reconciliation
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-white">{snap.financialYearShortTitle}</p>
            <p className="mt-0.5 text-sm text-white/60">{snap.financialYearLabel}</p>
          </div>
          <div
            className="grid grid-cols-3 gap-x-4 border-x border-b border-[#8B7355]/25 px-5 py-3"
            style={{ borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}
          >
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Period Start</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums text-[#271F16]/80">{fmtDate(snap.periodStart)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Period End</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums text-[#271F16]/80">{fmtDate(snap.periodEnd)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Generated</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums text-[#271F16]/80">{fmtGeneratedAt(snap.generatedAt)}</p>
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
            </div>
          </div>
        )}

        {/* Statement rows */}
        <section className="mt-5">
          <h2 className="mb-2 text-base font-bold text-[#271F16]">Reconciliation Statement</h2>

          <div className="rounded-xl border border-[#8B7355]/25">
            <StatementRow label="Opening Book Value" amount={snap.openingBookValue} />
            <StatementRow label="Purchases Recorded" amount={snap.purchasesRecorded} />
            <StatementRow label="Sales Recorded" amount={snap.salesRecorded} />
            <StatementRow label="Modelled Closing Book Position" amount={snap.modelledClosingBookPosition} />
            <StatementRow label="Market Value (at Period End)" amount={snap.marketValuationAtYearEnd} />
            <StatementRow label="Closing Book Value" amount={snap.marketMinusBookDifference} emphasis isLast />
          </div>

          <p className="mt-4 text-[10px] leading-relaxed text-[#271F16]/55">
            Notes: Purchases are currently estimated from herds created during the selected financial
            year. Sales are derived from recorded Stockman&apos;s Wallet sales transactions. Market
            values use the latest available saleyard prices at the period end.
          </p>
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

function StatementRow({
  label,
  amount,
  emphasis,
  isLast,
}: {
  label: string;
  amount: number;
  emphasis?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3 ${!isLast ? "border-b border-[#8B7355]/15" : ""}`}
      style={emphasis ? { backgroundColor: "rgba(139, 115, 85, 0.08)" } : undefined}
    >
      <span
        className={`text-sm ${
          emphasis ? "font-semibold text-[#271F16]" : "text-[#271F16]/80"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-sm tabular-nums ${
          emphasis ? "font-semibold text-[#271F16]" : "text-[#271F16]/80"
        }`}
      >
        {fmtFull(amount)}
      </span>
    </div>
  );
}
