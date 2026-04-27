"use client";

import { useState, useTransition, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calculator } from "lucide-react";
import { fetchAccountantReport } from "./actions";
import { ReportExportButton } from "@/components/app/report-export-button";
import type { ReportData } from "@/lib/types/reports";

export default function AccountantReportPage() {
  // Financial year options (Australian FY: 1 Jul - 30 Jun)
  const fyOptions = [
    {
      label: "FY2025 (1 Jul 2024 - 30 Jun 2025)",
      short: "FY2025",
      start: "2024-07-01",
      end: "2025-06-30",
    },
    {
      label: "FY2026 (1 Jul 2025 - 30 Jun 2026)",
      short: "FY2026",
      start: "2025-07-01",
      end: "2026-06-30",
    },
  ];

  const [selectedFY, setSelectedFY] = useState(fyOptions[1]); // Default to current FY
  const [openingBookValue, setOpeningBookValue] = useState("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isPending, startTransition] = useTransition();

  // Generate report when FY changes or user clicks generate
  function handleGenerate() {
    startTransition(async () => {
      const data = await fetchAccountantReport(
        selectedFY.start,
        selectedFY.end,
        parseFloat(openingBookValue) || 0,
        selectedFY.label,
        selectedFY.short
      );
      setReportData(data);
    });
  }

  // Auto-generate on mount with defaults
  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snap = reportData?.accountantSnapshot;

  return (
    <div>
      <PageHeader
        feature="reports"
        title="Accountant Report"
        titleClassName="text-4xl font-bold text-reports"
        subtitle="Financial year reconciliation statement for your accountant."
        actions={
          snap ? (
            <ReportExportButton
              label="Download"
              reportType="accountant"
              extraConfig={{
                fy: selectedFY.short,
                openingBook: openingBookValue || "0",
              }}
            />
          ) : undefined
        }
      />

      {/* Configuration */}
      <Card className="mb-4">
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Financial Year */}
            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-medium">Financial Year</label>
              <select
                value={selectedFY.short}
                onChange={(e) => {
                  const fy = fyOptions.find((f) => f.short === e.target.value)!;
                  setSelectedFY(fy);
                }}
                className="border-border bg-surface text-text-primary focus:border-reports/40 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                {fyOptions.map((fy) => (
                  <option key={fy.short} value={fy.short}>
                    {fy.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Opening Book Value */}
            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-medium">Opening Book Value ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={openingBookValue}
                onChange={(e) => setOpeningBookValue(e.target.value)}
                placeholder="0.00"
                className="border-border bg-surface"
              />
              <p className="text-text-muted text-[10px]">
                Your livestock book value at the start of the financial year.
              </p>
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={handleGenerate} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Calculator className="mr-1.5 h-3.5 w-3.5" />
            )}
            Generate Statement
          </Button>
        </CardContent>
      </Card>

      {/* Statement Preview */}
      {snap && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Accounting Summary - {snap.financialYearShortTitle}</CardTitle>
                  <p className="text-text-muted mt-1 text-xs">
                    {new Date(snap.generatedAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    ,{" "}
                    {new Date(snap.generatedAt).toLocaleTimeString("en-AU", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
                <Badge className="bg-reports/15 text-reports">Statement</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="border-border bg-surface-raised/30 divide-y divide-white/[0.06] rounded-xl border">
                <StatementRow label="Opening Book Value" amount={snap.openingBookValue} />
                <StatementRow label="Purchases Recorded" amount={snap.purchasesRecorded} />
                <StatementRow label="Sales Recorded" amount={snap.salesRecorded} />
                <StatementRow
                  label="Modelled Closing Book Position"
                  amount={snap.modelledClosingBookPosition}
                />
                <StatementRow
                  label="Market Value (at June 30)"
                  amount={snap.marketValuationAtYearEnd}
                />
                <StatementRow
                  label="Closing Book Value"
                  amount={snap.marketMinusBookDifference}
                  emphasis
                />
              </div>

              <p className="text-text-muted mt-4 text-[11px] leading-relaxed">
                Notes: Purchases are currently estimated from herds created during the selected
                financial year. Sales are derived from recorded Stockman&apos;s Wallet sales
                transactions.
              </p>
            </CardContent>
          </Card>

        </>
      )}

      {isPending && !snap && (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="text-text-muted mx-auto h-6 w-6 animate-spin" />
            <p className="text-text-muted mt-2 text-sm">Generating statement...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatementRow({
  label,
  amount,
  emphasis,
}: {
  label: string;
  amount: number;
  emphasis?: boolean;
}) {
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span
        className={`text-sm ${emphasis ? "text-text-primary font-semibold" : "text-text-secondary"}`}
      >
        {label}
      </span>
      <span
        className={`text-sm tabular-nums ${emphasis ? "text-text-primary font-semibold" : "text-text-secondary"}`}
      >
        {formatted}
      </span>
    </div>
  );
}
