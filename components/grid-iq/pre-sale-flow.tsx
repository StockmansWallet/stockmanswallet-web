"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Grid3x3, FileText, Target, Check, Loader2, AlertTriangle,
  Upload, Plus, Trash2, ChevronRight, ChevronLeft, Info,
} from "lucide-react";
import Link from "next/link";
import { createPreSaleAnalysis } from "@/app/(app)/dashboard/tools/grid-iq/analyse/pre-sale-actions";

// MARK: - Types

interface GridSummary {
  id: string;
  processor_name: string;
  grid_code: string | null;
  grid_date: string | null;
  expiry_date: string | null;
  entries: unknown[];
  location_latitude: number | null;
  location_longitude: number | null;
  created_at: string;
}

interface HerdSummary {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string | null;
  category: string;
  head_count: number;
}

interface KillSheetSummary {
  id: string;
  processor_name: string;
  grid_code: string | null;
  kill_date: string | null;
  total_head_count: number | null;
  total_gross_value: number | null;
}

interface Allocation {
  key: string;
  herdGroupId: string;
  headCount: number;
  category: string;
}

interface PreSaleFlowProps {
  grids: GridSummary[];
  herds: HerdSummary[];
  killSheets: KillSheetSummary[];
}

// MARK: - Helpers

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return `$${Math.round(value).toLocaleString()}`;
}

// MARK: - Component

export function PreSaleFlow({ grids, herds, killSheets }: PreSaleFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Step 1: Grid
  const [selectedGridId, setSelectedGridId] = useState<string | null>(null);
  const selectedGrid = grids.find((g) => g.id === selectedGridId);

  // Step 2: Kill sheets (user selects which to use for producer profile)
  const killSheetCount = killSheets.length;
  const [selectedKillSheetIds, setSelectedKillSheetIds] = useState<Set<string>>(
    () => new Set(killSheets.slice(0, 3).map((ks) => ks.id))
  );
  const [showAllKillSheets, setShowAllKillSheets] = useState(false);

  function toggleKillSheet(id: string) {
    setSelectedKillSheetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Step 3: Consignment builder
  const [processorName, setProcessorName] = useState("");
  const [plantLocation, setPlantLocation] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [killDate, setKillDate] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([
    { key: crypto.randomUUID(), herdGroupId: "", headCount: 0, category: "" },
  ]);

  // Auto-fill processor name when grid selected
  function handleGridSelect(gridId: string | null) {
    setSelectedGridId(gridId);
    if (gridId) {
      const g = grids.find((gr) => gr.id === gridId);
      if (g && !processorName) setProcessorName(g.processor_name);
    }
  }

  // Allocation management
  const usedHerdIds = new Set(allocations.map((a) => a.herdGroupId).filter(Boolean));
  const totalHead = allocations.reduce((s, a) => s + (a.headCount || 0), 0);

  function addAllocation() {
    setAllocations([...allocations, { key: crypto.randomUUID(), herdGroupId: "", headCount: 0, category: "" }]);
  }

  function removeAllocation(key: string) {
    if (allocations.length <= 1) return;
    setAllocations(allocations.filter((a) => a.key !== key));
  }

  function updateAllocation(key: string, field: string, value: string | number) {
    setAllocations(allocations.map((a) => {
      if (a.key !== key) return a;
      const updated = { ...a, [field]: value };
      if (field === "herdGroupId") {
        const herd = herds.find((h) => h.id === value);
        if (herd) updated.category = herd.category;
      }
      return updated;
    }));
  }

  // Validation
  const validAllocations = allocations.filter((a) => a.herdGroupId && a.headCount > 0);
  const canGenerate = selectedGridId && validAllocations.length > 0 && totalHead > 0;

  function handleGenerate() {
    if (!canGenerate) return;
    setError(null);

    const formData = new FormData();
    formData.set("gridId", selectedGridId!);
    formData.set("processorName", processorName);
    formData.set("plantLocation", plantLocation);
    formData.set("bookingReference", bookingReference);
    formData.set("killDate", killDate);
    formData.set("notes", notes);
    formData.set("allocations", JSON.stringify(
      validAllocations.map((a) => ({
        herdGroupId: a.herdGroupId,
        headCount: a.headCount,
        category: a.category,
      }))
    ));
    if (selectedKillSheetIds.size > 0) {
      formData.set("killSheetIds", JSON.stringify([...selectedKillSheetIds]));
    }

    startTransition(async () => {
      try {
        const result = await createPreSaleAnalysis(formData);
        if (result?.error) {
          setError(result.error);
        } else if (result?.analysisId) {
          router.push(`/dashboard/tools/grid-iq/analysis/${result.analysisId}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step === s
                ? "bg-teal-500 text-white"
                : step > s
                  ? "bg-teal-500/20 text-teal-400"
                  : "bg-white/[0.08] text-text-muted"
            }`}
          >
            {step > s ? <Check className="h-3.5 w-3.5" /> : s}
          </button>
        ))}
        <div className="ml-2 text-sm font-medium text-text-primary">
          {step === 1 && "Select Processor Grid"}
          {step === 2 && "Historical Kill Sheets"}
          {step === 3 && "Build Consignment"}
        </div>
      </div>

      {/* Step 1: Select Grid */}
      {step === 1 && (
        <section>
          <p className="mb-3 text-xs text-text-muted">
            Choose the processor grid to analyse against. Only one grid is used per analysis.
          </p>

          {grids.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                <Grid3x3 className="h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">No processor grids uploaded yet.</p>
                <Link href="/dashboard/tools/grid-iq/upload?type=grid">
                  <Button size="sm" variant="teal">
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload Grid
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {grids.map((grid) => {
                const expired = isExpired(grid.expiry_date);
                const selected = selectedGridId === grid.id;
                return (
                  <Card
                    key={grid.id}
                    className={`cursor-pointer transition-all ${
                      selected ? "border-teal-500/50 bg-teal-500/10" : "hover:bg-white/[0.04]"
                    }`}
                    onClick={() => handleGridSelect(selected ? null : grid.id)}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-teal-500/20" : "bg-white/[0.06]"}`}>
                        <Grid3x3 className={`h-4 w-4 ${selected ? "text-teal-400" : "text-text-muted"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{grid.processor_name}</p>
                        <p className="text-xs text-text-muted">
                          {grid.grid_code ? `${grid.grid_code} - ` : ""}{formatDate(grid.grid_date)}
                          {grid.entries ? ` - ${(grid.entries as unknown[]).length} entries` : ""}
                        </p>
                      </div>
                      {expired && (
                        <Badge variant="danger" className="shrink-0 text-[10px]">
                          <AlertTriangle className="mr-0.5 h-3 w-3" />Expired
                        </Badge>
                      )}
                      {selected && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Link href="/dashboard/tools/grid-iq/upload?type=grid">
              <Button variant="ghost" size="sm">
                <Upload className="mr-1 h-3 w-3" />Upload New Grid
              </Button>
            </Link>
            <Button variant="teal" disabled={!selectedGridId} onClick={() => setStep(2)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Step 2: Historical Kill Sheets */}
      {step === 2 && (
        <section>
          <p className="mb-3 text-xs text-text-muted">
            Select historical kill sheets to personalise this analysis. Deselect any you don&apos;t want included.
          </p>

          {killSheetCount === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                <FileText className="h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">No kill sheets uploaded yet.</p>
                <p className="text-xs text-text-muted">Grid IQ will use industry averages for this analysis.</p>
                <Link href="/dashboard/tools/grid-iq/upload?type=killsheet">
                  <Button size="sm" variant="teal">
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload Kill Sheet
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Selectable kill sheet cards */}
              <div className="flex flex-col gap-2">
                {(showAllKillSheets ? killSheets : killSheets.slice(0, 3)).map((ks) => {
                  const isSelected = selectedKillSheetIds.has(ks.id);
                  return (
                    <Card
                      key={ks.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? "border-teal-500/50 bg-teal-500/10" : "hover:bg-white/[0.04]"
                      }`}
                      onClick={() => toggleKillSheet(ks.id)}
                    >
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          isSelected
                            ? "border-teal-500 bg-teal-500"
                            : "border-white/[0.15] bg-white/[0.04]"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                          <FileText className={`h-4 w-4 ${isSelected ? "text-teal-400" : "text-text-muted"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">{ks.processor_name}</p>
                          <p className="text-xs text-text-muted">
                            {formatDate(ks.kill_date)} - {ks.total_head_count ?? 0} head
                            {ks.total_gross_value ? ` - ${formatCurrency(ks.total_gross_value)}` : ""}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Show more / less toggle + actions */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {killSheetCount > 3 && !showAllKillSheets && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowAllKillSheets(true)}>
                      Show all {killSheetCount} kill sheets
                    </Button>
                  )}
                  {showAllKillSheets && killSheetCount > 3 && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowAllKillSheets(false)}>
                      Show fewer
                    </Button>
                  )}
                </div>
                <Link href="/dashboard/tools/grid-iq/upload?type=killsheet">
                  <Button size="sm" variant="ghost" className="text-xs">
                    <Upload className="mr-1 h-3 w-3" />Upload More
                  </Button>
                </Link>
              </div>

              {/* Selection summary */}
              <p className="mt-2 text-xs text-text-muted">
                {selectedKillSheetIds.size} of {killSheetCount} selected
                {selectedKillSheetIds.size === 0 && " - industry averages will be used"}
              </p>
            </>
          )}

          {/* Accuracy note - below kill sheets */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
            <div>
              <p className="text-sm font-medium text-teal-400">Improve your accuracy</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                The more kill sheets you upload, the more accurate your processor analysis will become.
                Grid IQ uses your historical kill data to personalise dressing percentages, realisation factors,
                and grade predictions.
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />Back
            </Button>
            <Button variant="teal" onClick={() => setStep(3)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Step 3: Build Consignment */}
      {step === 3 && (
        <section>
          <p className="mb-3 text-xs text-text-muted">
            Select cattle from your herd groups to build a processor consignment. Cattle are not sold yet.
          </p>

          {/* Processor details */}
          <Card className="mb-4">
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold text-text-primary">Processor Details</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] text-text-muted">Processor Name</label>
                  <input
                    type="text"
                    value={processorName}
                    onChange={(e) => setProcessorName(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-teal-500/50 focus:outline-none"
                    placeholder="e.g. JBS Dinmore"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-text-muted">Plant Location</label>
                  <input
                    type="text"
                    value={plantLocation}
                    onChange={(e) => setPlantLocation(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-teal-500/50 focus:outline-none"
                    placeholder="e.g. Dinmore, QLD"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-text-muted">Booking Reference</label>
                  <input
                    type="text"
                    value={bookingReference}
                    onChange={(e) => setBookingReference(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-teal-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-text-muted">Kill Date</label>
                  <input
                    type="date"
                    value={killDate}
                    onChange={(e) => setKillDate(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-text-primary focus:border-teal-500/50 focus:outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Herd allocations */}
          <Card className="mb-4">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text-primary">Herd Allocations</p>
                <Badge className="bg-teal-500/15 text-teal-400">{totalHead} head</Badge>
              </div>

              {herds.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <Target className="h-6 w-6 text-text-muted" />
                  <p className="text-xs text-text-muted">No cattle herds in your portfolio.</p>
                  <Link href="/dashboard/herds">
                    <Button size="sm" variant="teal">Add Herd</Button>
                  </Link>
                </div>
              ) : (
                <>
                  {allocations.map((alloc, idx) => {
                    const herd = herds.find((h) => h.id === alloc.herdGroupId);
                    const maxHead = herd?.head_count ?? 0;
                    return (
                      <div key={alloc.key} className="flex items-end gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="flex-1">
                          <label className="mb-1 block text-[11px] text-text-muted">Herd Group</label>
                          <select
                            value={alloc.herdGroupId}
                            onChange={(e) => updateAllocation(alloc.key, "herdGroupId", e.target.value)}
                            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-text-primary focus:border-teal-500/50 focus:outline-none"
                          >
                            <option value="">Select herd...</option>
                            {herds
                              .filter((h) => !usedHerdIds.has(h.id) || h.id === alloc.herdGroupId)
                              .map((h) => (
                                <option key={h.id} value={h.id}>
                                  {h.name} - {h.category} ({h.head_count} head)
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="mb-1 block text-[11px] text-text-muted">Head</label>
                          <input
                            type="number"
                            min={0}
                            max={maxHead}
                            value={alloc.headCount || ""}
                            onChange={(e) => updateAllocation(alloc.key, "headCount", parseInt(e.target.value) || 0)}
                            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-text-primary focus:border-teal-500/50 focus:outline-none"
                            placeholder="0"
                          />
                        </div>
                        <div className="w-32">
                          <label className="mb-1 block text-[11px] text-text-muted">Category</label>
                          <input
                            type="text"
                            value={alloc.category}
                            readOnly
                            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-text-muted"
                          />
                        </div>
                        {allocations.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeAllocation(alloc.key)} className="shrink-0">
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        )}
                      </div>
                    );
                  })}

                  <Button variant="ghost" size="sm" onClick={addAllocation} className="w-full text-xs">
                    <Plus className="mr-1 h-3 w-3" />Add Herd Group
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <label className="mb-1 block text-[11px] text-text-muted">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-teal-500/50 focus:outline-none"
                placeholder="Any additional notes about this consignment..."
              />
            </CardContent>
          </Card>

          {/* Summary + Generate */}
          <Card className="border-teal-500/20">
            <CardContent className="p-4">
              <p className="mb-3 text-xs font-semibold text-text-primary">Analysis Summary</p>
              <div className="mb-4 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Processor Grid</span>
                  <span className="text-text-primary">{selectedGrid?.processor_name ?? "Not selected"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Kill Sheets Selected</span>
                  <span className="text-text-primary">
                    {selectedKillSheetIds.size > 0
                      ? `${selectedKillSheetIds.size} of ${killSheetCount}`
                      : "None (using industry averages)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Head</span>
                  <span className="text-text-primary">{totalHead}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Herd Groups</span>
                  <span className="text-text-primary">{validAllocations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Mode</span>
                  <Badge className="bg-teal-500/15 text-teal-400">Pre-sale comparison</Badge>
                </div>
              </div>

              {error && (
                <div className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(2)} className="flex-shrink-0">
                  <ChevronLeft className="mr-1 h-4 w-4" />Back
                </Button>
                <Button
                  variant="teal"
                  className="flex-1"
                  disabled={!canGenerate || isPending}
                  onClick={handleGenerate}
                >
                  {isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating Analysis...</>
                  ) : (
                    "Generate Comparison"
                  )}
                </Button>
              </div>

              {!canGenerate && (
                <p className="mt-2 text-center text-[11px] text-text-muted">
                  Select a grid and at least one herd allocation to continue.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
