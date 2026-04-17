// Grid detail page - shows full grid data with entries and delete option

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  Grid3x3,
  Calendar,
  User,
  Phone,
  Mail,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { GridDeleteButton } from "./grid-delete-button";
import { EditableProcessorName } from "../../components/editable-processor-name";
import { EditableGridLocation } from "./editable-grid-location";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GridDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: grid } = await supabase
    .from("processor_grids")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .single();

  if (!grid) notFound();

  const g = grid as Record<string, unknown>;
  const entries = (g.entries as Record<string, unknown>[]) || [];

  // Analyses that reference this grid (fetch one extra to detect overflow)
  const { data: relatedAnalysesRaw } = await supabase
    .from("grid_iq_analyses")
    .select(
      "id, herd_name, analysis_date, analysis_mode, grid_iq_advantage, head_count, kill_score"
    )
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .eq("processor_grid_id", id)
    .order("analysis_date", { ascending: false })
    .limit(26);
  const hasMoreAnalyses = (relatedAnalysesRaw?.length ?? 0) > 25;
  const relatedAnalyses = (relatedAnalysesRaw ?? []).slice(0, 25);

  // Group entries by gender
  const maleEntries = entries.filter((e) => e.gender === "male");
  const femaleEntries = entries.filter((e) => e.gender === "female");
  const unisexEntries = entries.filter(
    (e) => !e.gender || (e.gender !== "male" && e.gender !== "female")
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Link
          href="/dashboard/tools/grid-iq/library?tab=grids"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-lowest px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Library
        </Link>
      </div>

      <div>
        <EditableProcessorName
          recordId={id}
          table="processor_grids"
          initialName={String((g.grid_name as string | null) || g.processor_name)}
        />
        <p className="mt-0.5 text-sm font-medium text-text-secondary">
          {String(g.processor_name)}
          {(g.grid_code as string | null) ? ` - ${String(g.grid_code)}` : ""}
        </p>
      </div>

      {/* Expiry status banner */}
      {(() => {
        const expiryStr = g.expiry_date as string | null;
        if (!expiryStr) return null;
        const expiry = new Date(expiryStr);
        const now = new Date();
        const daysLeft = Math.ceil(
          (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const expired = daysLeft < 0;
        const expiringSoon = daysLeft >= 0 && daysLeft <= 7;
        if (!expired && !expiringSoon) return null;
        const tone = expired
          ? "border-red-500/30 bg-red-500/[0.08] text-red-400"
          : "border-amber-500/30 bg-amber-500/[0.08] text-amber-400";
        return (
          <div className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 ${tone}`}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {expired
                ? `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago (${expiry.toLocaleDateString("en-AU")}).`
                : `Expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${expiry.toLocaleDateString("en-AU")}).`}
            </span>
          </div>
        );
      })()}

      {/* Metadata */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetaItem
              icon={Calendar}
              label="Grid Date"
              value={
                g.grid_date
                  ? new Date(g.grid_date as string).toLocaleDateString("en-AU")
                  : "-"
              }
            />
            {(g.expiry_date as string | null) ? (
              <MetaItem
                icon={Calendar}
                label="Expires"
                value={new Date(g.expiry_date as string).toLocaleDateString(
                  "en-AU"
                )}
              />
            ) : null}
            {(g.contact_name as string | null) ? (
              <MetaItem icon={User} label="Contact" value={String(g.contact_name)} />
            ) : null}
            {(g.contact_phone as string | null) ? (
              <MetaItem icon={Phone} label="Phone" value={String(g.contact_phone)} />
            ) : null}
            {(g.contact_email as string | null) ? (
              <MetaItem icon={Mail} label="Email" value={String(g.contact_email)} />
            ) : null}
          </div>
          {(g.notes as string | null) ? (
            <div className="mt-3 border-t border-white/[0.06] pt-3">
              <p className="text-xs text-text-muted">Notes</p>
              <p className="mt-0.5 text-sm text-text-secondary whitespace-pre-line">
                {String(g.notes)}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Processor Location (editable; drives freight calculations) */}
      <div className="mt-4">
        <EditableGridLocation
          gridId={id}
          initialLocation={g.location as string | null}
          initialLatitude={g.location_latitude as number | null}
          initialLongitude={g.location_longitude as number | null}
        />
      </div>

      {/* Grid Entries */}
      <div className="mt-4 space-y-4">
        {femaleEntries.length > 0 && (
          <EntrySection
            title="Female Grades"
            entries={femaleEntries}
            color="text-pink-400"
            bg="bg-pink-500/15"
          />
        )}
        {maleEntries.length > 0 && (
          <EntrySection
            title="Male Grades"
            entries={maleEntries}
            color="text-blue-400"
            bg="bg-blue-500/15"
          />
        )}
        {unisexEntries.length > 0 && (
          <EntrySection
            title={
              maleEntries.length > 0 || femaleEntries.length > 0
                ? "Other Grades"
                : `Grade Entries (${entries.length})`
            }
            entries={unisexEntries}
            color="text-indigo-400"
            bg="bg-indigo-500/15"
          />
        )}
      </div>

      {/* Analyses using this grid */}
      {relatedAnalyses && relatedAnalyses.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-400">
                Analyses using this grid
              </span>
              <span className="text-xs text-text-muted">
                ({relatedAnalyses.length})
              </span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {relatedAnalyses.map((a: Record<string, unknown>) => {
                const advantage = (a.grid_iq_advantage as number) ?? 0;
                const isProcessor = advantage > 0;
                const mode = a.analysis_mode as string | null;
                const ks = a.kill_score as number | null;
                return (
                  <Link
                    key={a.id as string}
                    href={`/dashboard/tools/grid-iq/analysis/${a.id}`}
                    className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {(a.herd_name as string | null) ?? "Multi-herd"}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
                        {typeof a.analysis_date === "string" && (
                          <span>
                            {new Date(a.analysis_date).toLocaleDateString("en-AU")}
                          </span>
                        )}
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px]">
                          {mode === "post_sale" ? "Post-Sale" : "Pre-Sale"}
                        </span>
                        {typeof a.head_count === "number" && a.head_count > 0 ? (
                          <span>{a.head_count} head</span>
                        ) : null}
                        {ks !== null && ks !== undefined && (
                          <span
                            title="Kill Score: 85+ Excellent, 70-84 Good, 50-69 Fair, <50 Poor"
                            className={`text-[10px] font-medium ${
                              ks >= 85
                                ? "text-emerald-400"
                                : ks >= 70
                                  ? "text-indigo-400"
                                  : ks >= 50
                                    ? "text-amber-400"
                                    : "text-red-400"
                            }`}
                          >
                            KS {ks.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          isProcessor ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {isProcessor ? "Over-the-Hooks" : "Saleyard"}
                      </p>
                      <p className="text-xs text-text-muted">
                        {isProcessor ? "+" : ""}$
                        {Math.abs(Math.round(advantage)).toLocaleString()}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
                  </Link>
                );
              })}
            </div>
            {hasMoreAnalyses && (
              <div className="border-t border-white/[0.06] px-4 py-2.5 text-center">
                <Link
                  href="/dashboard/tools/grid-iq/library?tab=analyses"
                  className="text-xs font-medium text-indigo-400 hover:underline"
                >
                  Showing latest 25. View all in Library →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Destructive action */}
      <div className="mt-6 flex justify-start">
        <GridDeleteButton gridId={id} />
      </div>
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          {label}
        </p>
        <p className="truncate text-sm text-text-primary">{value}</p>
      </div>
    </div>
  );
}

function EntrySection({
  title,
  entries,
  color,
  bg,
}: {
  title: string;
  entries: Record<string, unknown>[];
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}
          >
            <Grid3x3 className={`h-3.5 w-3.5 ${color}`} />
          </div>
          <span className={`text-sm font-semibold ${color}`}>{title}</span>
          <span className="text-xs text-text-muted">({entries.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-left">
                <th className="px-4 py-2 font-medium text-text-muted">Grade</th>
                <th className="px-4 py-2 font-medium text-text-muted">Category</th>
                <th className="px-4 py-2 font-medium text-text-muted">Fat</th>
                <th className="px-4 py-2 font-medium text-text-muted">Teeth</th>
                <th className="px-4 py-2 font-medium text-text-muted">Shape</th>
                <th className="px-4 py-2 font-medium text-text-muted text-right">
                  Weight Bands / Prices ($/kg)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {entries.map((entry, i) => {
                const prices = (entry.weightBandPrices as Record<string, unknown>[]) || [];
                return (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2 font-mono font-semibold text-text-primary">
                      {String(entry.gradeCode || "-")}
                    </td>
                    <td className="px-4 py-2 text-text-secondary">
                      {String(entry.category || "-")}
                    </td>
                    <td className="px-4 py-2 text-text-muted">
                      {String(entry.fatRange || "-")}
                    </td>
                    <td className="px-4 py-2 text-text-muted">
                      {String(entry.dentitionRange || "-")}
                    </td>
                    <td className="px-4 py-2 text-text-muted">
                      {String(entry.shapeRange || "-")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {prices.map((p, j) => (
                          <span
                            key={j}
                            className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5"
                          >
                            <span className="text-text-muted">
                              {String(p.weightBandLabel || p.weightBandKg)}
                            </span>
                            <span className="font-mono font-medium text-indigo-400">
                              ${Number(p.pricePerKg).toFixed(2)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
