// Per-category breakdown table for multi-herd consignment analyses
// Displays each allocation's processor vs saleyard comparison with a combined total row

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, CheckCircle, TrendingUp, AlertTriangle } from "lucide-react";

interface CategoryRow {
  herdGroupId: string;
  herdName: string;
  category: string;
  headCount: number;
  netSaleyardValue: number;
  netProcessorValue: number;
  gridIQAdvantage: number;
  sellWindowStatus: string;
  daysToTarget: number | null;
  dressingPercentage: number;
  realisationFactor: number;
  isUsingPersonalisedData: boolean;
}

interface CategoryBreakdownProps {
  categoryResults: CategoryRow[];
  totalHead: number;
  totalNetSaleyard: number;
  totalNetProcessor: number;
  totalAdvantage: number;
}

function formatCurrency(value: number): string {
  return `$${Math.abs(Math.round(value)).toLocaleString()}`;
}

function sellWindowIcon(status: string) {
  switch (status) {
    case "ON_TARGET":
      return { icon: CheckCircle, color: "text-success" };
    case "EARLY":
      return { icon: TrendingUp, color: "text-teal" };
    case "RISK_OF_OVERWEIGHT":
      return { icon: AlertTriangle, color: "text-warning" };
    default:
      return { icon: Clock, color: "text-text-muted" };
  }
}

export function CategoryBreakdown({
  categoryResults,
  totalHead,
  totalNetSaleyard,
  totalNetProcessor,
  totalAdvantage,
}: CategoryBreakdownProps) {
  if (!categoryResults || categoryResults.length <= 1) return null;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <Users className="h-4 w-4 text-teal" />
          <span className="text-sm font-semibold text-teal">Per-Category Breakdown</span>
          <Badge className="ml-auto bg-teal/15 text-teal">
            {categoryResults.length} allocations
          </Badge>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 border-b border-white/[0.06] px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
          <span>Category</span>
          <span className="w-12 text-right">Head</span>
          <span className="w-20 text-right">Processor</span>
          <span className="w-20 text-right">Saleyard</span>
          <span className="w-20 text-right">Advantage</span>
        </div>

        {/* Category rows */}
        <div className="divide-y divide-white/[0.04]">
          {categoryResults.map((row) => {
            const isProcessor = row.gridIQAdvantage > 0;
            const sw = sellWindowIcon(row.sellWindowStatus);
            const SwIcon = sw.icon;
            return (
              <div
                key={row.herdGroupId}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{row.herdName}</p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
                    <span>{row.category ?? "Cattle"}</span>
                    <SwIcon className={`h-3 w-3 ${sw.color}`} />
                    {row.daysToTarget !== null && (
                      <span className="text-[10px]">{row.daysToTarget}d</span>
                    )}
                  </div>
                </div>
                <span className="w-12 text-right text-sm text-text-primary">{row.headCount}</span>
                <span className="w-20 text-right text-sm text-text-primary">
                  {formatCurrency(row.netProcessorValue)}
                </span>
                <span className="w-20 text-right text-sm text-text-primary">
                  {formatCurrency(row.netSaleyardValue)}
                </span>
                <span className={`w-20 text-right text-sm font-semibold ${isProcessor ? "text-success" : "text-warning"}`}>
                  {isProcessor ? "+" : "-"}{formatCurrency(row.gridIQAdvantage)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Total row */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 border-t border-white/[0.08] bg-white/[0.02] px-4 py-3">
          <span className="text-sm font-bold text-text-primary">Total</span>
          <span className="w-12 text-right text-sm font-bold text-text-primary">{totalHead}</span>
          <span className="w-20 text-right text-sm font-bold text-text-primary">
            {formatCurrency(totalNetProcessor)}
          </span>
          <span className="w-20 text-right text-sm font-bold text-text-primary">
            {formatCurrency(totalNetSaleyard)}
          </span>
          <span className={`w-20 text-right text-sm font-bold ${totalAdvantage > 0 ? "text-success" : "text-warning"}`}>
            {totalAdvantage > 0 ? "+" : "-"}{formatCurrency(totalAdvantage)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
