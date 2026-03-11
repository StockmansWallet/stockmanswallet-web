"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Grid3x3, FileText, Upload, AlertTriangle, ChevronRight,
} from "lucide-react";
import { GridIQUploader } from "../upload/grid-iq-uploader";

// MARK: - Types

interface GridRecord {
  id: string;
  grid_name: string | null;
  processor_name: string;
  grid_code: string | null;
  grid_date: string | null;
  expiry_date: string | null;
  location: string | null;
  created_at: string;
}

interface KillSheetRecord {
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

type TabId = "grids" | "killsheets" | "upload";

interface Props {
  defaultTab: string;
  grids: GridRecord[];
  killSheets: KillSheetRecord[];
}

const tabs: { id: TabId; label: string; icon: typeof Grid3x3 }[] = [
  { id: "grids", label: "Grids", icon: Grid3x3 },
  { id: "killsheets", label: "Kill Sheets", icon: FileText },
  { id: "upload", label: "Upload", icon: Upload },
];

// MARK: - Component

export function ProcessorRecordsTabs({ defaultTab, grids, killSheets }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab as TabId);

  return (
    <div>
      {/* Page heading */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-text-primary">Processor Records</h2>
        <p className="mt-0.5 text-sm text-text-muted">Manage your processor grids, kill sheets, and uploads</p>
      </div>

      {/* Tab bar */}
      <div className="mb-5 flex gap-1 rounded-xl bg-white/[0.03] p-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
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
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "grids" && <GridsTab grids={grids} />}
      {activeTab === "killsheets" && <KillSheetsTab killSheets={killSheets} />}
      {activeTab === "upload" && <UploadTab />}
    </div>
  );
}

// MARK: - Grids Tab

function GridsTab({ grids }: { grids: GridRecord[] }) {
  if (grids.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No grids uploaded yet"
          description="Upload a processor grid photo or PDF. Grid IQ will extract the price matrix automatically."
          actionLabel="Upload Grid"
          actionHref="/dashboard/tools/grid-iq/records?tab=upload"
          variant="teal"
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="divide-y divide-white/[0.06] p-0">
        {grids.map((g) => {
          const expiry = g.expiry_date ? new Date(g.expiry_date) : null;
          const now = new Date();
          const daysUntilExpiry = expiry
            ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;
          const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
          const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7;

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
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

// MARK: - Kill Sheets Tab

function KillSheetsTab({ killSheets }: { killSheets: KillSheetRecord[] }) {
  if (killSheets.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No kill sheets yet"
          description="Upload kill sheets to start tracking your over-the-hooks performance. Kill history improves Grid IQ accuracy with personalised realisation factors."
          actionLabel="Upload Kill Sheet"
          actionHref="/dashboard/tools/grid-iq/records?tab=upload"
          variant="teal"
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="divide-y divide-white/[0.06] p-0">
        {killSheets.map((ks) => {
          const rf = ks.realisation_factor;
          return (
            <Link
              key={ks.id}
              href={`/dashboard/tools/grid-iq/history/${ks.id}`}
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
                  {ks.total_head_count != null && <span>{ks.total_head_count} head</span>}
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
                  {ks.average_price_per_kg != null ? `$${ks.average_price_per_kg.toFixed(2)}/kg` : ""}
                  {rf != null && rf > 0 ? ` . ${Math.round(rf * 100)}% RF` : ""}
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

// MARK: - Upload Tab

function UploadTab() {
  return <GridIQUploader initialType="grid" />;
}
