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

        {/* Side-by-side comparison */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <ComparisonColumn
            title="Saleyard"
            isWinner={!isProcessorBetter}
            grossValue={formatDollars(mlaMarketValue)}
            grossCaption="MLA value"
            freightValue={`−${formatDollars(freightToSaleyard)}`}
            netValue={formatDollars(netSaleyardValue)}
          />
          <ComparisonColumn
            title="Over-the-Hooks"
            isWinner={isProcessorBetter}
            grossValue={formatDollars(realisticGridOutcome)}
            grossCaption={`Grid · RF ${(realisationFactor * 100).toFixed(1)}%`}
            freightValue={`−${formatDollars(freightToProcessor)}`}
            netValue={formatDollars(netProcessorValue)}
          />
        </div>

        {/* Consignment summary strip */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-text-muted">
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

function ComparisonColumn({
  title,
  isWinner,
  grossValue,
  grossCaption,
  freightValue,
  netValue,
}: {
  title: string;
  isWinner: boolean;
  grossValue: string;
  grossCaption: string;
  freightValue: string;
  netValue: string;
}) {
  const containerClass = isWinner
    ? "border border-emerald-500/20 bg-emerald-500/[0.04]"
    : "border border-white/[0.06] bg-white/[0.02]";
  const titleClass = isWinner ? "text-emerald-400" : "text-text-secondary";
  const netValueClass = isWinner ? "text-emerald-400" : "text-text-primary";

  return (
    <div className={`rounded-xl ${containerClass} p-4`}>
      <p className={`text-center text-xs font-semibold uppercase tracking-wider ${titleClass}`}>
        {title}
      </p>

      <div className="mt-3 space-y-2.5">
        <LineItem label="Gross" value={grossValue} caption={grossCaption} />
        <LineItem label="Freight" value={freightValue} valueClass="text-red-400" />
      </div>

      <div className="mt-3 border-t border-white/[0.06] pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Net
          </span>
          <span className={`text-lg font-bold ${netValueClass}`}>{netValue}</span>
        </div>
      </div>
    </div>
  );
}

function LineItem({
  label,
  value,
  caption,
  valueClass,
}: {
  label: string;
  value: string;
  caption?: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-text-muted">{label}</span>
        <span className={`text-sm font-semibold ${valueClass ?? "text-text-primary"}`}>
          {value}
        </span>
      </div>
      {caption && (
        <p className="mt-0.5 text-right text-[10px] text-text-muted">{caption}</p>
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
