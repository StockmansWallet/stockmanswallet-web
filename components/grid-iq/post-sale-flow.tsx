"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Check, Loader2, Upload, ChevronRight, ChevronLeft,
  Users, AlertTriangle, Info,
} from "lucide-react";
import { runPostSaleAnalysis, confirmSale } from "@/app/(app)/dashboard/tools/grid-iq/analyse/post-sale-actions";
import { UploadModal } from "@/app/(app)/dashboard/tools/grid-iq/library/upload-modal";

// MARK: - Types

interface KillSheetOption {
  id: string;
  processorName: string;
  killDate: string | null;
  totalHeadCount: number;
  totalGrossValue: number;
  isSuggested: boolean;
}

interface AllocationInfo {
  id: string;
  herd_id: string;
  head_count: number;
  category: string | null;
  herdName: string;
}

interface PostSaleFlowProps {
  consignmentId: string;
  processorName: string;
  totalHead: number;
  allocations: AllocationInfo[];
  availableKillSheets: KillSheetOption[];
  // When set, the flow boots straight into the Confirm stage with this analysis
  // already linked, so a page refresh after running post-kill analysis lands
  // the user back on the allocations screen instead of the kill-sheet picker.
  existingAnalysisId?: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? (() => { const [y, m, d] = dateStr.split("-").map(Number); return new Date(y, m - 1, d); })()
    : new Date(dateStr);
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

// MARK: - Component

export function PostSaleFlow({
  consignmentId,
  processorName,
  totalHead,
  allocations,
  availableKillSheets,
  existingAnalysisId = null,
}: PostSaleFlowProps) {
  const router = useRouter();
  const [stage, setStage] = useState<"select" | "confirm">(
    existingAnalysisId ? "confirm" : "select"
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [selectedKillSheetId, setSelectedKillSheetId] = useState<string | null>(
    availableKillSheets.filter((ks) => ks.isSuggested).length === 1
      ? availableKillSheets.find((ks) => ks.isSuggested)!.id
      : null
  );

  const [analysisId, setAnalysisId] = useState<string | null>(existingAnalysisId);

  const [adjustedAllocations, setAdjustedAllocations] = useState(
    allocations.map((a) => ({ herdGroupId: a.herd_id, headCount: a.head_count, herdName: a.herdName, category: a.category }))
  );

  const sortedKillSheets = [...availableKillSheets].sort((a, b) => {
    if (a.isSuggested && !b.isSuggested) return -1;
    if (!a.isSuggested && b.isSuggested) return 1;
    return 0;
  });

  function handleRunAnalysis() {
    if (!selectedKillSheetId) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await runPostSaleAnalysis(consignmentId, selectedKillSheetId);
        if (result?.error) {
          setError(result.error);
        } else if (result?.analysisId) {
          setAnalysisId(result.analysisId);
          setStage("confirm");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed");
      }
    });
  }

  function handleConfirmSale() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await confirmSale(consignmentId, adjustedAllocations);
        if (result?.error) {
          setError(result.error);
        } else {
          router.push(`/dashboard/tools/grid-iq/consignments/${consignmentId}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sale confirmation failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {stage === "select" && (
        <section>
          <p className="mb-3 text-xs text-text-muted">
            Select the actual kill sheet / feedback sheet received from {processorName}.
          </p>

          {availableKillSheets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                <FileText className="h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">No unlinked kill sheets available.</p>
                <Button size="sm" variant="indigo" onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />Upload Kill Sheet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedKillSheets.map((ks) => {
                const selected = selectedKillSheetId === ks.id;
                return (
                  <Card
                    key={ks.id}
                    className={`cursor-pointer transition-all ${
                      selected ? "border-amber-500/50 bg-amber-500/10"
                        : ks.isSuggested ? "border-amber-500/20 hover:bg-white/[0.04]"
                        : "hover:bg-white/[0.04]"
                    }`}
                    onClick={() => setSelectedKillSheetId(selected ? null : ks.id)}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-amber-500/20" : "bg-white/[0.06]"}`}>
                        <FileText className={`h-4 w-4 ${selected ? "text-amber-400" : "text-text-muted"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-text-primary">{ks.processorName}</p>
                          {ks.isSuggested && !selected && (
                            <Badge className="shrink-0 bg-amber-500/15 text-[9px] text-amber-400">Suggested</Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-muted">
                          {formatDate(ks.killDate)} - {ks.totalHeadCount} head
                          {ks.totalGrossValue > 0 ? ` - ${formatCurrency(ks.totalGrossValue)}` : ""}
                        </p>
                      </div>
                      {selected && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {error && <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />Upload New
            </Button>
            <Button
              variant="indigo"
              disabled={!selectedKillSheetId || isPending}
              onClick={handleRunAnalysis}
            >
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running Analysis...</>
              ) : (
                <>Run Post-Kill Analysis <ChevronRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </section>
      )}

      {stage === "confirm" && (
        <section>
          {analysisId && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-emerald-400">Analysis complete</p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Review the allocations below, then confirm the sale to mark cattle as sold.
                </p>
              </div>
              <Link
                href={`/dashboard/tools/grid-iq/analysis/${analysisId}`}
                className="shrink-0 self-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
              >
                View Full Analysis
              </Link>
            </div>
          )}

          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-400">Confirm herd allocations</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Adjust the head counts below if the actual sale differs from the original consignment.
                Once confirmed, cattle will be marked as sold and removed from herd totals.
              </p>
            </div>
          </div>

          <Card className="mb-4">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <Users className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">Sale Allocations</span>
                <Badge className="ml-auto bg-amber-500/15 text-amber-400">
                  {adjustedAllocations.reduce((s, a) => s + a.headCount, 0)} head
                </Badge>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {adjustedAllocations.map((alloc, idx) => (
                  <div key={alloc.herdGroupId} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                      <Users className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">{alloc.herdName}</p>
                      <p className="text-xs text-text-muted">{alloc.category ?? "Cattle"}</p>
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        min={0}
                        value={alloc.headCount}
                        onChange={(e) => {
                          const updated = [...adjustedAllocations];
                          updated[idx] = { ...updated[idx], headCount: parseInt(e.target.value) || 0 };
                          setAdjustedAllocations(updated);
                        }}
                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-center text-sm text-text-primary focus:border-amber-500/50 focus:outline-none"
                      />
                    </div>
                    <span className="text-xs text-text-muted">head</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {adjustedAllocations.reduce((s, a) => s + a.headCount, 0) !== totalHead && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-400">
                Total head count has changed from {totalHead} to {adjustedAllocations.reduce((s, a) => s + a.headCount, 0)}.
                This will update the final sale record.
              </p>
            </div>
          )}

          {error && <div className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
              onClick={() => setStage("select")}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />Back
            </Button>
            <Button
              variant="indigo"
              disabled={isPending || adjustedAllocations.every((a) => a.headCount <= 0)}
              onClick={handleConfirmSale}
            >
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirming Sale...</>
              ) : (
                "Confirm Sale"
              )}
            </Button>
          </div>
        </section>
      )}

      <UploadModal
        open={uploadOpen}
        initialType="killsheet"
        onClose={() => setUploadOpen(false)}
      />
    </div>
  );
}
