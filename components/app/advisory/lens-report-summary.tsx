"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, TrendingDown, TrendingUp } from "lucide-react";
import type { LensReport } from "@/lib/types/lens-report";
import type { AdvisorLens } from "@/lib/types/advisor-lens";

interface HerdData {
  id: string;
  name: string;
  category: string;
  breed: string;
  head_count: number;
}

interface LensReportSummaryProps {
  report: LensReport;
  lensRows: AdvisorLens[];
  herds: HerdData[];
}

export function LensReportSummary({
  report,
  lensRows,
  herds,
}: LensReportSummaryProps) {
  const totalBaseline = report.total_baseline_value ?? 0;
  const totalAdjusted = report.total_adjusted_value ?? 0;
  const totalShaded = report.total_shaded_value ?? 0;
  const totalHead = lensRows.reduce((sum, l) => {
    const h = herds.find((h) => h.id === l.herd_id);
    const adj = l.head_count_adjustment ?? 0;
    return sum + ((h?.head_count ?? 0) + adj);
  }, 0);

  const adjustmentDelta = totalAdjusted - totalBaseline;
  const shadingDelta = totalShaded - totalAdjusted;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Client Value"
          value={totalBaseline}
          icon={<DollarSign className="h-4 w-4" />}
          muted
        />
        <SummaryCard
          label="Adjusted Value"
          value={totalAdjusted}
          delta={adjustmentDelta}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <SummaryCard
          label="Shaded Value"
          value={totalShaded}
          delta={shadingDelta}
          icon={<TrendingDown className="h-4 w-4" />}
          primary
        />
        <SummaryCard
          label="Total Head"
          value={totalHead}
          icon={<Users className="h-4 w-4" />}
          isCurrency={false}
        />
      </div>

      {/* Per-herd breakdown */}
      <Card>
        <CardContent className="py-4 px-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Herd Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-xs">
                  <th className="text-left font-medium pb-2 pr-4">Herd</th>
                  <th className="text-right font-medium pb-2 pr-4">Head</th>
                  <th className="text-right font-medium pb-2 pr-4">Client Value</th>
                  <th className="text-right font-medium pb-2 pr-4">Adjusted</th>
                  <th className="text-right font-medium pb-2 pr-4">Shaded</th>
                  <th className="text-center font-medium pb-2 pr-4">Shading %</th>
                  <th className="text-left font-medium pb-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {lensRows.map((lens) => {
                  const herd = herds.find((h) => h.id === lens.herd_id);
                  if (!herd) return null;
                  const adjHead = (herd.head_count ?? 0) + (lens.head_count_adjustment ?? 0);

                  return (
                    <tr key={lens.id} className="border-t border-border/50">
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-text-primary">{herd.name || "Unnamed"}</div>
                        <div className="text-xs text-text-muted">{herd.breed} {herd.category}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-text-secondary">
                        {adjHead}
                        {lens.head_count_adjustment != null && lens.head_count_adjustment !== 0 && (
                          <span className="text-xs text-text-muted ml-1">
                            ({lens.head_count_adjustment > 0 ? "+" : ""}{lens.head_count_adjustment})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-text-secondary">
                        ${(lens.cached_baseline_value ?? 0).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium text-text-primary">
                        ${(lens.cached_advisor_value ?? 0).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-[#2F8CD9]">
                        ${(lens.cached_shaded_value ?? 0).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        <Badge
                          className={
                            (lens.shading_percentage ?? 100) !== 100
                              ? "bg-amber-500/15 text-amber-600"
                              : "bg-surface-raised text-text-muted"
                          }
                        >
                          {lens.shading_percentage ?? 100}%
                        </Badge>
                      </td>
                      <td className="py-2.5 text-xs text-text-muted max-w-[200px] truncate">
                        {lens.advisor_notes || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="py-2.5 pr-4 font-semibold text-text-primary">Total</td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-text-primary">{totalHead}</td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-text-secondary">
                    ${totalBaseline.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-text-primary">
                    ${totalAdjusted.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-bold text-[#2F8CD9]">
                    ${totalShaded.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  delta,
  icon,
  muted,
  primary,
  isCurrency = true,
}: {
  label: string;
  value: number;
  delta?: number;
  icon: React.ReactNode;
  muted?: boolean;
  primary?: boolean;
  isCurrency?: boolean;
}) {
  return (
    <Card className={primary ? "border-[#2F8CD9]/30 bg-[#2F8CD9]/5" : ""}>
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-2 mb-1">
          <div className={`${primary ? "text-[#2F8CD9]" : "text-text-muted"}`}>{icon}</div>
          <span className="text-xs text-text-muted">{label}</span>
        </div>
        <p className={`text-xl font-bold ${primary ? "text-[#2F8CD9]" : muted ? "text-text-secondary" : "text-text-primary"}`}>
          {isCurrency
            ? `$${value.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`
            : value.toLocaleString("en-AU")}
        </p>
        {delta != null && delta !== 0 && (
          <p className={`text-xs mt-0.5 ${delta > 0 ? "text-success" : "text-error"}`}>
            {delta > 0 ? "+" : ""}${delta.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
