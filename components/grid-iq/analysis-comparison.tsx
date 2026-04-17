// Analysis comparison component - saleyard vs processor side-by-side
// Used in Grid IQ analysis detail view

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AnalysisComparisonProps {
  mlaMarketValue: number;
  headlineGridValue: number;
  realisticGridOutcome: number;
  realisationFactor: number;
  freightToSaleyard: number;
  freightToProcessor: number;
  netSaleyardValue: number;
  netProcessorValue: number;
  gridIQAdvantage: number;
  headCount: number;
  carcaseWeight: number;
  dressingPercentage: number;
  isUsingPersonalisedData: boolean;
}

function formatDollars(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function AnalysisComparison({
  mlaMarketValue,
  realisticGridOutcome,
  realisationFactor,
  freightToSaleyard,
  freightToProcessor,
  netSaleyardValue,
  netProcessorValue,
  gridIQAdvantage,
  headCount,
  carcaseWeight,
  dressingPercentage,
  isUsingPersonalisedData,
}: AnalysisComparisonProps) {
  const isProcessorBetter = gridIQAdvantage > 0;
  const perHeadAdvantage = headCount > 0 ? Math.abs(gridIQAdvantage) / headCount : 0;
  const winnerColour = isProcessorBetter ? "text-emerald-400" : "text-amber-400";
  const winnerLabel = isProcessorBetter ? "Over-the-Hooks" : "Saleyard";
  const WinnerIcon = isProcessorBetter ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardContent className="p-5">
        {/* Advantage hero */}
        <div className="text-center">
          <p className="text-xs font-medium text-text-muted">Grid IQ Advantage</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <WinnerIcon className={`h-5 w-5 ${winnerColour}`} />
            <span className={`text-3xl font-bold tracking-tight ${winnerColour}`}>
              {formatDollars(Math.abs(gridIQAdvantage))}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            <span className={`font-semibold ${winnerColour}`}>{winnerLabel}</span>
            <span className="text-text-muted"> wins by {formatDollars(perHeadAdvantage)}/head</span>
          </p>
        </div>

        {/* Aligned comparison table */}
        <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.06]">
          {/* Column headers */}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-white/[0.06] bg-white/[0.02]">
            <div className="px-3 py-2" />
            <ColumnHeader label="Saleyard" isWinner={!isProcessorBetter} />
            <ColumnHeader label="Over-the-Hooks" isWinner={isProcessorBetter} />
          </div>

          <Row
            label="Gross"
            left={{ value: formatDollars(mlaMarketValue), caption: "MLA value" }}
            right={{
              value: formatDollars(realisticGridOutcome),
              caption: `Grid · RF ${(realisationFactor * 100).toFixed(1)}%`,
            }}
            winner={isProcessorBetter ? "right" : "left"}
          />

          <Row
            label="Freight"
            left={{ value: `−${formatDollars(freightToSaleyard)}`, valueClass: "text-red-400" }}
            right={{ value: `−${formatDollars(freightToProcessor)}`, valueClass: "text-red-400" }}
            winner={isProcessorBetter ? "right" : "left"}
          />

          <Row
            label="Net"
            left={{ value: formatDollars(netSaleyardValue) }}
            right={{ value: formatDollars(netProcessorValue) }}
            winner={isProcessorBetter ? "right" : "left"}
            emphasised
          />
        </div>

        {/* Consignment summary strip */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-text-muted">
          <SummaryItem value={`${headCount}`} label="head" />
          <Dot />
          <SummaryItem value={`${carcaseWeight.toFixed(0)} kg`} label="carcase" />
          <Dot />
          <SummaryItem value={`${(dressingPercentage * 100).toFixed(1)}%`} label="dressing" />
          <Dot />
          <SummaryItem value={isUsingPersonalisedData ? "Personal" : "Baseline"} label="data" />
        </div>
      </CardContent>
    </Card>
  );
}

function ColumnHeader({ label, isWinner }: { label: string; isWinner: boolean }) {
  return (
    <div className="relative px-3 py-2 text-center">
      {isWinner && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-emerald-400/70" />
      )}
      <p className={`text-xs font-semibold ${isWinner ? "text-emerald-400" : "text-text-secondary"}`}>
        {label}
      </p>
    </div>
  );
}

interface RowCell {
  value: string;
  caption?: string;
  valueClass?: string;
}

function Row({
  label,
  left,
  right,
  winner,
  emphasised,
}: {
  label: string;
  left: RowCell;
  right: RowCell;
  winner: "left" | "right";
  emphasised?: boolean;
}) {
  const labelClass = emphasised
    ? "text-xs font-semibold uppercase tracking-wider text-text-secondary"
    : "text-[11px] uppercase tracking-wider text-text-muted";
  const valueBase = emphasised ? "text-lg font-bold" : "text-sm font-semibold";

  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center ${
        emphasised ? "border-t border-white/[0.06] bg-white/[0.02]" : ""
      }`}
    >
      <div className="px-3 py-2.5">
        <p className={labelClass}>{label}</p>
      </div>
      <Cell cell={left} isWinner={winner === "left"} emphasised={emphasised} valueBase={valueBase} />
      <Cell cell={right} isWinner={winner === "right"} emphasised={emphasised} valueBase={valueBase} />
    </div>
  );
}

function Cell({
  cell,
  isWinner,
  emphasised,
  valueBase,
}: {
  cell: RowCell;
  isWinner: boolean;
  emphasised?: boolean;
  valueBase: string;
}) {
  const winnerValueClass = emphasised ? "text-emerald-400" : "text-text-primary";
  const defaultValueClass = emphasised ? "text-text-primary" : "text-text-secondary";
  const valueClass = cell.valueClass ?? (isWinner ? winnerValueClass : defaultValueClass);

  return (
    <div className="relative px-3 py-2.5 text-center">
      {isWinner && (
        <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-emerald-400/70" />
      )}
      <p className={`${valueBase} ${valueClass}`}>{cell.value}</p>
      {cell.caption && (
        <p className="mt-0.5 text-[10px] text-text-muted">{cell.caption}</p>
      )}
    </div>
  );
}

function SummaryItem({ value, label }: { value: string; label: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold text-text-primary">{value}</span>{" "}
      <span className="text-text-muted">{label}</span>
    </span>
  );
}

function Dot() {
  return <span className="text-text-muted/60">·</span>;
}
