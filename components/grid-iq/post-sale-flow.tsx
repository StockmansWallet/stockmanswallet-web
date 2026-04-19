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

type Sex = "Male" | "Female" | "Unknown";

interface SexBreakdown {
  male: number;
  female: number;
  unknown: number;
  dominant: Sex;
}

interface KillSheetOption {
  id: string;
  processorName: string;
  killDate: string | null;
  totalHeadCount: number;
  totalGrossValue: number;
  isSuggested: boolean;
  sexBreakdown: SexBreakdown;
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
  // Consignment sex composition derived from allocations. When dominant is
  // "Unknown" the picker shows no banner (truly mixed or no data).
  consignmentSex: SexBreakdown;
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

function sexLabel(sex: Sex): string {
  if (sex === "Male") return "male";
  if (sex === "Female") return "female";
  return "mixed";
}

function describeSheetSex(b: SexBreakdown): string | null {
  const parts: string[] = [];
  if (b.male > 0) parts.push(`${b.male} male`);
  if (b.female > 0) parts.push(`${b.female} female`);
  if (b.unknown > 0) parts.push(`${b.unknown} uncategorised`);
  return parts.length > 0 ? parts.join(" + ") : null;
}

interface SexWarning {
  severity: "info" | "block";
  title: string;
  detail: string;
}

function computeSexWarning(
  consignmentSex: SexBreakdown,
  selected: KillSheetOption | null
): SexWarning | null {
  if (!selected) return null;
  if (consignmentSex.dominant === "Unknown") return null;

  const ks = selected.sexBreakdown;
  const matchingHead =
    consignmentSex.dominant === "Male" ? ks.male : ks.female;
  const nonMatchingHead =
    consignmentSex.dominant === "Male" ? ks.female : ks.male;

  // Kill sheet with zero rows of the consignment's sex (e.g. all-heifer kill
  // sheet on a steer consignment). Don't let the analysis run.
  if (matchingHead === 0 && nonMatchingHead > 0) {
    return {
      severity: "block",
      title: "Kill sheet doesn't match this consignment",
      detail: `This kill sheet only contains ${sexLabel(
        consignmentSex.dominant === "Male" ? "Female" : "Male"
      )} rows, but the consignment is ${sexLabel(
        consignmentSex.dominant
      )}. Select a different kill sheet or upload the correct one.`,
    };
  }

  // Mixed sheet with some matching rows - warn that the rest will be excluded.
  if (nonMatchingHead > 0) {
    const breakdown = describeSheetSex(ks);
    return {
      severity: "info",
      title: "Mixed kill sheet",
      detail: `This kill sheet contains ${breakdown}. Your consignment is ${sexLabel(
        consignmentSex.dominant
      )}, so only the ${matchingHead} ${sexLabel(
        consignmentSex.dominant
      )} row${matchingHead === 1 ? "" : "s"} will be included in the analysis.`,
    };
  }

  return null;
}

// MARK: - Component

export function PostSaleFlow({
  consignmentId,
  processorName,
  totalHead,
  allocations,
  availableKillSheets,
  consignmentSex,
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

  // Sex-composition warning for the currently selected kill sheet. A consignment
  // with a dominant sex (Male or Female) will have non-matching rows excluded
  // from the analysis; surface that so the user knows before they run it. Zero
  // overlap (e.g. all-heifer sheet on a steer consignment) blocks the run.
  const selectedKillSheet = selectedKillSheetId
    ? availableKillSheets.find((k) => k.id === selectedKillSheetId) ?? null
    : null;
  const sexWarning = computeSexWarning(consignmentSex, selectedKillSheet);

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
                <Button size="sm" variant="teal" onClick={() => setUploadOpen(true)}>
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
                      selected ? "border-warning/50 bg-warning/10"
                        : ks.isSuggested ? "border-warning/20 hover:bg-white/[0.04]"
                        : "hover:bg-white/[0.04]"
                    }`}
                    onClick={() => setSelectedKillSheetId(selected ? null : ks.id)}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-warning/20" : "bg-white/[0.06]"}`}>
                        <FileText className={`h-4 w-4 ${selected ? "text-warning" : "text-text-muted"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-text-primary">{ks.processorName}</p>
                          {ks.isSuggested && !selected && (
                            <Badge className="shrink-0 bg-warning/15 text-[9px] text-warning">Suggested</Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-muted">
                          {formatDate(ks.killDate)} - {ks.totalHeadCount} head
                          {ks.totalGrossValue > 0 ? ` - ${formatCurrency(ks.totalGrossValue)}` : ""}
                        </p>
                      </div>
                      {selected && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {sexWarning && (
            <div
              className={`mt-3 flex items-start gap-2.5 rounded-xl border px-4 py-3 ${
                sexWarning.severity === "block"
                  ? "border-error/30 bg-error/10"
                  : "border-warning/30 bg-warning/5"
              }`}
            >
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  sexWarning.severity === "block" ? "text-error" : "text-warning"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    sexWarning.severity === "block" ? "text-error" : "text-warning"
                  }`}
                >
                  {sexWarning.title}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">{sexWarning.detail}</p>
              </div>
            </div>
          )}

          {error && <div className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">{error}</div>}

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
              variant="teal"
              disabled={
                !selectedKillSheetId ||
                isPending ||
                sexWarning?.severity === "block"
              }
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
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-success">Analysis complete</p>
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

          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium text-warning">Confirm herd allocations</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Adjust the head counts below if the actual sale differs from the original consignment.
                Once confirmed, cattle will be marked as sold and removed from herd totals.
              </p>
            </div>
          </div>

          <Card className="mb-4">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <Users className="h-4 w-4 text-warning" />
                <span className="text-sm font-semibold text-warning">Sale Allocations</span>
                <Badge className="ml-auto bg-warning/15 text-warning">
                  {adjustedAllocations.reduce((s, a) => s + a.headCount, 0)} head
                </Badge>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {adjustedAllocations.map((alloc, idx) => (
                  <div key={alloc.herdGroupId} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10">
                      <Users className="h-4 w-4 text-warning" />
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
                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-center text-sm text-text-primary focus:border-warning/50 focus:outline-none"
                      />
                    </div>
                    <span className="text-xs text-text-muted">head</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {adjustedAllocations.reduce((s, a) => s + a.headCount, 0) !== totalHead && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-xs text-warning">
                Total head count has changed from {totalHead} to {adjustedAllocations.reduce((s, a) => s + a.headCount, 0)}.
                This will update the final sale record.
              </p>
            </div>
          )}

          {error && <div className="mb-3 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">{error}</div>}

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
              variant="teal"
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
