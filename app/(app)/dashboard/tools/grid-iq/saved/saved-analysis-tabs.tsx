"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Grid3x3, FileText, TrendingUp, ChevronRight } from "lucide-react";

// MARK: - Types

interface AnalysisRecord {
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

type TabId = "pre-sale" | "post-kill";

interface Props {
  defaultTab: string;
  analyses: AnalysisRecord[];
}

const tabs: { id: TabId; label: string; icon: typeof Grid3x3 }[] = [
  { id: "pre-sale", label: "Pre-Sale", icon: Grid3x3 },
  { id: "post-kill", label: "Post Kill", icon: FileText },
];

// MARK: - Component

export function SavedAnalysisTabs({ defaultTab, analyses }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab as TabId);

  const preSaleAnalyses = analyses.filter((a) => a.analysis_mode !== "post_sale");
  const postKillAnalyses = analyses.filter((a) => a.analysis_mode === "post_sale");
  const displayed = activeTab === "pre-sale" ? preSaleAnalyses : postKillAnalyses;

  return (
    <div>
      {/* Page heading */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-text-primary">Saved Analysis</h2>
        <p className="mt-0.5 text-sm text-text-muted">Pre-sale comparisons and post-kill results</p>
      </div>

      {/* Tab bar */}
      <div className="mb-5 flex gap-1 rounded-xl bg-white/[0.03] p-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          const count = tab.id === "pre-sale" ? preSaleAnalyses.length : postKillAnalyses.length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-teal-500/15 text-teal-400"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && (
                <span className={`ml-0.5 text-xs ${active ? "text-teal-400/60" : "text-text-muted/50"}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnalysisList analyses={displayed} tab={activeTab} />
    </div>
  );
}

// MARK: - Analysis List

function AnalysisList({ analyses, tab }: { analyses: AnalysisRecord[]; tab: TabId }) {
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
          variant="teal"
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="divide-y divide-white/[0.06] p-0">
        {analyses.map((a) => {
          const advantage = a.grid_iq_advantage ?? 0;
          const isProcessor = advantage > 0;
          const killScore = a.kill_score;
          const gcr = a.gcr;

          return (
            <Link
              key={a.id}
              href={`/dashboard/tools/grid-iq/analysis/${a.id}`}
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                <TrendingUp className="h-5 w-5 text-teal-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {a.herd_name ?? "Multi-herd"} vs {a.processor_name ?? "Unknown"}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
                  {a.analysis_date && (
                    <span>{new Date(a.analysis_date).toLocaleDateString("en-AU")}</span>
                  )}
                  {killScore !== null && (
                    <span
                      className={`text-[10px] font-medium ${
                        killScore >= 85
                          ? "text-emerald-400"
                          : killScore >= 70
                            ? "text-teal-400"
                            : killScore >= 50
                              ? "text-amber-400"
                              : "text-red-400"
                      }`}
                    >
                      KS {killScore.toFixed(0)}
                    </span>
                  )}
                  {gcr !== null && <span className="text-[10px]">GCR {gcr.toFixed(0)}%</span>}
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-semibold ${isProcessor ? "text-emerald-400" : "text-brand"}`}
                >
                  {isProcessor ? "Over-the-Hooks" : "Saleyard"}
                </p>
                <p className="text-xs text-text-muted">
                  {isProcessor ? "+" : ""}${Math.abs(Math.round(advantage)).toLocaleString()}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
