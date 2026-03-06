import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PortfolioValueCardProps {
  value: number;
  changePercent?: number;
  fallbackCount: number;
}

export function PortfolioValueCard({ value, changePercent, fallbackCount }: PortfolioValueCardProps) {
  const isPositive = changePercent !== undefined && changePercent >= 0;

  return (
    <Card>
      <CardContent className="p-5">
        <p className="mb-1 text-xs text-text-muted">Total Portfolio Value</p>
        <div className="flex items-baseline gap-3">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            ${Math.round(value).toLocaleString()}
          </h2>
          {changePercent !== undefined && (
            <span
              className={`flex items-center gap-1 text-sm font-medium ${
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
        {fallbackCount > 0 && (
          <span className="mt-2 inline-flex items-center rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
            {fallbackCount} {fallbackCount === 1 ? "herd" : "herds"} using national avg
          </span>
        )}
      </CardContent>
    </Card>
  );
}
