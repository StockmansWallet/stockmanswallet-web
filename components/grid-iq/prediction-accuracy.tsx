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
    overallAccuracy >= 95
      ? "text-success"
      : overallAccuracy >= 85
        ? "text-grid-iq"
        : overallAccuracy >= 70
          ? "text-warning"
          : "text-error";

  const accuracyBg =
    overallAccuracy >= 95
      ? "bg-success/15"
      : overallAccuracy >= 85
        ? "bg-grid-iq/15"
        : overallAccuracy >= 70
          ? "bg-warning/15"
          : "bg-error/15";

  const DiffIcon = processorDiff > 0 ? TrendingUp : processorDiff < 0 ? TrendingDown : Minus;
  const diffColor =
    processorDiff > 0 ? "text-success" : processorDiff < 0 ? "text-error" : "text-text-muted";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accuracyBg}`}>
            <Target className={`h-4 w-4 ${accuracyColor}`} />
          </div>
          <div>
            <p className="text-text-primary text-sm font-semibold">Prediction Accuracy</p>
            <p className="text-text-muted text-xs">Pre-sale estimate vs actual outcome</p>
          </div>
          <span className={`ml-auto text-lg font-bold ${accuracyColor}`}>{overallAccuracy}%</span>
        </div>

        {/* Comparison grid */}
        <div className="space-y-2">
          {/* Header row */}
          <div className="text-text-muted grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-[10px] font-medium tracking-wider uppercase">
            <span />
            <span className="w-24 text-right">Estimated</span>
            <span className="w-24 text-right">Actual</span>
            <span className="w-20 text-right">Diff</span>
          </div>

          {/* Processor net */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
            <span className="text-text-secondary text-xs font-medium">Processor (net)</span>
            <span className="text-text-primary w-24 text-right text-sm">
              {formatCurrency(preSaleNetProcessor)}
            </span>
            <span className="text-text-primary w-24 text-right text-sm font-medium">
              {formatCurrency(actualNetProcessor)}
            </span>
            <div
              className={`flex w-20 items-center justify-end gap-1 text-sm font-medium ${diffColor}`}
            >
              <DiffIcon className="h-3 w-3" />
              {processorDiff >= 0 ? "+" : "-"}
              {formatCurrency(processorDiff)}
            </div>
          </div>

          {/* Saleyard net */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
            <span className="text-text-secondary text-xs font-medium">Saleyard (net)</span>
            <span className="text-text-primary w-24 text-right text-sm">
              {formatCurrency(preSaleNetSaleyard)}
            </span>
            <span className="text-text-primary w-24 text-right text-sm font-medium">
              {formatCurrency(actualNetSaleyard)}
            </span>
            <span
              className={`w-20 text-right text-sm ${actualNetSaleyard - preSaleNetSaleyard >= 0 ? "text-success" : "text-error"}`}
            >
              {actualNetSaleyard - preSaleNetSaleyard >= 0 ? "+" : "-"}
              {formatCurrency(actualNetSaleyard - preSaleNetSaleyard)}
            </span>
          </div>

          {/* Advantage */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg border border-white/[0.06] px-3 py-2">
            <span className="text-text-primary text-xs font-semibold">Grid IQ Advantage</span>
            <span
              className={`w-24 text-right text-sm font-semibold ${preSaleAdvantage > 0 ? "text-success" : "text-warning"}`}
            >
              {preSaleAdvantage > 0 ? "+" : "-"}
              {formatCurrency(preSaleAdvantage)}
            </span>
            <span
              className={`w-24 text-right text-sm font-bold ${actualAdvantage > 0 ? "text-success" : "text-warning"}`}
            >
              {actualAdvantage > 0 ? "+" : "-"}
              {formatCurrency(actualAdvantage)}
            </span>
            <span
              className={`w-20 text-right text-sm font-medium ${advantageDiff >= 0 ? "text-success" : "text-error"}`}
            >
              {advantageDiff >= 0 ? "+" : "-"}
              {formatCurrency(advantageDiff)}
            </span>
          </div>
        </div>

        {/* Date context */}
        <div className="text-text-muted mt-3 flex items-center justify-center gap-4 text-[10px]">
          <span>
            Estimated{" "}
            {(() => {
              const [y, m, d] = preSaleDate.split("-").map(Number);
              return new Date(y, m - 1, d).toLocaleDateString("en-AU");
            })()}
          </span>
          <span>
            Actual{" "}
            {(() => {
              const [y, m, d] = postSaleDate.split("-").map(Number);
              return new Date(y, m - 1, d).toLocaleDateString("en-AU");
            })()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
