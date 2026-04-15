import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ReportFilters } from "@/components/app/report-filters";
import { parseReportConfig } from "@/lib/utils/report-config";
import { ReportPreviewButton } from "@/components/app/report-preview-button";
import { ReportCompositionChart } from "@/components/app/report-composition-chart";
import { generateAssetRegisterData } from "@/lib/services/report-service";

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

      {isEmpty ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-text-muted">No active herds found. Add herds to generate your asset register.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">

          {/* Executive Summary: full width with dark header */}
          {executiveSummary && (
            <div className="overflow-hidden rounded-xl">
              <div className="bg-white/[0.08] px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Executive Summary</p>
                <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-amber-400">
                  {fmt(executiveSummary.totalPortfolioValue)}
                </p>
              </div>
              <Card className="rounded-t-none border-t-0">
                <CardContent className="px-5 py-3">
                  <div className="grid grid-cols-4 gap-x-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Head Count</p>
                      <p className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">{executiveSummary.totalHeadCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Avg per Head</p>
                      <p className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">{fmt(executiveSummary.averageValuePerHead)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Valuation Date</p>
                      <p className="mt-0.5 text-sm font-medium tabular-nums text-text-secondary">{fmtDate(executiveSummary.valuationDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Report Period</p>
                      <p className="mt-0.5 text-sm font-medium tabular-nums text-text-secondary">{fmtDate(config.startDate)}</p>
                      <p className="text-sm font-medium tabular-nums text-text-secondary">{fmtDate(config.endDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Details row: Producer/Properties + Herd Composition side by side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Producer and properties */}
            {userDetails && (
              <Card>
                <CardContent className="px-5 py-4">
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Producer</p>
                    <p className="mt-0.5 text-base font-semibold text-text-primary">{userDetails.preparedFor}</p>
                  </div>
                  {reportProperties.length > 0 && (
                    <div className="border-t border-white/5 pt-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                        {reportProperties.length > 1 ? "Properties" : "Property"}
                      </p>
                      <div className="flex flex-col gap-1">
                        {reportProperties.map((p) => (
                          <div key={p.name} className="text-sm">
                            <span className="font-medium text-text-primary">{p.name}</span>
                            {p.picCode && <span className="ml-2 text-xs text-text-muted">PIC: {p.picCode}</span>}
                            {p.state && <span className="ml-2 text-xs text-text-muted">{p.state}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

          {/* LIVESTOCK ASSETS */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">Livestock Assets</h3>

            <div className="flex flex-col gap-4">
              {[...grouped.entries()].map(([propertyName, herds]) => (
                <div key={propertyName}>
                  {/* Property header - dark bar */}
                  <div className="mb-2 flex items-center justify-between rounded-full bg-white/[0.06] px-4 py-2.5">
                    <h4 className="text-sm font-semibold text-white">{propertyName}</h4>
                    <span className="text-xs tabular-nums text-white/60">
                      {herds.reduce((s, h) => s + h.headCount, 0).toLocaleString()} head &middot; <span className="font-semibold text-amber-400">{fmt(herds.reduce((s, h) => s + h.netValue, 0))}</span>
                    </span>
                  </div>

                  {/* Herd cards */}
                  <div className="flex flex-col gap-2">
                    {herds.map((h) => {
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

                      return (
                        <Card key={h.id} className="overflow-hidden">
                          {/* Header: tinted row with name + category inline | value */}
                          <div className="flex items-center justify-between bg-white/[0.03] px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-semibold text-text-primary">{h.name}</h5>
                              <p className="text-xs text-text-muted">{h.category}</p>
                            </div>
                            <p className="shrink-0 text-base font-bold tabular-nums text-text-primary">{fmtFull(h.netValue)}</p>
                          </div>

                          {/* Core metrics: 4-column grid */}
                          <CardContent className="px-4 py-2">
                            <div className="grid grid-cols-4 gap-x-3">
                              <Stat label="Head Count" value={`${h.headCount}`} />
                              <Stat label="Age" value={`${h.ageMonths} months`} />
                              <Stat label="Weight" value={`${h.weight.toFixed(0)} kg`} />
                              <Stat label="Price" value={`$${h.pricePerKg.toFixed(2)}/kg`} />
                            </div>

                            {/* Supplementary metrics: rows of 4 */}
                            {extras.length > 0 && (() => {
                              const rows: typeof extras[] = [];
                              for (let i = 0; i < extras.length; i += 4) rows.push(extras.slice(i, i + 4));
                              return rows.map((row, ri) => (
                                <div key={ri} className="mt-1.5 grid grid-cols-4 gap-x-3 border-t border-white/[0.03] pt-1.5">
                                  {row.map((e) => (
                                    <Stat key={e.label} label={e.label} value={e.value} accent={e.accent} />
                                  ))}
                                </div>
                              ));
                            })()}

                            {/* Breed premium justification */}
                            {h.breedPremiumOverride != null && h.breedPremiumJustification && (
                              <p className="mt-1.5 border-t border-white/[0.03] pt-1.5 text-[11px] text-text-muted">
                                Baseline breed premium: <span className="font-semibold text-text-primary">{h.baseBreedPremium >= 0 ? "+" : ""}{h.baseBreedPremium}%</span> <span className="mx-1 text-white/20">|</span> Custom breed premium: <span className="font-bold text-amber-400">{h.breedPremiumOverride >= 0 ? "+" : ""}{h.breedPremiumOverride}%</span> <span className="mx-1 text-white/20">|</span> Justification: <span className="italic">{h.breedPremiumJustification}</span>
                              </p>
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
            <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.06] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">Total</p>
              <span className="text-sm tabular-nums text-white/60">
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${accent ? "text-amber-400" : "text-text-primary"}`}>{value}</p>
    </div>
  );
}
