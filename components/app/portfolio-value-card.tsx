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
  const valuationContext =
    fallbackCount > 0
      ? `${fallbackCount} ${fallbackCount === 1 ? "herd" : "herds"} using national averages`
      : "All active herds priced from saleyard data";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-6 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-text-muted text-xs font-medium tracking-widest uppercase">
            Total Herd Value
          </p>
          <p className="text-text-primary mt-2 text-4xl leading-none font-bold tabular-nums sm:text-5xl">
            ${Math.round(value).toLocaleString()}
          </p>
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

      <div className="border-border-subtle mt-5 flex flex-col gap-2 border-t pt-4 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Updated today</span>
        <span>{valuationContext}</span>
      </div>
    </div>
  );
}
