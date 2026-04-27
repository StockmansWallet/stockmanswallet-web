"use client";

// Portfolio Movement Section - client component that renders the bridge for a given date range.
// Fetches movement data whenever the parent supplies a new startDate / endDate / property filter.

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { PortfolioMovementSummary, MovementDriver } from "@/lib/types/portfolio-movement";

// Simple class name joiner (project does not use a cn utility)
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
import { getMovementData } from "@/app/(app)/dashboard/tools/reports/asset-register/movement-action";

function fmt(v: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(v);
}

function changeColor(value: number) {
  if (value > 0) return "text-success";
  if (value < 0) return "text-error";
  return "text-text-muted";
}

function driverColour(driver: MovementDriver) {
  const map: Record<MovementDriver, string> = {
    "New Herd": "bg-success/20 text-success",
    "Removed/Sold": "bg-error/20 text-error",
    Market: "bg-info/20 text-info",
    "Weight Gain": "bg-brand/20 text-brand",
    "Calf Accrual": "bg-violet/20 text-violet",
    Mortality: "bg-error/20 text-error",
    Assumption: "bg-white/[0.06] text-text-muted",
  };
  return map[driver] ?? "bg-white/[0.06] text-text-muted";
}

export function PortfolioMovementSection({
  startDate,
  endDate,
  propertyFilter,
}: {
  startDate: string;
  endDate: string;
  propertyFilter: string[];
}) {
  const [summary, setSummary] = useState<PortfolioMovementSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getMovementData(startDate, endDate, propertyFilter);
      setSummary(data);
    });
  }, [startDate, endDate, propertyFilter]);

  return (
    <div className="flex flex-col gap-4">
      {/* Initial load (no prior data): inline spinner occupies the date-label slot */}
      {!summary && isPending && (
        <p className="text-text-muted flex items-center justify-center gap-2 text-center text-xs">
          <span className="border-brand inline-block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
          <span>Calculating movement...</span>
        </p>
      )}

      {summary && (
        <>
          <div className={cn("flex flex-col gap-4 transition-opacity", isPending && "opacity-50")}>
            {/* Executive Summary */}
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-text-muted mb-3 text-[10px] font-semibold tracking-widest uppercase">
                  Portfolio Movement
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-text-muted text-[10px] font-semibold tracking-widest uppercase">
                      Opening Value
                    </p>
                    <p className="text-text-primary mt-0.5 text-lg font-semibold tabular-nums">
                      {fmt(summary.openingValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-[10px] font-semibold tracking-widest uppercase">
                      Closing Value
                    </p>
                    <p className="text-text-primary mt-0.5 text-lg font-semibold tabular-nums">
                      {fmt(summary.closingValue)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <div>
                    <p className="text-text-muted text-[10px] font-semibold tracking-widest uppercase">
                      Net Change
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xl font-bold tabular-nums",
                        changeColor(summary.netChangeDollars)
                      )}
                    >
                      {fmt(summary.netChangeDollars)}
                      {summary.netChangePercent != null && (
                        <span className="ml-1.5 text-sm font-medium">
                          ({summary.netChangePercent >= 0 ? "+" : ""}
                          {summary.netChangePercent.toFixed(1)}%)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-muted text-[10px] font-semibold tracking-widest uppercase">
                      Head Count
                    </p>
                    <p className="text-text-secondary mt-0.5 text-sm tabular-nums">
                      {summary.openingHeadCount.toLocaleString()} →{" "}
                      {summary.closingHeadCount.toLocaleString()}
                      {summary.netHeadCountChange !== 0 && (
                        <span className={cn("ml-1", changeColor(summary.netHeadCountChange))}>
                          ({summary.netHeadCountChange > 0 ? "+" : ""}
                          {summary.netHeadCountChange})
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
                <div className="mb-3 flex items-baseline justify-between">
                  <p className="text-text-muted text-[10px] font-semibold tracking-widest uppercase">
                    Movement Bridge
                  </p>
                  <div className="text-text-muted/70 hidden items-baseline gap-6 text-[9px] font-semibold tracking-widest uppercase sm:flex">
                    <span className="w-24 text-right">$ change</span>
                    <span className="w-14 text-right">Head</span>
                    <span className="w-20 text-right">$ / head</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <BridgeRow
                    label="Opening Portfolio Value"
                    value={summary.openingValue}
                    headCount={summary.openingHeadCount}
                    isTotal
                  />
                  <div className="my-1 border-t border-white/[0.06]" />
                  <BridgeRow
                    label="New Herds"
                    value={summary.additionsValue}
                    headCount={summary.additionsHeadCount}
                    signed
                  />
                  <BridgeRow
                    label="Removals/Sales"
                    value={-summary.removalsValue}
                    headCount={summary.removalsHeadCount > 0 ? -summary.removalsHeadCount : 0}
                    signed
                  />
                  <div className="my-1 border-t border-white/[0.06]" />
                  <BridgeRow label="Market Movement" value={summary.marketMovement} signed />
                  <BridgeRow
                    label="Weight Gain"
                    value={summary.biologicalMovement.weightGain}
                    signed
                  />
                  <BridgeRow
                    label="Breeding Accrual"
                    value={summary.biologicalMovement.breedingAccrual}
                    signed
                  />
                  <BridgeRow
                    label="Mortality"
                    value={summary.biologicalMovement.mortality}
                    signed
                  />
                  {Math.abs(summary.assumptionChanges) > 1 && (
                    <BridgeRow
                      label="Other / Assumptions"
                      value={summary.assumptionChanges}
                      signed
                    />
                  )}
                  <div className="my-1 border-t border-white/[0.06]" />
                  <BridgeRow
                    label="Closing Portfolio Value"
                    value={summary.closingValue}
                    headCount={summary.closingHeadCount}
                    isTotal
                  />
                </div>
              </CardContent>
            </Card>

            {/* Like-for-Like */}
            <Card>
              <CardContent className="px-5 py-4">
                <p className="text-text-muted text-[10px] font-semibold tracking-widest uppercase">
                  Like-for-Like{" "}
                  <span className="text-text-muted/70 font-normal tracking-normal normal-case">
                    (Excludes buy/sell)
                  </span>
                </p>
                <div className="mt-3 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-text-muted text-[10px] uppercase">Opening</p>
                    <p className="text-text-primary text-sm font-semibold tabular-nums">
                      {fmt(summary.likeForLikeOpeningValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-[10px] uppercase">Closing</p>
                    <p className="text-text-primary text-sm font-semibold tabular-nums">
                      {fmt(summary.likeForLikeClosingValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-[10px] uppercase">Change</p>
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        changeColor(summary.likeForLikeChangeDollars)
                      )}
                    >
                      {fmt(summary.likeForLikeChangeDollars)}
                      {summary.likeForLikeChangePercent != null && (
                        <span className="ml-1 text-xs">
                          ({summary.likeForLikeChangePercent >= 0 ? "+" : ""}
                          {summary.likeForLikeChangePercent.toFixed(1)}%)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <p className="text-text-muted mt-3 border-t border-white/[0.06] pt-2 text-[11px] leading-snug">
                  Excludes herds added or removed during the period and shows how the existing
                  portfolio changed on a comparable basis through market and biological movements.
                </p>
              </CardContent>
            </Card>

            {/* Movement by Herd - per-herd breakdown by driver so users can compare contributions */}
            {summary.herdMovements.length > 0 && (
              <Card>
                <CardContent className="px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-text-muted text-[10px] font-semibold tracking-widest uppercase">
                      Movement by Herd
                    </p>
                    <p className="text-text-muted text-[10px]">Per-driver breakdown</p>
                  </div>
                  <div className="flex flex-col divide-y divide-white/[0.06]">
                    {summary.herdMovements.map((m) => (
                      <HerdMovementRow key={m.id} detail={m} />
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
// Renders one row in the movement bridge. Shows $ on every row, plus head
// count and $/head where meaningful. Head/per-head are suppressed on the
// flow rows (market, weight gain, breeding, mortality, assumptions) because
// those components apply to the continuing population as a whole and a
// per-head figure on those lines is more confusing than useful.
function BridgeRow({
  label,
  value,
  headCount,
  isTotal,
  signed,
}: {
  label: string;
  value: number;
  headCount?: number;
  isTotal?: boolean;
  signed?: boolean;
}) {
  const color = isTotal ? "text-text-primary" : changeColor(value);
  const prefix = isTotal ? "" : value >= 0 ? "+" : "";
  const hasHead = headCount !== undefined;
  const perHead = hasHead && headCount !== 0 ? value / headCount : null;
  const headLabel = hasHead
    ? `${signed && headCount > 0 ? "+" : ""}${headCount.toLocaleString()}`
    : "";

  return (
    <div
      className={cn(
        "flex items-center justify-between px-1 py-1.5",
        isTotal && "rounded bg-white/[0.03]"
      )}
    >
      <span
        className={cn(
          "text-sm",
          isTotal ? "text-text-primary font-semibold" : "text-text-secondary"
        )}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-6">
        <span
          className={cn(
            "w-24 text-right text-sm tabular-nums",
            isTotal ? "font-semibold" : "font-medium",
            color
          )}
        >
          {prefix}
          {fmt(Math.abs(value))}
        </span>
        <span
          className={cn(
            "hidden w-14 text-right text-xs tabular-nums sm:inline-block",
            isTotal ? "text-text-secondary" : "text-text-muted"
          )}
        >
          {hasHead ? headLabel : "-"}
        </span>
        <span
          className={cn(
            "hidden w-20 text-right text-xs tabular-nums sm:inline-block",
            isTotal ? "text-text-secondary" : "text-text-muted"
          )}
        >
          {perHead !== null ? fmt(perHead) : "-"}
        </span>
      </div>
    </div>
  );
}

// MARK: - Herd Movement Row
// Single herd card showing net change + a grid of per-driver components.
function HerdMovementRow({
  detail: m,
}: {
  detail: PortfolioMovementSummary["herdMovements"][number];
}) {
  const headDelta = m.closingHeadCount - m.openingHeadCount;
  const premiumLabel =
    m.currentBreedPremium === 0
      ? null
      : `${m.currentBreedPremium > 0 ? "+" : ""}${m.currentBreedPremium.toFixed(0)}%`;
  const headLabel =
    m.mainDriver === "New Herd"
      ? `New · ${m.closingHeadCount} head`
      : m.mainDriver === "Removed/Sold"
        ? `Removed · ${m.openingHeadCount} head`
        : headDelta !== 0
          ? `${m.openingHeadCount} → ${m.closingHeadCount} head (${headDelta > 0 ? "+" : ""}${headDelta})`
          : `${m.closingHeadCount} head`;

  return (
    <div className="py-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-text-primary text-sm font-medium">{m.herdName}</span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                driverColour(m.mainDriver)
              )}
            >
              {m.mainDriver}
            </span>
          </div>
          <div className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px]">
            <span className="tabular-nums">{headLabel}</span>
            {premiumLabel && (
              <>
                <span className="text-white/20">·</span>
                <span className="tabular-nums">Breed premium {premiumLabel}</span>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-sm font-semibold tabular-nums", changeColor(m.dollarChange))}>
            {fmt(m.dollarChange)}
          </p>
          {m.percentChange != null && (
            <p className={cn("text-[10px] tabular-nums", changeColor(m.dollarChange))}>
              ({m.percentChange >= 0 ? "+" : ""}
              {m.percentChange.toFixed(1)}%)
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-x-3">
        <DriverCell label="Market" value={m.marketComponent} />
        <DriverCell label="DWG" value={m.weightGainComponent} />
        <DriverCell label="Breeding" value={m.breedingComponent} />
        <DriverCell label="Mortality" value={m.mortalityComponent} />
      </div>
    </div>
  );
}

function DriverCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-text-muted text-[9px] font-medium tracking-wider uppercase">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-xs font-semibold tabular-nums",
          value === 0 ? "text-text-muted" : changeColor(value)
        )}
      >
        {value === 0 ? "-" : `${value > 0 ? "+" : ""}${fmt(value)}`}
      </p>
    </div>
  );
}
