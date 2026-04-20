import type { ReportData, SaleReportData } from "@/lib/types/reports";
import { PrintActions } from "../asset-register/print-actions";
import { ReportPrintStyles } from "../asset-register/print-styles";

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

function parseDate(iso: string) {
  return new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
}

function fmtDate(iso: string) {
  return parseDate(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthKey(iso: string) {
  const d = parseDate(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(+y, +m - 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function RevenueBars({ data }: { data: { month: string; value: number }[] }) {
  if (data.length === 0) return null;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = 120;
  const barWidth = 28;
  const gap = 10;
  const width = data.length * (barWidth + gap);

  return (
    <svg viewBox={`0 0 ${width} ${chartHeight + 28}`} width="100%" className="shrink-0" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const h = (d.value / maxValue) * chartHeight;
        const x = i * (barWidth + gap);
        const y = chartHeight - h;
        return (
          <g key={d.month}>
            <rect x={x} y={y} width={barWidth} height={h} rx="3" fill="#FFAA00" />
            <text x={x + barWidth / 2} y={chartHeight + 12} textAnchor="middle" fontSize="8" fill="#6B5B45">
              {d.month}
            </text>
            <text x={x + barWidth / 2} y={chartHeight + 22} textAnchor="middle" fontSize="7" fill="#271F16" fontWeight="600">
              {`$${Math.round(d.value / 1000)}k`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SaleRow({ sale }: { sale: SaleReportData }) {
  const priceValue = sale.pricingType === "per_kg"
    ? `$${sale.pricePerKg.toFixed(2)}/kg`
    : `$${(sale.pricePerHead ?? 0).toFixed(0)}/hd`;

  const extras: { label: string; value: string }[] = [];
  extras.push({ label: "Gross", value: fmtFull(sale.grossValue) });
  if (sale.saleType) extras.push({ label: "Sale Type", value: sale.saleType });
  if (sale.saleLocation) extras.push({ label: "Location", value: sale.saleLocation });
  extras.push({ label: "Pricing", value: sale.pricingType === "per_kg" ? "Per kg" : "Per head" });

  return (
    <div className="break-inside-avoid overflow-hidden rounded-xl border border-[#8B7355]/25">
      <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: "rgba(139, 115, 85, 0.10)" }}>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h4 className="text-sm font-semibold text-[#271F16]">{sale.herdName ?? "Unknown herd"}</h4>
            <p className="text-xs text-[#271F16]/60">{fmtDate(sale.date)}</p>
          </div>
        </div>
        <p className="ml-4 shrink-0 text-base font-bold tabular-nums text-[#271F16]">{fmtFull(sale.netValue)}</p>
      </div>

      <div className="grid grid-cols-4 gap-x-3 px-4 py-2">
        <PrintStat label="Head" value={sale.headCount.toLocaleString()} />
        <PrintStat label="Avg Wt" value={`${sale.avgWeight.toFixed(0)} kg`} />
        <PrintStat label="Price" value={priceValue} />
        <PrintStat label="Freight" value={fmt(sale.freightCost)} />
      </div>

      <div className="grid grid-cols-4 gap-x-3 border-t border-[#8B7355]/20 px-4 py-2">
        {extras.map((e) => (
          <PrintStat key={e.label} label={e.label} value={e.value} />
        ))}
      </div>
    </div>
  );
}

function PrintStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B5B45]">{label}</p>
      <p className="text-xs font-semibold tabular-nums text-[#271F16]">{value}</p>
    </div>
  );
}

export function SalesSummaryTemplate({ data }: { data: ReportData }) {
  const { salesData, totalSales, userDetails, dateRange } = data;

  const totalGross = salesData.reduce((s, r) => s + r.grossValue, 0);
  const totalFreight = salesData.reduce((s, r) => s + r.freightCost, 0);
  const totalHead = salesData.reduce((s, r) => s + r.headCount, 0);

  const grouped = new Map<string, SaleReportData[]>();
  for (const s of salesData) {
    const key = monthKey(s.date);
    const arr = grouped.get(key) ?? [];
    arr.push(s);
    grouped.set(key, arr);
  }
  const orderedGroups = [...grouped.entries()]
    .map(([key, rows]) => ({
      key,
      rows: [...rows].sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort((a, b) => b.key.localeCompare(a.key));

  const monthlyRevenue = new Map<string, number>();
  for (const sale of salesData) {
    const key = monthKey(sale.date);
    monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + sale.netValue);
  }
  const chartData = [...monthlyRevenue.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const [y, m] = key.split("-");
      const label = new Date(+y, +m - 1).toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
      return { month: label, value: Math.round(value) };
    });

  return (
    <>
      <ReportPrintStyles />
      <PrintActions />

      <div className="report-page font-sans text-[#271F16]">
        {/* Logo + title */}
        <div className="flex items-end justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sw-logo-light.svg" alt="Stockman's Wallet" className="h-16 w-auto" />
          <p className="text-3xl font-bold leading-none" style={{ color: "#271F16", paddingBottom: "2px" }}>Sales Summary</p>
        </div>

        {/* Executive Summary */}
        <div className="mt-4 overflow-hidden rounded-xl">
          <div className="px-5 py-4" style={{ backgroundColor: "#271F16" }}>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/70">Net Sales</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-white">{fmt(totalSales)}</p>
          </div>
          <div className="grid grid-cols-4 gap-x-4 border-x border-b border-[#8B7355]/25 px-5 py-3" style={{ borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Gross Sales</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#271F16]">{fmt(totalGross)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Total Freight</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#271F16]">{fmt(totalFreight)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Head Sold</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#271F16]">{totalHead.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#6B5B45]">Report Period</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums text-[#271F16]/80">{fmtDate(dateRange.start)}</p>
              <p className="text-sm font-medium tabular-nums text-[#271F16]/80">{fmtDate(dateRange.end)}</p>
            </div>
          </div>
        </div>

        {/* Producer */}
        {userDetails && (
          <div className="mt-4 rounded-xl border border-[#8B7355]/25 px-5 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B5B45]">Producer</p>
            <p className="mt-0.5 text-base font-semibold text-[#271F16]">{userDetails.preparedFor}</p>
          </div>
        )}

        {/* Revenue chart */}
        {chartData.length > 1 && (
          <section className="mt-5 break-inside-avoid">
            <h2 className="mb-2 text-base font-bold text-[#271F16]">Revenue by Month</h2>
            <div className="rounded-xl border border-[#8B7355]/25 px-5 py-4">
              <RevenueBars data={chartData} />
            </div>
          </section>
        )}

        {/* Sales records */}
        <section className="mt-5">
          <h2 className="mb-2 text-base font-bold text-[#271F16]">Sales Records</h2>

          {salesData.length === 0 ? (
            <p className="rounded-xl border border-[#8B7355]/25 px-5 py-4 text-sm text-[#271F16]/60">
              No sales records in this date range.
            </p>
          ) : (
            orderedGroups.map(({ key, rows }) => {
              const groupHead = rows.reduce((s, r) => s + r.headCount, 0);
              const groupNet = rows.reduce((s, r) => s + r.netValue, 0);
              return (
                <div key={key} className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between px-4 py-2" style={{ backgroundColor: "#271F16", borderRadius: "9999px" }}>
                    <h3 className="text-sm font-semibold text-white">{monthLabel(key)}</h3>
                    <p className="text-xs tabular-nums text-white/60">
                      {groupHead.toLocaleString()} head &middot; <span className="font-semibold text-[#FFAA00]">{fmt(groupNet)}</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {rows.map((s) => (
                      <SaleRow key={s.id} sale={s} />
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {salesData.length > 0 && (
            <div className="mt-3 flex items-center justify-between pt-2">
              <p className="text-sm font-bold text-[#271F16]">TOTAL</p>
              <div className="flex items-center gap-6">
                <p className="text-xs tabular-nums text-[#271F16]/60">{totalHead.toLocaleString()} head</p>
                <p className="text-sm font-bold tabular-nums text-[#271F16]">{fmtFull(totalSales)}</p>
              </div>
            </div>
          )}
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
