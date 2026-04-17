"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BarChart3,
  Grid3x3,
  FileText,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { AnalysisList } from "../saved/saved-analysis-tabs";
import { UploadModal } from "./upload-modal";
import { PerformanceView, type PerformanceTrendRow } from "./performance-view";
import type { ProducerProfile } from "@/lib/grid-iq/producer-profile";

// MARK: - Types

interface AnalysisRow {
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

interface GridRow {
  id: string;
  grid_name: string | null;
  processor_name: string;
  grid_code: string | null;
  grid_date: string | null;
  expiry_date: string | null;
  location: string | null;
  created_at: string;
}

interface KillSheetRow {
  id: string;
  record_name: string | null;
  processor_name: string;
  grid_code: string | null;
  kill_date: string | null;
  total_head_count: number | null;
  total_body_weight: number | null;
  total_gross_value: number | null;
  average_body_weight: number | null;
  average_price_per_kg: number | null;
  realisation_factor: number | null;
}

type TabId = "analyses" | "grids" | "kill-sheets" | "performance";

interface Props {
  defaultTab: string;
  analyses: AnalysisRow[];
  grids: GridRow[];
  killSheets: KillSheetRow[];
  profile: ProducerProfile | null;
  postSaleTrend: PerformanceTrendRow[];
}

const tabs: { id: TabId; label: string; icon: typeof Grid3x3 }[] = [
  { id: "analyses", label: "Analyses", icon: BarChart3 },
  { id: "grids", label: "Grids", icon: Grid3x3 },
  { id: "kill-sheets", label: "Kill Sheets", icon: FileText },
  { id: "performance", label: "Performance", icon: TrendingUp },
];

// Legacy query keys map to new tab ids so old redirect links behave predictably
const tabAliases: Record<string, TabId> = {
  analyses: "analyses",
  grids: "grids",
  "kill-sheets": "kill-sheets",
  killsheets: "kill-sheets",
  performance: "performance",
};

// MARK: - Component

export function LibraryTabs({
  defaultTab,
  analyses,
  grids,
  killSheets,
  profile,
  postSaleTrend,
}: Props) {
  const resolved = tabAliases[defaultTab] ?? "analyses";
  const [activeTab, setActiveTab] = useState<TabId>(resolved);
  const [uploadType, setUploadType] = useState<"grid" | "killsheet" | null>(null);

  return (
    <div>
      {/* Heading */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-text-primary">Library</h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Your analyses, grids, kill sheets, and performance history.
        </p>
      </div>

      {/* Primary tab bar */}
      <div className="mb-5 flex gap-1 rounded-xl bg-white/[0.03] p-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-teal-500/15 text-teal-400"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "analyses" && <AnalysesTab analyses={analyses} />}
      {activeTab === "grids" && (
        <GridsTab grids={grids} onUpload={() => setUploadType("grid")} />
      )}
      {activeTab === "kill-sheets" && (
        <KillSheetsTab
          killSheets={killSheets}
          onUpload={() => setUploadType("killsheet")}
        />
      )}
      {activeTab === "performance" && (
        <PerformanceView profile={profile} trend={postSaleTrend} />
      )}

      {/* Upload modal (shared by Grids and Kill Sheets tabs) */}
      <UploadModal
        open={uploadType !== null}
        initialType={uploadType ?? "grid"}
        onClose={() => setUploadType(null)}
      />
    </div>
  );
}

// MARK: - Analyses

function AnalysesTab({ analyses }: { analyses: AnalysisRow[] }) {
  const [subTab, setSubTab] = useState<"pre-sale" | "post-kill">("pre-sale");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const preSale = analyses.filter((a) => a.analysis_mode !== "post_sale");
  const postKill = analyses.filter((a) => a.analysis_mode === "post_sale");
  const displayed = subTab === "pre-sale" ? preSale : postKill;

  const exitSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        {/* Secondary pill toggle */}
        <div className="flex gap-1 rounded-xl bg-white/[0.03] p-1">
          <button
            onClick={() => setSubTab("pre-sale")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              subTab === "pre-sale"
                ? "bg-teal-500/15 text-teal-400"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Pre-Sale
            {preSale.length > 0 && (
              <span className={subTab === "pre-sale" ? "text-teal-400/60" : "text-text-muted"}>
                ({preSale.length})
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab("post-kill")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              subTab === "post-kill"
                ? "bg-teal-500/15 text-teal-400"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Post-Kill
            {postKill.length > 0 && (
              <span className={subTab === "post-kill" ? "text-teal-400/60" : "text-text-muted"}>
                ({postKill.length})
              </span>
            )}
          </button>
        </div>
        {displayed.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className={selecting ? "text-teal-400" : "text-text-muted"}
            onClick={() => (selecting ? exitSelecting() : setSelecting(true))}
          >
            {selecting ? "Cancel" : "Select"}
          </Button>
        )}
      </div>

      <AnalysisList
        analyses={displayed}
        tab={subTab}
        selecting={selecting}
        selected={selected}
        onSelectedChange={setSelected}
        onDone={exitSelecting}
      />
    </div>
  );
}

// MARK: - Grids

function GridsTab({
  grids,
  onUpload,
}: {
  grids: GridRow[];
  onUpload: () => void;
}) {
  if (grids.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No grids uploaded yet"
          description="Upload a processor grid photo, PDF, or spreadsheet. Grid IQ extracts the price matrix automatically."
          actionLabel="Upload Grid"
          onAction={onUpload}
          variant="teal"
        />
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onUpload}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Upload Grid
        </Button>
      </div>
      <Card>
        <CardContent className="divide-y divide-white/[0.06] p-0">
          {grids.map((g) => {
            const expiry = g.expiry_date ? new Date(g.expiry_date) : null;
            const now = new Date();
            const daysUntilExpiry = expiry
              ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              : null;
            const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
            const isExpiringSoon =
              daysUntilExpiry !== null &&
              daysUntilExpiry >= 0 &&
              daysUntilExpiry <= 7;

            return (
              <Link
                key={g.id}
                href={`/dashboard/tools/grid-iq/grids/${g.id}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                  <Grid3x3 className="h-5 w-5 text-teal-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {g.grid_name || g.processor_name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
                    {g.grid_name && <span>{g.processor_name}</span>}
                    {g.grid_code ? <span>{g.grid_code}</span> : null}
                    {g.grid_date && (
                      <span>{new Date(g.grid_date).toLocaleDateString("en-AU")}</span>
                    )}
                    {expiry && !isExpired && !isExpiringSoon && (
                      <span>Expires {expiry.toLocaleDateString("en-AU")}</span>
                    )}
                    {g.location ? <span>{g.location}</span> : null}
                  </div>
                </div>
                {(isExpired || isExpiringSoon) && (
                  <div
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      isExpired
                        ? "bg-red-500/15 text-red-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {isExpired ? "Expired" : `${daysUntilExpiry}d left`}
                  </div>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// MARK: - Kill Sheets

function KillSheetsTab({
  killSheets,
  onUpload,
}: {
  killSheets: KillSheetRow[];
  onUpload: () => void;
}) {
  if (killSheets.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No kill sheets yet"
          description="Upload kill sheets to start tracking your over-the-hooks performance. Kill history improves Grid IQ accuracy with personalised realisation factors."
          actionLabel="Upload Kill Sheet"
          onAction={onUpload}
          variant="teal"
        />
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onUpload}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Upload Kill Sheet
        </Button>
      </div>
      <Card>
        <CardContent className="divide-y divide-white/[0.06] p-0">
          {killSheets.map((ks) => {
            const rf = ks.realisation_factor;
            return (
              <Link
                key={ks.id}
                href={`/dashboard/tools/grid-iq/kill-sheets/${ks.id}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                  <FileText className="h-5 w-5 text-teal-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {ks.record_name || ks.processor_name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
                    {ks.record_name && <span>{ks.processor_name}</span>}
                    {ks.kill_date && (
                      <span>{new Date(ks.kill_date).toLocaleDateString("en-AU")}</span>
                    )}
                    {ks.total_head_count != null && (
                      <span>{ks.total_head_count} head</span>
                    )}
                    {ks.average_body_weight != null && (
                      <span>{Math.round(ks.average_body_weight)} kg avg</span>
                    )}
                    {ks.grid_code ? <span>{ks.grid_code}</span> : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {ks.total_gross_value != null && (
                    <p className="text-sm font-semibold text-text-primary">
                      ${Math.round(ks.total_gross_value).toLocaleString()}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-text-muted">
                    {ks.average_price_per_kg != null
                      ? `$${ks.average_price_per_kg.toFixed(2)}/kg`
                      : ""}
                    {rf != null && rf > 0 ? ` . ${Math.round(rf * 100)}% RF` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
