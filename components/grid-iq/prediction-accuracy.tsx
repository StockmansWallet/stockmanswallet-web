// Prediction accuracy comparison for post-sale analyses
// Shows how accurately the pre-sale estimate predicted the actual outcome

import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PredictionAccuracyProps {
  preSaleNetProcessor: number;
  preSaleNetSaleyard: number;
  preSaleAdvantage: number;
  actualNetProcessor: number;
  actualNetSaleyard: number;
  actualAdvantage: number;
  preSaleDate: string;
  postSaleDate: string;
}

function formatCurrency(value: number): string {
  return `$${Math.abs(Math.round(value)).toLocaleString()}`;
}

function accuracyPercentage(predicted: number, actual: number): number {
  if (predicted === 0 && actual === 0) return 100;
  if (predicted === 0) return 0;
  return Math.round((1 - Math.abs(actual - predicted) / Math.abs(predicted)) * 100);
}

export function PredictionAccuracy({
  preSaleNetProcessor,
  preSaleNetSaleyard,
  preSaleAdvantage,
  actualNetProcessor,
  actualNetSaleyard,
  actualAdvantage,
  preSaleDate,
  postSaleDate,
}: PredictionAccuracyProps) {
  const processorAccuracy = accuracyPercentage(preSaleNetProcessor, actualNetProcessor);
  const processorDiff = actualNetProcessor - preSaleNetProcessor;
  const advantageDiff = actualAdvantage - preSaleAdvantage;

  // Overall accuracy is based on processor value prediction (main outcome)
  const overallAccuracy = Math.max(0, processorAccuracy);

  const accuracyColor =
    overallAccuracy >= 95 ? "text-emerald-400"
    : overallAccuracy >= 85 ? "text-teal-400"
    : overallAccuracy >= 70 ? "text-amber-400"
    : "text-red-400";

  const accuracyBg =
    overallAccuracy >= 95 ? "bg-emerald-500/15"
    : overallAccuracy >= 85 ? "bg-teal-500/15"
    : overallAccuracy >= 70 ? "bg-amber-500/15"
    : "bg-red-500/15";

  const DiffIcon = processorDiff > 0 ? TrendingUp : processorDiff < 0 ? TrendingDown : Minus;
  const diffColor = processorDiff > 0 ? "text-emerald-400" : processorDiff < 0 ? "text-red-400" : "text-text-muted";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accuracyBg}`}>
            <Target className={`h-4 w-4 ${accuracyColor}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Prediction Accuracy</p>
            <p className="text-xs text-text-muted">
              Pre-sale estimate vs actual outcome
            </p>
          </div>
          <span className={`ml-auto text-lg font-bold ${accuracyColor}`}>
            {overallAccuracy}%
          </span>
        </div>

        {/* Comparison grid */}
        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            <span />
            <span className="w-24 text-right">Estimated</span>
            <span className="w-24 text-right">Actual</span>
            <span className="w-20 text-right">Diff</span>
          </div>

          {/* Processor net */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
            <span className="text-xs font-medium text-text-secondary">Processor (net)</span>
            <span className="w-24 text-right text-sm text-text-primary">
              {formatCurrency(preSaleNetProcessor)}
            </span>
            <span className="w-24 text-right text-sm font-medium text-text-primary">
              {formatCurrency(actualNetProcessor)}
            </span>
            <div className={`flex w-20 items-center justify-end gap-1 text-sm font-medium ${diffColor}`}>
              <DiffIcon className="h-3 w-3" />
              {processorDiff >= 0 ? "+" : "-"}{formatCurrency(processorDiff)}
            </div>
          </div>

          {/* Saleyard net */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
            <span className="text-xs font-medium text-text-secondary">Saleyard (net)</span>
            <span className="w-24 text-right text-sm text-text-primary">
              {formatCurrency(preSaleNetSaleyard)}
            </span>
            <span className="w-24 text-right text-sm font-medium text-text-primary">
              {formatCurrency(actualNetSaleyard)}
            </span>
            <span className={`w-20 text-right text-sm ${(actualNetSaleyard - preSaleNetSaleyard) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {(actualNetSaleyard - preSaleNetSaleyard) >= 0 ? "+" : "-"}
              {formatCurrency(actualNetSaleyard - preSaleNetSaleyard)}
            </span>
          </div>

          {/* Advantage */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg border border-white/[0.06] px-3 py-2">
            <span className="text-xs font-semibold text-text-primary">Grid IQ Advantage</span>
            <span className={`w-24 text-right text-sm font-semibold ${preSaleAdvantage > 0 ? "text-emerald-400" : "text-brand"}`}>
              {preSaleAdvantage > 0 ? "+" : "-"}{formatCurrency(preSaleAdvantage)}
            </span>
            <span className={`w-24 text-right text-sm font-bold ${actualAdvantage > 0 ? "text-emerald-400" : "text-brand"}`}>
              {actualAdvantage > 0 ? "+" : "-"}{formatCurrency(actualAdvantage)}
            </span>
            <span className={`w-20 text-right text-sm font-medium ${advantageDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {advantageDiff >= 0 ? "+" : "-"}{formatCurrency(advantageDiff)}
            </span>
          </div>
        </div>

        {/* Date context */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-text-muted">
          <span>Estimated {new Date(preSaleDate).toLocaleDateString("en-AU")}</span>
          <span>Actual {new Date(postSaleDate).toLocaleDateString("en-AU")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
