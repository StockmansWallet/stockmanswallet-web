import { TrendingUp, TrendingDown } from "lucide-react";

interface PortfolioValueCardProps {
  value: number;
  changeDollar?: number;
  changePercent?: number;
  fallbackCount: number;
}

export function PortfolioValueCard({ value, changeDollar, changePercent, fallbackCount }: PortfolioValueCardProps) {
  const isPositive = changePercent !== undefined && changePercent >= 0;

  return (
    <div className="flex rounded-2xl bg-surface-lowest p-5 backdrop-blur-xl">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Total Value</p>
        <p className="mt-1.5 text-xl font-bold text-text-primary">
          ${Math.round(value).toLocaleString()}
        </p>
        {changePercent !== undefined && (
          <p
            className={`mt-1 flex items-center gap-1 text-xs font-medium ${
              isPositive ? "text-success" : "text-error"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {changeDollar !== undefined && (
              <>${Math.round(Math.abs(changeDollar)).toLocaleString()}</>
            )}
            <span className="opacity-60">
              {isPositive ? "+" : ""}{changePercent.toFixed(1)}%
            </span>
          </p>
        )}
        {fallbackCount > 0 && (
          <span className="mt-1.5 inline-flex items-center rounded-full bg-error/15 px-1.5 py-0.5 text-[10px] font-medium text-error">
            {fallbackCount} {fallbackCount === 1 ? "herd" : "herds"} national avg
          </span>
        )}
      </div>
    </div>
  );
}
