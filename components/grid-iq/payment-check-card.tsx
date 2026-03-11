// Payment check card - displays results of auditing kill sheet payments against grid pricing.
// Shows discrepancies between expected grid price and actual price paid per head.

import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, CheckCircle } from "lucide-react";
import type { PaymentCheckResult } from "@/lib/engines/grid-iq-payment-check";

interface PaymentCheckCardProps {
  result: PaymentCheckResult;
}

export function PaymentCheckCard({ result }: PaymentCheckCardProps) {
  const totalDiff = result.totalActualValue - result.totalExpectedValue;
  const hasDiscrepancies = result.lineDiscrepancies.length > 0;
  const allMatched = !hasDiscrepancies;
  const totalChecked = result.matchCount + result.lineDiscrepancies.length;

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${allMatched ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
              {allMatched ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <p className="text-sm font-semibold text-text-primary">Payment Check</p>
          </div>
          <span className={`text-xs font-medium ${allMatched ? "text-emerald-400" : "text-amber-400"}`}>
            {result.matchCount}/{totalChecked} match
          </span>
        </div>

        {/* Summary */}
        {allMatched ? (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle className="h-3 w-3" />
            All line items match grid pricing
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {/* Total difference */}
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">
                {result.lineDiscrepancies.length} discrepanc{result.lineDiscrepancies.length === 1 ? "y" : "ies"} found
              </span>
              <span className={totalDiff >= 0 ? "text-emerald-400" : "text-amber-400"}>
                {totalDiff >= 0 ? "+" : ""}${Math.round(totalDiff).toLocaleString()}
              </span>
            </div>

            {/* Discrepancy table */}
            <div className="overflow-x-auto rounded-lg ring-1 ring-inset ring-white/[0.06]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-text-muted">
                    <th className="px-2.5 py-2 font-medium">#</th>
                    <th className="px-2.5 py-2 font-medium">Grade</th>
                    <th className="px-2.5 py-2 font-medium text-right">Expected</th>
                    <th className="px-2.5 py-2 font-medium text-right">Actual</th>
                    <th className="px-2.5 py-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lineDiscrepancies.slice(0, 20).map((d, i) => {
                    const diff = d.actualPricePerKg - d.expectedPricePerKg;
                    return (
                      <tr
                        key={i}
                        className="border-b border-white/[0.03] last:border-0"
                      >
                        <td className="px-2.5 py-1.5 text-text-secondary">{d.bodyNumber}</td>
                        <td className="px-2.5 py-1.5 font-medium text-text-primary">{d.gradeCode}</td>
                        <td className="px-2.5 py-1.5 text-right text-text-secondary">
                          ${d.expectedPricePerKg.toFixed(2)}
                        </td>
                        <td className="px-2.5 py-1.5 text-right">
                          <span className={diff >= 0 ? "text-emerald-400" : "text-amber-400"}>
                            ${d.actualPricePerKg.toFixed(2)}
                          </span>
                        </td>
                        <td className="max-w-[150px] truncate px-2.5 py-1.5 text-text-muted">
                          {d.reason || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {result.lineDiscrepancies.length > 20 && (
              <p className="text-center text-[10px] text-text-muted">
                Showing 20 of {result.lineDiscrepancies.length} discrepancies
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
