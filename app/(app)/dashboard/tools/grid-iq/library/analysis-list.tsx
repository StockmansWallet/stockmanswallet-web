"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, ChevronRight, Trash2, Loader2, Check } from "lucide-react";

export interface AnalysisRow {
  id: string;
  herd_name: string | null;
  processor_name: string | null;
  analysis_date: string | null;
  net_saleyard_value: number | null;
  net_processor_value: number | null;
  grid_iq_advantage: number | null;
  kill_score: number | null;
  gcr: number | null;
  analysis_mode: string | null;
  updated_at: string;
}

export type AnalysisListTab = "pre-sale" | "post-kill";

interface Props {
  analyses: AnalysisRow[];
  tab: AnalysisListTab;
  selecting: boolean;
  selected: Set<string>;
  onSelectedChange: (s: Set<string>) => void;
  onDone: () => void;
}

export function AnalysisList({
  analyses,
  tab,
  selecting,
  selected,
  onSelectedChange,
  onDone,
}: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (analyses.length === 0) {
    return (
      <Card>
        <EmptyState
          title={tab === "pre-sale" ? "No pre-sale analyses yet" : "No post-kill analyses yet"}
          description={
            tab === "pre-sale"
              ? "Run a Grid IQ analysis to compare saleyard vs over-the-hooks value for your herds."
              : "Complete a post-kill analysis after receiving your kill sheet from the processor."
          }
          actionLabel="New Analysis"
          actionHref="/dashboard/tools/grid-iq/analyse"
          variant="grid-iq"
        />
      </Card>
    );
  }

  const allSelected = analyses.length > 0 && analyses.every((a) => selected.has(a.id));

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  };

  const toggleAll = () => {
    if (allSelected) {
      onSelectedChange(new Set());
    } else {
      onSelectedChange(new Set(analyses.map((a) => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("grid_iq_analyses")
        .update({ is_deleted: true, deleted_at: now })
        .in("id", Array.from(selected));

      if (error) throw error;
      onDone();
      router.refresh();
    } catch {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      {selecting && (
        <div className="mb-2 flex items-center justify-between px-1">
          <button
            onClick={toggleAll}
            className="text-text-muted hover:text-text-primary flex items-center gap-2 text-xs"
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                allSelected
                  ? "border-grid-iq bg-grid-iq text-black"
                  : "border-white/20 bg-white/[0.04]"
              }`}
            >
              {allSelected && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            Select All ({analyses.length})
          </button>
          {selected.size > 0 && (
            <span className="text-grid-iq text-xs">{selected.size} selected</span>
          )}
        </div>
      )}

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 34rem), 1fr))" }}
      >
        {analyses.map((a) => {
          const advantage = a.grid_iq_advantage ?? 0;
          const isProcessor = advantage > 0;
          const saleyardValue = a.net_saleyard_value;
          const processorValue = a.net_processor_value;
          const killScore = a.kill_score;
          const gcr = a.gcr;
          const checked = selected.has(a.id);
          const fmt = (v: number | null) =>
            v === null ? "-" : `$${Math.round(v).toLocaleString()}`;

          const content = (
            <>
              {selecting && (
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    checked
                      ? "border-grid-iq bg-grid-iq text-black"
                      : "border-white/20 bg-white/[0.04]"
                  }`}
                >
                  {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              )}
              <div className="bg-grid-iq/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <TrendingUp className="text-grid-iq h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text-primary text-sm font-medium">
                  {a.herd_name ?? "Multi-herd"} vs {a.processor_name ?? "Unknown"}
                </p>
                <div className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  {a.analysis_date && (
                    <span>{new Date(a.analysis_date).toLocaleDateString("en-AU")}</span>
                  )}
                  {killScore !== null && (
                    <span
                      title="Kill Score: 85+ Excellent, 70-84 Good, 50-69 Fair, <50 Poor"
                      className={`text-[10px] font-medium ${
                        killScore >= 85
                          ? "text-success"
                          : killScore >= 70
                            ? "text-grid-iq"
                            : killScore >= 50
                              ? "text-warning"
                              : "text-error"
                      }`}
                    >
                      KS {killScore.toFixed(0)}
                    </span>
                  )}
                  {gcr !== null && <span className="text-[10px]">GCR {gcr.toFixed(0)}%</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-baseline justify-end gap-2 text-xs">
                  <span className="text-text-muted">Saleyard</span>
                  <span className="text-text-secondary tabular-nums">{fmt(saleyardValue)}</span>
                </div>
                <div className="flex items-baseline justify-end gap-2 text-xs">
                  <span className="text-text-muted">Grid</span>
                  <span className="text-text-secondary tabular-nums">{fmt(processorValue)}</span>
                </div>
                <p
                  className={`mt-0.5 text-[11px] font-semibold tabular-nums ${isProcessor ? "text-success" : "text-warning"}`}
                >
                  {isProcessor ? "+" : "-"}${Math.abs(Math.round(advantage)).toLocaleString()}
                </p>
              </div>
              {!selecting && (
                <ChevronRight className="text-text-muted group-hover:text-text-secondary h-4 w-4 shrink-0 transition-all group-hover:translate-x-0.5" />
              )}
            </>
          );

          if (selecting) {
            return (
              <button
                key={a.id}
                onClick={() => toggleOne(a.id)}
                className="group relative flex w-full items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding px-4 py-4 text-left transition-colors duration-150 hover:border-grid-iq/35 hover:bg-grid-iq/[0.075]"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={a.id}
              href={`/dashboard/tools/grid-iq/analysis/${a.id}`}
              className="group relative flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding px-4 py-4 transition-colors duration-150 hover:border-grid-iq/35 hover:bg-grid-iq/[0.075]"
            >
              {content}
            </Link>
          );
        })}
      </div>

      {selecting && selected.size > 0 && (
        <div className="mt-4">
          {showConfirm ? (
            <div className="border-error/20 bg-error/5 flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="text-error text-sm">
                Delete {selected.size} {selected.size === 1 ? "analysis" : "analyses"}?
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Confirm
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="destructive" className="w-full" onClick={() => setShowConfirm(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete Selected ({selected.size})
            </Button>
          )}
        </div>
      )}
    </>
  );
}
