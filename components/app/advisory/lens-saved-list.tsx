"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, FileText, Clock } from "lucide-react";
import type { LensReport } from "@/lib/types/lens-report";
import { LensWizard } from "./lens-wizard";
import type { HerdInfo } from "./lens-herd-card";

interface LensSavedListProps {
  connectionId: string;
  lensReports: LensReport[];
  herds: HerdInfo[];
  herdValues: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-amber-500/15 text-amber-600" },
  saved: { label: "Saved", className: "bg-[#2F8CD9]/15 text-[#2F8CD9]" },
  report_generated: { label: "Report Ready", className: "bg-emerald-500/15 text-emerald-600" },
};

export function LensSavedList({
  connectionId,
  lensReports,
  herds,
  herdValues,
}: LensSavedListProps) {
  const [showWizard, setShowWizard] = useState(false);

  if (showWizard) {
    return (
      <LensWizard
        connectionId={connectionId}
        herds={herds}
        herdValues={herdValues}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Advisor Lens Reports</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Create valuation assessments with adjusted herd assumptions for lending documentation.
          </p>
        </div>
        <Button variant="advisor" size="sm" onClick={() => setShowWizard(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Lens
        </Button>
      </div>

      {/* List */}
      {lensReports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#2F8CD9]/10">
              <Eye className="h-6 w-6 text-[#2F8CD9]" />
            </div>
            <h4 className="text-sm font-semibold text-text-primary mb-1">
              No Lens Reports Yet
            </h4>
            <p className="text-xs text-text-muted mb-4 max-w-xs mx-auto">
              Create your first lens to assess this client&apos;s herds with
              customised assumptions for bank lending documentation.
            </p>
            <Button variant="advisor" size="sm" onClick={() => setShowWizard(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create First Lens
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lensReports.map((report) => {
            const statusConfig = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.draft;
            return (
              <Link
                key={report.id}
                href={`/dashboard/advisor/clients/${connectionId}/lens/${report.id}`}
              >
                <Card className="hover:bg-surface-raised/50 transition-colors cursor-pointer">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2F8CD9]/10">
                          <FileText className="h-4 w-4 text-[#2F8CD9]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-text-primary">
                            {report.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={statusConfig.className}>
                              {statusConfig.label}
                            </Badge>
                            <span className="flex items-center gap-1 text-[10px] text-text-muted">
                              <Clock className="h-3 w-3" />
                              {new Date(report.created_at).toLocaleDateString("en-AU")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {report.total_shaded_value != null && (
                          <div>
                            <p className="text-xs text-text-muted">Shaded Value</p>
                            <p className="text-sm font-semibold text-text-primary">
                              ${report.total_shaded_value.toLocaleString("en-AU", {
                                maximumFractionDigits: 0,
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
