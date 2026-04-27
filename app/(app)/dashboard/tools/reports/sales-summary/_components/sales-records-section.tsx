import { Card, CardContent } from "@/components/ui/card";
import type { SaleReportData } from "@/lib/types/reports";
import { formatDateAU, parseLocalDate } from "@/lib/dates";

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

function fmtFull(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

const fmtDate = formatDateAU;

function monthKey(iso: string) {
  const d = parseLocalDate(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(+y, +m - 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export function SalesRecordsSection({ salesData }: { salesData: SaleReportData[] }) {
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

  const totalHead = salesData.reduce((s, r) => s + r.headCount, 0);
  const totalNet = salesData.reduce((s, r) => s + r.netValue, 0);

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">Sales Records</h3>

      <div className="flex flex-col gap-4">
        {orderedGroups.map(({ key, rows }) => (
          <MonthGroup key={key} label={monthLabel(key)} sales={rows} />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-full border border-white/[0.08] bg-white/[0.03] bg-clip-padding px-4 py-3 backdrop-blur-xl">
        <p className="text-xs font-bold uppercase tracking-wider text-white/60">Total</p>
        <span className="text-sm tabular-nums text-white/60">
          {totalHead.toLocaleString()} head &middot;{" "}
          <span className="text-base font-bold text-reports">{fmt(totalNet)}</span>
        </span>
      </div>
    </div>
  );
}

function MonthGroup({ label, sales }: { label: string; sales: SaleReportData[] }) {
  const groupHead = sales.reduce((s, r) => s + r.headCount, 0);
  const groupNet = sales.reduce((s, r) => s + r.netValue, 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between rounded-full border border-white/[0.08] bg-white/[0.03] bg-clip-padding px-4 py-2.5 backdrop-blur-xl">
        <h4 className="text-sm font-semibold text-white">{label}</h4>
        <span className="text-xs tabular-nums text-white/60">
          {groupHead.toLocaleString()} head &middot;{" "}
          <span className="font-semibold text-reports">{fmt(groupNet)}</span>
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {sales.map((s) => (
          <SaleCard key={s.id} sale={s} />
        ))}
      </div>
    </div>
  );
}

function SaleCard({ sale: s }: { sale: SaleReportData }) {
  const priceValue = s.pricingType === "per_kg"
    ? `$${s.pricePerKg.toFixed(2)}/kg`
    : `$${(s.pricePerHead ?? 0).toFixed(0)}/hd`;

  const extras: { label: string; value: string }[] = [];
  extras.push({ label: "Gross", value: fmtFull(s.grossValue) });
  if (s.saleType) extras.push({ label: "Sale Type", value: s.saleType });
  if (s.saleLocation) extras.push({ label: "Location", value: s.saleLocation });
  extras.push({ label: "Pricing", value: s.pricingType === "per_kg" ? "Per kg" : "Per head" });

  const extraRows: (typeof extras)[] = [];
  for (let i = 0; i < extras.length; i += 4) {
    extraRows.push(extras.slice(i, i + 4));
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between bg-white/[0.04] px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="truncate text-sm font-semibold text-text-primary">{s.herdName ?? "Unknown herd"}</h5>
            <p className="shrink-0 text-xs text-text-muted">{fmtDate(s.date)}</p>
          </div>
        </div>
        <p className="ml-3 shrink-0 text-base font-bold tabular-nums text-text-primary">{fmtFull(s.netValue)}</p>
      </div>

      <CardContent className="px-4 py-2">
        <div className="grid grid-cols-4 gap-x-3">
          <Stat label="Head" value={s.headCount.toLocaleString()} />
          <Stat label="Avg Wt" value={`${s.avgWeight.toFixed(0)} kg`} />
          <Stat label="Price" value={priceValue} />
          <Stat label="Freight" value={fmt(s.freightCost)} />
        </div>

        {extraRows.map((row, ri) => (
          <div key={ri} className="mt-1.5 grid grid-cols-4 gap-x-3 border-t border-white/[0.04] pt-1.5">
            {row.map((e) => (
              <Stat key={e.label} label={e.label} value={e.value} />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">{value}</p>
    </div>
  );
}
