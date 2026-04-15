import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/app/report-filters";
import { parseReportConfig } from "@/lib/utils/report-config";
import { ReportPreviewButton } from "@/components/app/report-preview-button";
import { ReportCompositionChart } from "@/components/app/report-composition-chart";
import { generateAssetRegisterData } from "@/lib/services/report-service";
import { STALE_WARNING_THRESHOLD_DAYS } from "@/lib/engines/valuation-engine";

export const revalidate = 0;
export const metadata = { title: "Asset Register" };

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

function fmtFull(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AssetRegisterPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const config = parseReportConfig(params);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, property_name")
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("property_name");

  const reportData = await generateAssetRegisterData(supabase, user!.id, {
    reportType: "asset-register",
    startDate: config.startDate,
    endDate: config.endDate,
    selectedPropertyIds: config.selectedPropertyIds,
  });

  const { executiveSummary, herdData, herdComposition, userDetails, properties: reportProperties } = reportData;
  const isEmpty = herdData.length === 0;

  // Group herds by property
  const grouped = new Map<string, typeof herdData>();
  for (const h of herdData) {
    const key = h.propertyName ?? "Unassigned";
    const arr = grouped.get(key) ?? [];
    arr.push(h);
    grouped.set(key, arr);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Asset Register"
        titleClassName="text-4xl font-bold text-amber-400"
        subtitle="Complete herd listing with current valuations."
      />

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between rounded-full bg-surface-lowest px-2 py-2">
        <Suspense>
          <ReportFilters properties={properties ?? []} />
        </Suspense>
        {!isEmpty && <ReportPreviewButton reportPath="/asset-register" />}
      </div>

      {/* Producer and property details */}
      {userDetails && !isEmpty && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-text-muted">
          <span>Producer: <span className="font-medium text-text-secondary">{userDetails.preparedFor}</span></span>
          {reportProperties.map((p) => (
            <span key={p.name}>
              &middot; <span className="font-medium text-text-secondary">{p.name}</span>
              {p.picCode && <span className="ml-1 text-text-muted">(PIC: {p.picCode})</span>}
            </span>
          ))}
        </div>
      )}

      {isEmpty ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-text-muted">No active herds found. Add herds to generate your asset register.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">

          {/* Summary row: Executive summary + Herd composition side by side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Executive summary */}
            {executiveSummary && (
              <Card className="border-amber-500/10">
                <CardContent className="px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Executive Summary</p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-amber-400">
                    {fmt(executiveSummary.totalPortfolioValue)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/5 pt-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Head Count</p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-text-primary">{executiveSummary.totalHeadCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Avg per Head</p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-text-primary">{fmt(executiveSummary.averageValuePerHead)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Valuation Date</p>
                      <p className="mt-0.5 text-sm font-medium tabular-nums text-text-secondary">{fmtDate(executiveSummary.valuationDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Report Period</p>
                      <p className="mt-0.5 text-sm font-medium tabular-nums text-text-secondary">{fmtDate(config.startDate)} to {fmtDate(config.endDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Herd composition */}
            {herdComposition.length > 0 && (
              <Card>
                <CardContent className="px-5 py-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Herd Composition</p>
                  <ReportCompositionChart data={herdComposition} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* LIVESTOCK ASSETS: Herd cards grouped by property */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">Livestock Assets</h3>

            <div className="flex flex-col gap-4">
              {[...grouped.entries()].map(([propertyName, herds]) => (
                <div key={propertyName}>
                  {/* Property header */}
                  <div className="mb-2 flex items-center justify-between rounded-lg bg-white/[0.04] px-4 py-2.5">
                    <h4 className="text-sm font-bold text-text-primary">{propertyName}</h4>
                    <span className="text-xs tabular-nums text-text-secondary">
                      {herds.reduce((s, h) => s + h.headCount, 0).toLocaleString()} head &middot; <span className="font-semibold text-amber-400">{fmt(herds.reduce((s, h) => s + h.netValue, 0))}</span>
                    </span>
                  </div>

                  {/* Herd cards */}
                  <div className="flex flex-col gap-2">
                    {herds.map((h) => {
                      const ageDays = h.dataDate ? Math.floor((Date.now() - new Date(h.dataDate).getTime()) / 86400000) : 0;
                      const isStale = ageDays > STALE_WARNING_THRESHOLD_DAYS && h.priceSource === "saleyard";
                      const calvingPct = h.calvingRate > 1 ? h.calvingRate : h.calvingRate * 100;
                      const mortalityPct = h.mortalityRate > 1 ? h.mortalityRate : h.mortalityRate * 100;

                      // Collect supplementary fields dynamically
                      const extras: { label: string; value: string }[] = [];
                      if (h.breedPremiumApplied !== 0) {
                        extras.push({ label: "Breed Adj.", value: `${h.breedPremiumApplied >= 0 ? "+" : ""}${h.breedPremiumApplied}%` });
                      }
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

                      return (
                        <Card key={h.id}>
                          <CardContent className="px-4 py-3">
                            {/* Header: Name + category + badge | Value */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h5 className="text-sm font-semibold text-text-primary">{h.name}</h5>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <p className="text-xs text-text-muted">{h.category}</p>
                                  <Badge variant={h.priceSource === "saleyard" ? (isStale ? "warning" : "success") : "danger"} className="text-[9px] leading-none">
                                    {isStale ? `Stale ${Math.floor(ageDays / 7)}w` : h.priceSource === "national" ? "National Avg" : h.priceSource === "fallback" ? "Fallback" : h.priceSource}
                                  </Badge>
                                </div>
                              </div>
                              <p className="shrink-0 text-base font-bold tabular-nums text-text-primary">{fmtFull(h.netValue)}</p>
                            </div>

                            {/* Core metrics: 4-column grid */}
                            <div className="mt-2.5 grid grid-cols-4 gap-x-3 border-t border-white/5 pt-2.5">
                              <Stat label="Head Count" value={`${h.headCount}`} />
                              <Stat label="Age" value={`${h.ageMonths} months`} />
                              <Stat label="Weight" value={`${h.weight.toFixed(0)} kg`} />
                              <Stat label="Price" value={`$${h.pricePerKg.toFixed(2)}/kg`} />
                            </div>

                            {/* Supplementary metrics: conditional row */}
                            {extras.length > 0 && (
                              <div className="mt-1.5 grid grid-cols-4 gap-x-3 border-t border-white/[0.03] pt-1.5">
                                {extras.map((e) => (
                                  <Stat key={e.label} label={e.label} value={e.value} />
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Grand total */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.04] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Total</p>
              <span className="text-sm tabular-nums text-text-secondary">
                {herdData.reduce((s, h) => s + h.headCount, 0).toLocaleString()} head &middot; <span className="text-base font-bold text-amber-400">{fmt(herdData.reduce((s, h) => s + h.netValue, 0))}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Stat cell helper ---------------------------------------------------------

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">{value}</p>
    </div>
  );
}
