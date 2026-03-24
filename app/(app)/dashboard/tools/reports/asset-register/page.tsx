import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/app/report-filters";
import { parseReportConfig } from "@/lib/utils/report-config";
import { ReportExportButton } from "@/components/app/report-export-button";
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

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
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

  const { executiveSummary, herdData, herdComposition } = reportData;
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
    <div className="max-w-6xl">
      <PageHeader
        title="Asset Register"
        subtitle="Complete herd listing with current valuations."
        actions={!isEmpty ? <ReportExportButton reportData={reportData} reportType="asset-register" title="Asset Register" /> : undefined}
      />

      <div className="mb-4">
        <Suspense>
          <ReportFilters properties={properties ?? []} />
        </Suspense>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-text-muted">No active herds found. Add herds to generate your asset register.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Executive Summary — 2x3 grid matching iOS */}
          {executiveSummary && (
            <Card className="border-amber-500/10">
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Total Portfolio Value</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-amber-400">{fmt(executiveSummary.totalPortfolioValue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Total Head Count</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{executiveSummary.totalHeadCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Avg Value Per Head</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{fmt(executiveSummary.averageValuePerHead)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Valuation Date</p>
                    <p className="mt-1 text-sm font-medium text-text-secondary">{fmtDate(executiveSummary.valuationDate)}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Report Period</p>
                    <p className="mt-1 text-sm font-medium text-text-secondary">{fmtDate(config.startDate)} &mdash; {fmtDate(config.endDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Herd Composition Chart */}
          {herdComposition.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Herd Composition</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportCompositionChart data={herdComposition} />
              </CardContent>
            </Card>
          )}

          {/* Herd Cards — grouped by property, iOS-style layout */}
          {[...grouped.entries()].map(([propertyName, herds]) => (
            <div key={propertyName} className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-text-primary">{propertyName}</h3>
                <span className="text-xs tabular-nums text-text-muted">
                  {herds.reduce((s, h) => s + h.headCount, 0).toLocaleString()} head &middot; {fmt(herds.reduce((s, h) => s + h.netValue, 0))}
                </span>
              </div>

              {herds.map((h) => {
                const ageDays = h.dataDate ? Math.floor((Date.now() - new Date(h.dataDate).getTime()) / 86400000) : 0;
                const isStale = ageDays > STALE_WARNING_THRESHOLD_DAYS && h.priceSource === "saleyard";
                // Normalize calving rate: stored as decimal (0.85) or whole number (85)
                const calvingPct = h.calvingRate > 1 ? h.calvingRate : h.calvingRate * 100;
                const mortalityPct = h.mortalityRate > 1 ? h.mortalityRate : h.mortalityRate * 100;
                const hasBreedingRisk = h.breedPremiumOverride != null || h.breedingAccrual != null || h.dailyWeightGain > 0 || (h.isBreeder && h.calvingRate > 0) || h.mortalityRate > 0;

                return (
                  <Card key={h.id}>
                    <CardContent className="p-4">
                      {/* Card Header — name + value */}
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-text-primary">{h.name}</h4>
                          <p className="text-xs text-text-muted">{h.category}</p>
                        </div>
                        <div className="ml-4 shrink-0 text-right">
                          <p className="text-base font-bold tabular-nums text-text-primary">{fmtFull(h.netValue)}</p>
                          <div className="mt-0.5 flex items-center justify-end gap-1">
                            <Badge variant={h.priceSource === "saleyard" ? (isStale ? "warning" : "success") : "danger"} className="text-[10px]">
                              {isStale ? `Stale - ${Math.floor(ageDays / 7)}w` : h.priceSource === "national" ? "National Avg" : h.priceSource === "fallback" ? "Est. Fallback" : h.priceSource}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Main stats grid — matches iOS 4-column layout */}
                      <div className="mt-3 grid grid-cols-4 gap-3 border-t border-white/5 pt-3">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Head Count</p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">{h.headCount} head</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Age</p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">{h.ageMonths} months</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Weight</p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">{h.weight.toFixed(0)} kg</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Price</p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">${h.pricePerKg.toFixed(2)}/kg</p>
                        </div>
                      </div>

                      {/* Breeding & Risk allocations — matches iOS sub-section */}
                      {hasBreedingRisk && (
                        <div className="mt-3 grid grid-cols-4 gap-3 border-t border-white/5 pt-3">
                          {h.breedPremiumOverride != null && (
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Breed Adj.</p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">
                                {h.breedPremiumOverride >= 0 ? "+" : ""}{h.breedPremiumOverride}% vs. avg
                              </p>
                            </div>
                          )}
                          {h.dailyWeightGain > 0 && (
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">DWG Allocation</p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">{h.dailyWeightGain.toFixed(2)} kg/day</p>
                            </div>
                          )}
                          {h.isBreeder && calvingPct > 0 && (
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Calving %</p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">{calvingPct.toFixed(0)}%</p>
                            </div>
                          )}
                          {mortalityPct > 0 && (
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Mortality</p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">{mortalityPct.toFixed(1)}% p.a.</p>
                            </div>
                          )}
                          {h.breedingAccrual != null && h.breedingAccrual > 0 && (
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Calf Accrual</p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">{fmtFull(h.breedingAccrual)}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
