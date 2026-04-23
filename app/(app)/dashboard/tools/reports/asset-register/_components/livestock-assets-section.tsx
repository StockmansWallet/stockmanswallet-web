import { Card, CardContent } from "@/components/ui/card";
import type { HerdReportData } from "@/lib/types/reports";
import { fmt, fmtDate, fmtFull } from "./format";
import { shortSaleyardName } from "@/lib/data/reference-data";

// Human-readable valuation source line for a herd, eg:
//   "MLA · Armidale Regional Saleyards · 18 Apr 2026"
//   "MLA National Indicator · 18 Apr 2026"
//   "Default fallback (no recent MLA data)"
function valuationSourceLabel(h: HerdReportData): string {
  const datePart = h.dataDate ? ` · ${fmtDate(h.dataDate)}` : "";
  if (h.priceSource === "saleyard" && h.saleyardUsed) {
    return `MLA · ${shortSaleyardName(h.saleyardUsed)} saleyard${datePart}`;
  }
  if (h.priceSource === "national") {
    return `MLA · National indicator${datePart}`;
  }
  return "Default fallback (no recent MLA data)";
}

export function LivestockAssetsSection({ herdData }: { herdData: HerdReportData[] }) {
  // Group herds by property name
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
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">Livestock Assets</h3>

      <div className="flex flex-col gap-4">
        {[...grouped.entries()].map(([propertyName, herds]) => (
          <PropertyGroup key={propertyName} propertyName={propertyName} herds={herds} />
        ))}
      </div>

      {/* Grand total */}
      <div className="mt-4 flex items-center justify-between rounded-full bg-white/[0.06] px-4 py-3 backdrop-blur-md">
        <p className="text-xs font-bold uppercase tracking-wider text-white/60">Total</p>
        <span className="text-sm tabular-nums text-white/60">
          {totalHead.toLocaleString()} head &middot; <span className="text-base font-bold text-reports">{fmt(totalValue)}</span>
        </span>
      </div>
    </div>
  );
}

function PropertyGroup({ propertyName, herds }: { propertyName: string; herds: HerdReportData[] }) {
  const propertyHead = herds.reduce((s, h) => s + h.headCount, 0);
  const propertyValue = herds.reduce((s, h) => s + h.netValue, 0);

  return (
    <div>
      {/* Property header - dark bar */}
      <div className="mb-2 flex items-center justify-between rounded-full bg-white/[0.06] px-4 py-2.5 backdrop-blur-md">
        <h4 className="text-sm font-semibold text-white">{propertyName}</h4>
        <span className="text-xs tabular-nums text-white/60">
          {propertyHead.toLocaleString()} head &middot; <span className="font-semibold text-reports">{fmt(propertyValue)}</span>
        </span>
      </div>

      {/* Herd cards */}
      <div className="flex flex-col gap-2">
        {herds.map((h) => (
          <HerdCard key={h.id} herd={h} />
        ))}
      </div>
    </div>
  );
}

function HerdCard({ herd: h }: { herd: HerdReportData }) {
  const calvingPct = h.calvingRate > 1 ? h.calvingRate : h.calvingRate * 100;
  const mortalityPct = h.mortalityRate > 1 ? h.mortalityRate : h.mortalityRate * 100;

  const extras: { label: string; value: string; accent?: boolean }[] = [];
  extras.push({ label: "Avg per Head", value: fmtFull(h.netValue / h.headCount) });
  if (h.dailyWeightGain > 0) {
    extras.push({ label: "DWG", value: `${h.dailyWeightGain.toFixed(2)} kg/day` });
  }
  if (h.isBreeder && calvingPct > 0) {
    extras.push({ label: "Calving", value: `${calvingPct.toFixed(0)}%` });
  }
  if (h.breedingAccrual != null && h.breedingAccrual > 0) {
    extras.push({ label: "Calf Accrual", value: fmtFull(h.breedingAccrual) });
  }
  if (mortalityPct > 0) {
    extras.push({ label: "Mortality", value: `${mortalityPct.toFixed(1)}% p.a.` });
  }
  if (h.baseBreedPremium !== 0) {
    extras.push({ label: "Breed Premium", value: `${h.baseBreedPremium >= 0 ? "+" : ""}${h.baseBreedPremium}%` });
  }
  if (h.breedPremiumOverride != null) {
    extras.push({ label: "Custom Breed Premium", value: `${h.breedPremiumOverride >= 0 ? "+" : ""}${h.breedPremiumOverride}%`, accent: true });
  }

  // Break extras into rows of 4 for the grid layout
  const extraRows: (typeof extras)[] = [];
  for (let i = 0; i < extras.length; i += 4) {
    extraRows.push(extras.slice(i, i + 4));
  }

  return (
    <Card className="overflow-hidden">
      {/* Header: tinted row with name + category inline | value */}
      <div className="flex items-center justify-between bg-white/[0.04] px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="truncate text-sm font-semibold text-text-primary">{h.name}</h5>
            <p className="shrink-0 text-xs text-text-muted">{h.category}</p>
          </div>
          {h.livestockOwner && (
            <p className="mt-0.5 text-[11px] text-text-muted">
              <span className="text-text-muted/70">Livestock Owner:</span>{" "}
              <span className="text-text-secondary">{h.livestockOwner}</span>
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-text-muted">
            <span className="text-text-muted/70">Valuation source:</span>{" "}
            <span className="text-text-secondary">{valuationSourceLabel(h)}</span>
          </p>
        </div>
        <p className="ml-3 shrink-0 text-base font-bold tabular-nums text-text-primary">{fmtFull(h.netValue)}</p>
      </div>

      {/* Core metrics: 4-column grid */}
      <CardContent className="px-4 py-2">
        <div className="grid grid-cols-4 gap-x-3">
          <Stat label="Head Count" value={`${h.headCount}`} />
          <Stat label="Age" value={`${h.ageMonths} months`} />
          <Stat label="Weight" value={`${h.weight.toFixed(2)} kg`} />
          <Stat label="Price" value={`$${h.pricePerKg.toFixed(4)}/kg`} />
        </div>

        {/* Supplementary metrics: rows of 4 */}
        {extraRows.map((row, ri) => (
          <div key={ri} className="mt-1.5 grid grid-cols-4 gap-x-3 border-t border-white/[0.04] pt-1.5">
            {row.map((e) => (
              <Stat key={e.label} label={e.label} value={e.value} accent={e.accent} />
            ))}
          </div>
        ))}

        {/* Breed premium justification */}
        {h.breedPremiumOverride != null && h.breedPremiumJustification && (
          <p className="-mx-4 -mb-2 mt-1.5 bg-reports/[0.06] px-4 py-2 text-[11px] text-text-secondary">
            <span className="font-medium text-text-muted">Baseline breed premium:</span> <span className="font-semibold text-text-primary">{h.baseBreedPremium >= 0 ? "+" : ""}{h.baseBreedPremium}%</span> <span className="mx-1.5 text-white/20">|</span> <span className="font-medium text-text-muted">Custom breed premium:</span> <span className="font-bold text-reports">{h.breedPremiumOverride >= 0 ? "+" : ""}{h.breedPremiumOverride}%</span> <span className="mx-1.5 text-white/20">|</span> <span className="font-medium text-text-muted">Justification:</span> <span className="text-text-primary">{h.breedPremiumJustification}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${accent ? "text-reports" : "text-text-primary"}`}>{value}</p>
    </div>
  );
}
