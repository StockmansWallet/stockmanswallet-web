"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { bulkDeleteProcessorGrids, bulkDeleteKillSheets } from "./actions";
import {
  BarChart3,
  Grid3x3,
  FileText,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
  Upload,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";
import { AnalysisList } from "./analysis-list";
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
  initialUpload?: "grid" | "killsheet" | null;
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
  initialUpload,
  analyses,
  grids,
  killSheets,
  profile,
  postSaleTrend,
}: Props) {
  const resolved = tabAliases[defaultTab] ?? "analyses";
  const [activeTab, setActiveTab] = useState<TabId>(resolved);
  const [uploadType, setUploadType] = useState<"grid" | "killsheet" | null>(initialUpload ?? null);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [indicatorReady, setIndicatorReady] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const btn = buttonRefs.current.get(activeTab);
    if (!container || !btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setIndicator({ left: bRect.left - cRect.left, width: bRect.width });
    setIndicatorReady(true);
  }, [activeTab]);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div>
      {/* Heading */}
      <div className="mb-4">
        <h2 className="text-text-primary text-xl font-semibold">Library</h2>
        <p className="text-text-muted mt-0.5 text-sm">
          Your analyses, grids, kill sheets, and performance history.
        </p>
      </div>

      {/* Primary tab bar */}
      <div ref={containerRef} className="bg-surface relative mb-5 flex gap-1 rounded-full p-1">
        <div
          className={`bg-surface-high absolute top-1 bottom-1 rounded-full shadow-sm ${
            indicatorReady ? "transition-all duration-250 ease-out" : ""
          }`}
          style={{ left: indicator.left, width: indicator.width }}
        />
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) buttonRefs.current.set(tab.id, el);
              }}
              onClick={() => setActiveTab(tab.id)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                active ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-grid-iq" : "text-text-muted"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "analyses" && <AnalysesTab analyses={analyses} />}
      {activeTab === "grids" && <GridsTab grids={grids} onUpload={() => setUploadType("grid")} />}
      {activeTab === "kill-sheets" && (
        <KillSheetsTab killSheets={killSheets} onUpload={() => setUploadType("killsheet")} />
      )}
      {activeTab === "performance" && <PerformanceView profile={profile} trend={postSaleTrend} />}

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

  const filters: { id: "pre-sale" | "post-kill"; label: string; count: number }[] = [
    { id: "pre-sale", label: "Pre-Sale", count: preSale.length },
    { id: "post-kill", label: "Post-Kill", count: postKill.length },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-[11px] font-medium tracking-wide uppercase">
            Filter
          </span>
          <div className="flex gap-1.5">
            {filters.map((f) => {
              const active = subTab === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSubTab(f.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-grid-iq/40 bg-grid-iq/15 text-grid-iq"
                      : "bg-surface-lowest text-text-secondary hover:text-text-primary border-white/[0.08] hover:border-white/[0.14]"
                  }`}
                >
                  {f.label}
                  {f.count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-[1px] text-[10px] ${
                        active ? "bg-grid-iq/20 text-grid-iq" : "text-text-muted bg-white/[0.06]"
                      }`}
                    >
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {displayed.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className={`border bg-white/[0.04] hover:bg-white/[0.06] ${selecting ? "border-grid-iq/40 text-grid-iq hover:text-grid-iq" : "text-text-muted border-white/[0.08] hover:border-white/[0.14]"}`}
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

// MARK: - Shared selection controls

function SelectionToolbar({
  total,
  selecting,
  selected,
  onToggle,
  onSelectAll,
  onUpload,
  uploadLabel,
}: {
  total: number;
  selecting: boolean;
  selected: Set<string>;
  onToggle: () => void;
  onSelectAll: () => void;
  onUpload: () => void;
  uploadLabel: string;
}) {
  const allSelected = total > 0 && selected.size === total;
  return (
    <div className="mb-3 flex items-center justify-between">
      {selecting ? (
        <button
          onClick={onSelectAll}
          className="text-text-muted hover:text-text-primary inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs transition-colors hover:border-white/[0.14] hover:bg-white/[0.06]"
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
          Select All ({total})
          {selected.size > 0 && <span className="text-grid-iq ml-2">{selected.size} selected</span>}
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <Button variant="grid-iq" size="sm" onClick={onUpload}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {uploadLabel}
        </Button>
        {total > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className={`border bg-white/[0.04] hover:bg-white/[0.06] ${selecting ? "border-grid-iq/40 text-grid-iq hover:text-grid-iq" : "text-text-muted border-white/[0.08] hover:border-white/[0.14]"}`}
            onClick={onToggle}
          >
            {selecting ? "Cancel" : "Select"}
          </Button>
        )}
      </div>
    </div>
  );
}

function BulkDeleteBar({
  selectedCount,
  noun,
  pluralNoun,
  isDeleting,
  showConfirm,
  error,
  onShowConfirm,
  onCancelConfirm,
  onConfirmDelete,
}: {
  selectedCount: number;
  noun: string;
  pluralNoun: string;
  isDeleting: boolean;
  showConfirm: boolean;
  error?: string | null;
  onShowConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirmDelete: () => void;
}) {
  if (selectedCount === 0) return null;
  return (
    <div className="mt-4">
      {error && (
        <div
          role="alert"
          className="border-error/20 bg-error/10 text-error mb-2 rounded-lg border px-3 py-2 text-xs"
        >
          {error}
        </div>
      )}
      {showConfirm ? (
        <div className="border-error/20 bg-error/5 flex items-center justify-between rounded-xl border px-4 py-3">
          <span className="text-error text-sm">
            Delete {selectedCount} {selectedCount === 1 ? noun : pluralNoun}?
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
              onClick={onCancelConfirm}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={onConfirmDelete} disabled={isDeleting}>
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
        <Button variant="destructive" className="w-full" onClick={onShowConfirm}>
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete Selected ({selectedCount})
        </Button>
      )}
    </div>
  );
}

// MARK: - Grids

function GridsTab({ grids, onUpload }: { grids: GridRow[]; onUpload: () => void }) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const exit = () => {
    setSelecting(false);
    setSelected(new Set());
    setShowConfirm(false);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === grids.length) setSelected(new Set());
    else setSelected(new Set(grids.map((g) => g.id)));
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await bulkDeleteProcessorGrids(Array.from(selected));
    setIsDeleting(false);
    if ("error" in result) {
      setDeleteError(result.error ?? "Failed to delete");
      return;
    }
    setShowConfirm(false);
    exit();
    router.refresh();
  };

  if (grids.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No grids uploaded yet"
          description="Upload a processor grid photo, PDF, or spreadsheet. Grid IQ extracts the price matrix automatically."
          actionLabel="Upload Grid"
          onAction={onUpload}
          variant="grid-iq"
        />
      </Card>
    );
  }

  return (
    <div>
      <SelectionToolbar
        total={grids.length}
        selecting={selecting}
        selected={selected}
        onToggle={() => (selecting ? exit() : setSelecting(true))}
        onSelectAll={toggleAll}
        onUpload={onUpload}
        uploadLabel="Upload Grid"
      />

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
              daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
            const checked = selected.has(g.id);

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
                  <Grid3x3 className="text-grid-iq h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary text-sm font-medium">
                    {g.grid_name || g.processor_name}
                  </p>
                  <div className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
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
                      isExpired ? "bg-error/15 text-error" : "bg-warning/15 text-warning"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {isExpired ? "Expired" : `${daysUntilExpiry}d left`}
                  </div>
                )}
                {!selecting && (
                  <ChevronRight className="text-text-muted group-hover:text-text-secondary h-4 w-4 shrink-0 transition-all group-hover:translate-x-0.5" />
                )}
              </>
            );

            if (selecting) {
              return (
                <button
                  key={g.id}
                  onClick={() => toggleOne(g.id)}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={g.id}
                href={`/dashboard/tools/grid-iq/grids/${g.id}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
              >
                {content}
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {selecting && (
        <BulkDeleteBar
          selectedCount={selected.size}
          noun="grid"
          pluralNoun="grids"
          isDeleting={isDeleting}
          showConfirm={showConfirm}
          error={deleteError}
          onShowConfirm={() => setShowConfirm(true)}
          onCancelConfirm={() => {
            setShowConfirm(false);
            setDeleteError(null);
          }}
          onConfirmDelete={handleBulkDelete}
        />
      )}
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
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const exit = () => {
    setSelecting(false);
    setSelected(new Set());
    setShowConfirm(false);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === killSheets.length) setSelected(new Set());
    else setSelected(new Set(killSheets.map((k) => k.id)));
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await bulkDeleteKillSheets(Array.from(selected));
    setIsDeleting(false);
    if ("error" in result) {
      setDeleteError(result.error ?? "Failed to delete");
      return;
    }
    setShowConfirm(false);
    exit();
    router.refresh();
  };

  if (killSheets.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No kill sheets yet"
          description="Upload kill sheets to start tracking your over-the-hooks performance. Kill history improves Grid IQ accuracy with personalised realisation factors."
          actionLabel="Upload Kill Sheet"
          onAction={onUpload}
          variant="grid-iq"
        />
      </Card>
    );
  }

  return (
    <div>
      <SelectionToolbar
        total={killSheets.length}
        selecting={selecting}
        selected={selected}
        onToggle={() => (selecting ? exit() : setSelecting(true))}
        onSelectAll={toggleAll}
        onUpload={onUpload}
        uploadLabel="Upload Kill Sheet"
      />

      <Card>
        <CardContent className="divide-y divide-white/[0.06] p-0">
          {killSheets.map((ks) => {
            const rf = ks.realisation_factor;
            const checked = selected.has(ks.id);

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
                  <FileText className="text-grid-iq h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary text-sm font-medium">
                    {ks.record_name || ks.processor_name}
                  </p>
                  <div className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                    {ks.record_name && <span>{ks.processor_name}</span>}
                    {ks.kill_date && (
                      <span>{new Date(ks.kill_date).toLocaleDateString("en-AU")}</span>
                    )}
                    {ks.total_head_count != null && <span>{ks.total_head_count} head</span>}
                    {ks.average_body_weight != null && (
                      <span>{Math.round(ks.average_body_weight)} kg avg</span>
                    )}
                    {ks.grid_code ? <span>{ks.grid_code}</span> : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {ks.total_gross_value != null && (
                    <p className="text-text-primary text-sm font-semibold">
                      ${Math.round(ks.total_gross_value).toLocaleString()}
                    </p>
                  )}
                  <p className="text-text-muted mt-0.5 text-xs">
                    {ks.average_price_per_kg != null
                      ? `$${ks.average_price_per_kg.toFixed(2)}/kg`
                      : ""}
                    {rf != null && rf > 0 ? ` . ${Math.round(rf * 100)}% RF` : ""}
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
                  key={ks.id}
                  onClick={() => toggleOne(ks.id)}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={ks.id}
                href={`/dashboard/tools/grid-iq/kill-sheets/${ks.id}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
              >
                {content}
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {selecting && (
        <BulkDeleteBar
          selectedCount={selected.size}
          noun="kill sheet"
          pluralNoun="kill sheets"
          isDeleting={isDeleting}
          showConfirm={showConfirm}
          error={deleteError}
          onShowConfirm={() => setShowConfirm(true)}
          onCancelConfirm={() => {
            setShowConfirm(false);
            setDeleteError(null);
          }}
          onConfirmDelete={handleBulkDelete}
        />
      )}
    </div>
  );
}
