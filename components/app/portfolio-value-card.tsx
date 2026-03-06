import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PortfolioValueCardProps {
  value: number;
  changePercent?: number;
  fallbackCount: number;
  totalHead: number;
  herdCount: number;
  propertyCount: number;
}

export function PortfolioValueCard({ value, changePercent, fallbackCount, totalHead, herdCount, propertyCount }: PortfolioValueCardProps) {
  const isPositive = changePercent !== undefined && changePercent >= 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="mb-1 text-xs text-text-muted">Total Herd Value</p>
          {fallbackCount > 0 && (
            <span className="inline-flex items-center rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
              {fallbackCount} {fallbackCount === 1 ? "herd" : "herds"} using national avg
            </span>
          )}
        </div>
        <div className="flex flex-col items-center py-2">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            ${Math.round(value).toLocaleString()}
          </h2>
          {changePercent !== undefined && (
            <span
              className={`mt-1 flex items-center gap-1 text-sm font-medium ${
                isPositive ? "text-success" : "text-error"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {isPositive ? "+" : ""}
              {changePercent.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
          <div className="text-center">
            <p className="text-xl font-bold text-text-primary">{totalHead.toLocaleString()}</p>
            <p className="text-[11px] text-text-muted">Head</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-text-primary">{herdCount}</p>
            <p className="text-[11px] text-text-muted">Herds</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-text-primary">{propertyCount}</p>
            <p className="text-[11px] text-text-muted">Properties</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
