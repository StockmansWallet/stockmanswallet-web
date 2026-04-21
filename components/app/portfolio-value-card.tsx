import { TrendingUp, TrendingDown } from "lucide-react";

interface PortfolioValueCardProps {
  value: number;
  changeDollar?: number;
  changePercent?: number;
  fallbackCount: number;
}

export function PortfolioValueCard({
  value,
  changeDollar,
  changePercent,
  fallbackCount,
}: PortfolioValueCardProps) {
  const isPositive = changePercent !== undefined && changePercent >= 0;

  return (
    <div className="bg-surface-lowest relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-text-muted text-xs font-medium tracking-widest uppercase">
            Total Herd Value
          </p>
          <p className="text-text-primary mt-2 text-4xl leading-none font-bold tabular-nums sm:text-5xl">
            ${Math.round(value).toLocaleString()}
          </p>

          {fallbackCount > 0 && (
            <span className="bg-error/15 text-error mt-3 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium">
              {fallbackCount} {fallbackCount === 1 ? "herd" : "herds"} national avg
            </span>
          )}
        </div>

        {changePercent !== undefined && (
          <div
            className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums ${
              isPositive ? "bg-success/15 text-success" : "bg-error/15 text-error"
            }`}
          >
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {changeDollar !== undefined && (
              <span>${Math.round(Math.abs(changeDollar)).toLocaleString()}</span>
            )}
            <span className="opacity-70">
              ({isPositive ? "+" : ""}
              {changePercent.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
