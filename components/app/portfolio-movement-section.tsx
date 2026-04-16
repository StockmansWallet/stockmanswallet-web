"use client";

// Portfolio Movement Section - client component with period selection and bridge display
// Fetches movement data on period change via server action

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { PortfolioMovementSummary, MovementPeriodPreset, MovementDriver } from "@/lib/types/portfolio-movement";

// Simple class name joiner (project does not use a cn utility)
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
import { MOVEMENT_PRESETS, createMovementPeriod } from "@/lib/types/portfolio-movement";
import { getMovementData } from "@/app/(app)/dashboard/tools/reports/asset-register/movement-action";

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function changeColor(value: number) {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-text-muted";
}

function driverColour(driver: MovementDriver) {
  const map: Record<MovementDriver, string> = {
    "Added": "bg-emerald-500/20 text-emerald-400",
    "Removed/Sold": "bg-red-500/20 text-red-400",
    "Market": "bg-blue-500/20 text-blue-400",
    "Weight Gain": "bg-orange-500/20 text-orange-400",
    "Calf Accrual": "bg-purple-500/20 text-purple-400",
    "Mortality": "bg-red-500/20 text-red-400",
    "Assumption": "bg-gray-500/20 text-gray-400",
  };
  return map[driver] ?? "bg-gray-500/20 text-gray-400";
}

export function PortfolioMovementSection({ propertyFilter }: { propertyFilter: string[] }) {
  const [selectedPreset, setSelectedPreset] = useState<MovementPeriodPreset>("1M");
  const [summary, setSummary] = useState<PortfolioMovementSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const period = createMovementPeriod(selectedPreset);
    startTransition(async () => {
      const data = await getMovementData(period.startDate, period.endDate, propertyFilter);
      setSummary(data);
    });
  }, [selectedPreset, propertyFilter]);

  return (
    <div className="flex flex-col gap-4">
      {/* Period Picker */}
      <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1">
        {MOVEMENT_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setSelectedPreset(preset)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              selectedPreset === preset
                ? "bg-[#FFAA00]/15 text-[#FFAA00] font-semibold"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Initial load (no prior data): inline spinner occupies the date-label slot */}
      {!summary && isPending && (
        <p className="flex items-center justify-center gap-2 text-center text-xs text-text-muted">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#FFAA00] border-t-transparent" />
          <span>Calculating movement...</span>
        </p>
      )}

      {summary && (
        <>
          {/* Date range label, or inline spinner in the same slot while refetching */}
          <p className="flex items-center justify-center gap-2 text-center text-xs text-text-muted">
            {isPending ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#FFAA00] border-t-transparent" />
                <span>Calculating movement...</span>
              </>
            ) : (
              <>{fmtDate(summary.openingDate)} - {fmtDate(summary.closingDate)}</>
            )}
          </p>

          <div className={cn("flex flex-col gap-4 transition-opacity", isPending && "opacity-50")}>

          {/* Executive Summary */}
          <Card>
            <CardContent className="px-5 py-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Portfolio Movement</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Opening Value</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">{fmt(summary.openingValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Closing Value</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">{fmt(summary.closingValue)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Net Change</p>
                  <p className={cn("mt-0.5 text-xl font-bold tabular-nums", changeColor(summary.netChangeDollars))}>
                    {fmt(summary.netChangeDollars)}
                    {summary.netChangePercent != null && (
                      <span className="ml-1.5 text-sm font-medium">
                        ({summary.netChangePercent >= 0 ? "+" : ""}{summary.netChangePercent.toFixed(1)}%)
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Head Count</p>
                  <p className="mt-0.5 text-sm tabular-nums text-text-secondary">
                    {summary.openingHeadCount.toLocaleString()} → {summary.closingHeadCount.toLocaleString()}
                    {summary.netHeadCountChange !== 0 && (
                      <span className={cn("ml-1", changeColor(summary.netHeadCountChange))}>
                        ({summary.netHeadCountChange > 0 ? "+" : ""}{summary.netHeadCountChange})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movement Bridge */}
          <Card>
            <CardContent className="px-5 py-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Movement Bridge</p>
              <div className="flex flex-col">
                <BridgeRow label="Opening Portfolio Value" value={summary.openingValue} isTotal />
                <div className="my-1 border-t border-white/[0.06]" />
                <BridgeRow label="Additions" value={summary.additionsValue} positive />
                <BridgeRow label="Removals/Sales" value={-summary.removalsValue} />
                <div className="my-1 border-t border-white/[0.06]" />
                <BridgeRow label="Market Movement" value={summary.marketMovement} />
                <BridgeRow label="Weight Gain" value={summary.biologicalMovement.weightGain} />
                <BridgeRow label="Breeding Accrual" value={summary.biologicalMovement.breedingAccrual} />
                <BridgeRow label="Mortality" value={summary.biologicalMovement.mortality} />
                {Math.abs(summary.assumptionChanges) > 1 && (
                  <BridgeRow label="Other / Assumptions" value={summary.assumptionChanges} />
                )}
                <div className="my-1 border-t border-white/[0.06]" />
                <BridgeRow label="Closing Portfolio Value" value={summary.closingValue} isTotal />
              </div>
            </CardContent>
          </Card>

          {/* Like-for-Like */}
          <Card>
            <CardContent className="px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Like-for-Like</p>
                <p className="text-[10px] text-text-muted">Existing herds only</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] uppercase text-text-muted">Opening</p>
                  <p className="text-sm font-semibold tabular-nums text-text-primary">{fmt(summary.likeForLikeOpeningValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-text-muted">Closing</p>
                  <p className="text-sm font-semibold tabular-nums text-text-primary">{fmt(summary.likeForLikeClosingValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-text-muted">Change</p>
                  <p className={cn("text-sm font-semibold tabular-nums", changeColor(summary.likeForLikeChangeDollars))}>
                    {fmt(summary.likeForLikeChangeDollars)}
                    {summary.likeForLikeChangePercent != null && (
                      <span className="ml-1 text-xs">({summary.likeForLikeChangePercent >= 0 ? "+" : ""}{summary.likeForLikeChangePercent.toFixed(1)}%)</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movement by Herd */}
          {summary.herdMovements.length > 0 && (
            <Card>
              <CardContent className="px-5 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Movement by Herd</p>
                <div className="flex flex-col divide-y divide-white/[0.06]">
                  {summary.herdMovements.map((m) => (
                    <div key={m.id} className="py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">{m.herdName}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", driverColour(m.mainDriver))}>
                          {m.mainDriver}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="tabular-nums text-text-muted">
                          {m.openingValue != null ? fmt(m.openingValue) : "New"} → {m.closingValue != null ? fmt(m.closingValue) : "Removed"}
                        </span>
                        <span className={cn("font-semibold tabular-nums", changeColor(m.dollarChange))}>
                          {fmt(m.dollarChange)}
                          {m.percentChange != null && (
                            <span className="ml-1 font-normal">({m.percentChange >= 0 ? "+" : ""}{m.percentChange.toFixed(1)}%)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </>
      )}
    </div>
  );
}

// MARK: - Bridge Row
function BridgeRow({ label, value, isTotal, positive }: { label: string; value: number; isTotal?: boolean; positive?: boolean }) {
  const color = isTotal ? "text-text-primary" : changeColor(value);
  const prefix = isTotal ? "" : value >= 0 ? "+" : "";
  return (
    <div className={cn("flex items-center justify-between py-1.5 px-1", isTotal && "bg-white/[0.03] rounded")}>
      <span className={cn("text-sm", isTotal ? "font-semibold text-text-primary" : "text-text-secondary")}>{label}</span>
      <span className={cn("text-sm tabular-nums", isTotal ? "font-semibold" : "font-medium", color)}>
        {prefix}{fmt(Math.abs(value))}
      </span>
    </div>
  );
}
