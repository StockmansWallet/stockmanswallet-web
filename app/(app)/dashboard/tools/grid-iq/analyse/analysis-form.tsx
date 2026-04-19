"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnalysis } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Grid3x3,
  FileText,
  Target,
  Check,
  Loader2,
  AlertTriangle,
  Upload,
} from "lucide-react";
import Link from "next/link";

interface GridSummary {
  id: string;
  grid_name: string | null;
  processor_name: string;
  grid_code: string | null;
  grid_date: string | null;
  expiry_date: string | null;
  entries: unknown[];
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
  record_name: string | null;
  processor_name: string;
  grid_code: string | null;
  kill_date: string | null;
  total_head_count: number | null;
  total_gross_value: number | null;
  realisation_factor: number | null;
}

interface AnalysisFormProps {
  grids: GridSummary[];
  herds: HerdSummary[];
  killSheets: KillSheetSummary[];
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return `$${Math.round(value).toLocaleString()}`;
}

export function AnalysisForm({ grids, herds, killSheets }: AnalysisFormProps) {
  const router = useRouter();
  const [selectedGridId, setSelectedGridId] = useState<string | null>(null);
  const [selectedHerdId, setSelectedHerdId] = useState<string | null>(null);
  const [selectedKillSheetId, setSelectedKillSheetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedGrid = grids.find((g) => g.id === selectedGridId);
  const selectedHerd = herds.find((h) => h.id === selectedHerdId);
  const selectedKillSheet = killSheets.find((k) => k.id === selectedKillSheetId);

  // Auto-suggest matching kill sheets based on processor name
  const suggestedKillSheetIds = new Set(
    selectedGrid
      ? killSheets
          .filter(
            (ks) =>
              ks.processor_name === selectedGrid.processor_name ||
              (selectedGrid.grid_code && ks.grid_code === selectedGrid.grid_code)
          )
          .map((ks) => ks.id)
      : []
  );

  const analysisMode = selectedKillSheetId ? "Post-sale audit" : "Pre-sale comparison";
  const canAnalyse = selectedGridId && selectedHerdId;

  function handleSubmit() {
    if (!canAnalyse) return;
    setError(null);
    const formData = new FormData();
    formData.set("gridId", selectedGridId!);
    formData.set("herdId", selectedHerdId!);
    if (selectedKillSheetId) formData.set("killSheetId", selectedKillSheetId);
    startTransition(async () => {
      try {
        const result = await createAnalysis(formData);
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
      {/* Step 1: Select Grid */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal/20 text-xs font-bold text-teal">
            1
          </div>
          <h2 className="text-sm font-semibold text-text-primary">Select Processor Grid</h2>
          {selectedGrid && <Check className="h-4 w-4 text-success" />}
        </div>

        {grids.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <Grid3x3 className="h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">No processor grids uploaded yet.</p>
              <Link href="/dashboard/tools/grid-iq/library?tab=grids&upload=grid">
                <Button size="sm" variant="indigo">
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
                    selected
                      ? "border-teal/50 bg-teal/10"
                      : "hover:bg-white/[0.04]"
                  }`}
                  onClick={() => setSelectedGridId(selected ? null : grid.id)}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        selected ? "bg-teal/20" : "bg-white/[0.06]"
                      }`}
                    >
                      <Grid3x3
                        className={`h-4 w-4 ${selected ? "text-teal" : "text-text-muted"}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {grid.grid_name || grid.processor_name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {grid.grid_code ? `${grid.grid_code} - ` : ""}
                        {formatDate(grid.grid_date)}
                        {grid.entries ? ` - ${(grid.entries as unknown[]).length} entries` : ""}
                      </p>
                    </div>
                    {expired && (
                      <Badge variant="danger" className="shrink-0 text-[10px]">
                        <AlertTriangle className="mr-0.5 h-3 w-3" />
                        Expired
                      </Badge>
                    )}
                    {selected && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 2: Select Herd */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal/20 text-xs font-bold text-teal">
            2
          </div>
          <h2 className="text-sm font-semibold text-text-primary">Select Herd</h2>
          {selectedHerd && <Check className="h-4 w-4 text-success" />}
        </div>

        {herds.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <Target className="h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">No cattle herds in your portfolio.</p>
              <Link href="/dashboard/herds">
                <Button size="sm" variant="indigo">
                  Add Herd
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {herds.map((herd) => {
              const selected = selectedHerdId === herd.id;
              return (
                <Card
                  key={herd.id}
                  className={`cursor-pointer transition-all ${
                    selected
                      ? "border-teal/50 bg-teal/10"
                      : "hover:bg-white/[0.04]"
                  }`}
                  onClick={() => setSelectedHerdId(selected ? null : herd.id)}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        selected ? "bg-teal/20" : "bg-white/[0.06]"
                      }`}
                    >
                      <Target
                        className={`h-4 w-4 ${selected ? "text-teal" : "text-text-muted"}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{herd.name}</p>
                      <p className="text-xs text-text-muted">
                        {herd.category} - {herd.breed} - {herd.head_count} head
                      </p>
                    </div>
                    {selected && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 3: Kill Sheet (Optional) */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-xs font-bold text-text-secondary">
            3
          </div>
          <h2 className="text-sm font-semibold text-text-primary">
            Kill Sheet <span className="font-normal text-text-muted">(optional)</span>
          </h2>
          {selectedKillSheet && <Check className="h-4 w-4 text-success" />}
        </div>
        <p className="mb-2 text-xs text-text-muted">
          Select a kill sheet for post-sale analysis with Kill Score, GCR, and opportunity insights.
        </p>

        {killSheets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
              <FileText className="h-6 w-6 text-text-muted" />
              <p className="text-xs text-text-muted">No kill sheets uploaded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {killSheets.map((ks) => {
              const selected = selectedKillSheetId === ks.id;
              const suggested = suggestedKillSheetIds.has(ks.id);
              return (
                <Card
                  key={ks.id}
                  className={`cursor-pointer transition-all ${
                    selected
                      ? "border-teal/50 bg-teal/10"
                      : suggested
                        ? "border-teal/20 hover:bg-white/[0.04]"
                        : "hover:bg-white/[0.04]"
                  }`}
                  onClick={() => setSelectedKillSheetId(selected ? null : ks.id)}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        selected ? "bg-teal/20" : "bg-white/[0.06]"
                      }`}
                    >
                      <FileText
                        className={`h-4 w-4 ${selected ? "text-teal" : "text-text-muted"}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {ks.record_name || ks.processor_name}
                        </p>
                        {suggested && !selected && (
                          <Badge className="shrink-0 bg-teal/15 text-[9px] text-teal">
                            Match
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        {formatDate(ks.kill_date)} - {ks.total_head_count ?? 0} head
                        {ks.total_gross_value ? ` - ${formatCurrency(ks.total_gross_value)}` : ""}
                      </p>
                    </div>
                    {selected && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Review and Run */}
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Analysis Summary</h2>
          <Badge
            className={
              selectedKillSheetId
                ? "bg-warning/15 text-warning"
                : "bg-teal/15 text-teal"
            }
          >
            {analysisMode}
          </Badge>
        </div>

        <div className="mb-4 flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-text-muted">Processor Grid</span>
            <span className="text-text-primary">
              {selectedGrid ? (selectedGrid.grid_name || selectedGrid.processor_name) : "Not selected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Herd</span>
            <span className="text-text-primary">
              {selectedHerd
                ? `${selectedHerd.name} (${selectedHerd.head_count} head)`
                : "Not selected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Kill Sheet</span>
            <span className="text-text-primary">
              {selectedKillSheet
                ? `${selectedKillSheet.record_name || selectedKillSheet.processor_name} - ${formatDate(selectedKillSheet.kill_date)}`
                : "None (pre-sale)"}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
            {error}
          </div>
        )}

        <Button
          variant="indigo"
          className="w-full"
          disabled={!canAnalyse || isPending}
          onClick={handleSubmit}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analysing...
            </>
          ) : (
            "Run Analysis"
          )}
        </Button>

        {!canAnalyse && (
          <p className="mt-2 text-center text-[11px] text-text-muted">
            Select a processor grid and a herd to continue.
          </p>
        )}
      </section>
    </div>
  );
}
