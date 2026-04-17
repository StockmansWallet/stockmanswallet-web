// Analysis comparison component - saleyard vs processor side-by-side
// Used in Grid IQ analysis detail view

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Truck } from "lucide-react";

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
}

// Debug: Format dollar values consistently
function formatDollars(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function AnalysisComparison({
  mlaMarketValue,
  headlineGridValue,
  realisticGridOutcome,
  realisationFactor,
  freightToSaleyard,
  freightToProcessor,
  netSaleyardValue,
  netProcessorValue,
  gridIQAdvantage,
  headCount,
}: AnalysisComparisonProps) {
  const isProcessorBetter = gridIQAdvantage > 0;
  const perHeadAdvantage = headCount > 0 ? Math.abs(gridIQAdvantage) / headCount : 0;

  return (
    <Card>
      <CardContent className="p-5">
        {/* Advantage headline */}
        <div className="mb-4 text-center">
          <p className="text-xs font-medium text-text-muted">Grid IQ Advantage</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            {isProcessorBetter ? (
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-amber-400" />
            )}
            <span className={`text-2xl font-bold ${isProcessorBetter ? "text-emerald-400" : "text-amber-400"}`}>
              {formatDollars(Math.abs(gridIQAdvantage))}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            {isProcessorBetter ? "Over-the-hooks" : "Saleyard"} by {formatDollars(perHeadAdvantage)}/head
          </p>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Saleyard column */}
          <div className={`rounded-lg p-3 ${!isProcessorBetter ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" : "bg-white/[0.04]"}`}>
            <p className={`text-center text-base font-bold ${!isProcessorBetter ? "text-emerald-400" : "text-text-primary"}`}>Saleyard</p>
            <div className="mt-3 space-y-2">
              <div>
                <p className="text-[10px] text-text-muted">MLA Value</p>
                <p className="text-sm font-semibold text-text-primary">{formatDollars(mlaMarketValue)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Truck className="h-3 w-3 text-text-muted" />
                <p className="text-[10px] text-text-muted">Freight</p>
              </div>
              <p className="text-sm font-medium text-red-400">-{formatDollars(freightToSaleyard)}</p>
              <div className="border-t border-white/10 pt-2">
                <p className="text-[10px] text-text-muted">Net</p>
                <p className="text-base font-bold text-text-primary">{formatDollars(netSaleyardValue)}</p>
              </div>
            </div>
          </div>

          {/* Processor column */}
          <div className={`rounded-lg p-3 ${isProcessorBetter ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" : "bg-white/[0.04]"}`}>
            <p className={`text-center text-base font-bold ${isProcessorBetter ? "text-emerald-400" : "text-text-primary"}`}>Over-the-Hooks</p>
            <div className="mt-3 space-y-2">
              <div>
                <p className="text-[10px] text-text-muted">Grid Value</p>
                <p className="text-sm font-semibold text-text-primary">{formatDollars(realisticGridOutcome)}</p>
                <p className="text-[10px] text-text-muted">
                  RF: {(realisationFactor * 100).toFixed(1)}%
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Truck className="h-3 w-3 text-text-muted" />
                <p className="text-[10px] text-text-muted">Freight</p>
              </div>
              <p className="text-sm font-medium text-red-400">-{formatDollars(freightToProcessor)}</p>
              <div className="border-t border-white/10 pt-2">
                <p className="text-[10px] text-text-muted">Net</p>
                <p className="text-base font-bold text-text-primary">{formatDollars(netProcessorValue)}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
