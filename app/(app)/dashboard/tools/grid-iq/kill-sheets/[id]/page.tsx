// Kill sheet detail page - shows full kill sheet data with summaries and line items

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  Hash,
  Scale,
  DollarSign,
  Layers,
  ClipboardList,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { KillSheetDeleteButton } from "./kill-sheet-delete-button";
import { EditableProcessorName } from "../../components/editable-processor-name";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KillSheetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: killSheet } = await supabase
    .from("kill_sheet_records")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .single();

  if (!killSheet) notFound();

  // Related records: parent consignment and analyses that reference this kill sheet
  const [{ data: parentConsignment }, { data: relatedAnalyses }] =
    await Promise.all([
      supabase
        .from("consignments")
        .select(
          "id, consignment_name, processor_name, status, kill_date, total_head_count"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .eq("kill_sheet_record_id", id)
        .maybeSingle(),
      supabase
        .from("grid_iq_analyses")
        .select(
          "id, herd_name, analysis_date, analysis_mode, grid_iq_advantage, head_count, kill_score"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .eq("kill_sheet_record_id", id)
        .order("analysis_date", { ascending: false })
        .limit(25),
    ]);

  const ks = killSheet as Record<string, unknown>;
  const categorySummaries =
    (ks.category_summaries as Record<string, unknown>[]) || [];
  const gradeDistribution =
    (ks.grade_distribution as Record<string, unknown>[]) || [];
  const lineItems = (ks.line_items as Record<string, unknown>[]) || [];

  const avgPricePerKg = ks.average_price_per_kg as number;
  const avgBodyWeight = ks.average_body_weight as number;
  const totalHead = ks.total_head_count as number;
  const totalWeight = ks.total_body_weight as number;
  const totalValue = ks.total_gross_value as number;

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Link href="/dashboard/tools/grid-iq/library?tab=kill-sheets">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Library
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <EditableProcessorName
            recordId={id}
            table="kill_sheet_records"
            initialName={String((ks.record_name as string | null) || ks.processor_name)}
          />
          <p className="mt-0.5 text-sm font-medium text-text-secondary">
            {String(ks.processor_name)}
            {(ks.kill_date as string | null) ? ` - ${new Date(ks.kill_date as string).toLocaleDateString("en-AU")}` : ""}
          </p>
        </div>
        <KillSheetDeleteButton killSheetId={id} />
      </div>

      {/* Summary Stats */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatItem icon={Hash} label="Total Head" value={`${totalHead}`} />
            <StatItem
              icon={Scale}
              label="Total Weight"
              value={`${Math.round(totalWeight).toLocaleString()} kg`}
            />
            <StatItem
              icon={DollarSign}
              label="Total Value"
              value={`$${totalValue.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`}
            />
            <StatItem
              icon={DollarSign}
              label="Avg $/kg"
              value={`$${avgPricePerKg.toFixed(2)}`}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-white/[0.06] pt-3">
            <StatItem
              icon={Scale}
              label="Avg Weight"
              value={`${Math.round(avgBodyWeight)} kg`}
            />
            <StatItem
              icon={DollarSign}
              label="Avg $/head"
              value={`$${totalHead > 0 ? Math.round(totalValue / totalHead).toLocaleString() : "0"}`}
            />
            {Number(ks.condemns) > 0 ? (
              <StatItem
                icon={Hash}
                label="Condemns"
                value={`${ks.condemns as number}`}
              />
            ) : null}
            {Number(ks.realisation_factor) > 0 ? (
              <StatItem
                icon={Layers}
                label="Realisation"
                value={`${Math.round((ks.realisation_factor as number) * 100)}%`}
              />
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      {((ks.vendor_code as string | null) || (ks.pic as string | null) || (ks.property_name as string | null) || (ks.booking_reference as string | null)) ? (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
              {(ks.vendor_code as string | null) ? (
                <MetaRow label="Vendor Code" value={String(ks.vendor_code)} />
              ) : null}
              {(ks.pic as string | null) ? <MetaRow label="PIC" value={String(ks.pic)} /> : null}
              {(ks.property_name as string | null) ? (
                <MetaRow label="Property" value={String(ks.property_name)} />
              ) : null}
              {(ks.booking_reference as string | null) ? (
                <MetaRow
                  label="Booking Ref"
                  value={String(ks.booking_reference)}
                />
              ) : null}
              {(ks.booking_type as string | null) ? (
                <MetaRow label="Booking Type" value={String(ks.booking_type)} />
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Category Summaries */}
      {categorySummaries.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <Layers className="h-4 w-4 text-teal-400" />
              <span className="text-sm font-semibold text-teal-400">
                Category Summaries
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="px-4 py-2 font-medium text-text-muted">Category</th>
                    <th className="px-4 py-2 font-medium text-text-muted text-right">Head</th>
                    <th className="px-4 py-2 font-medium text-text-muted text-right">%</th>
                    <th className="px-4 py-2 font-medium text-text-muted text-right">Total Wt</th>
                    <th className="px-4 py-2 font-medium text-text-muted text-right">Avg Wt</th>
                    <th className="px-4 py-2 font-medium text-text-muted text-right">Avg $/kg</th>
                    <th className="px-4 py-2 font-medium text-text-muted text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {categorySummaries.map((cat, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2 font-semibold text-text-primary">
                        {String(cat.category)}
                      </td>
                      <td className="px-4 py-2 text-right text-text-secondary">
                        {numVal(cat, "body_count") || numVal(cat, "bodyCount")}
                      </td>
                      <td className="px-4 py-2 text-right text-text-muted">
                        {(
                          Number(cat.percentage) || 0
                        ).toFixed(1)}
                        %
                      </td>
                      <td className="px-4 py-2 text-right text-text-secondary">
                        {Math.round(
                          Number(cat.total_weight ?? cat.totalWeight) || 0
                        ).toLocaleString()}{" "}
                        kg
                      </td>
                      <td className="px-4 py-2 text-right text-text-secondary">
                        {Math.round(
                          Number(cat.average_weight ?? cat.averageWeight) || 0
                        )}{" "}
                        kg
                      </td>
                      <td className="px-4 py-2 text-right text-text-secondary">
                        $
                        {(
                          Number(cat.average_price_per_kg ?? cat.averagePricePerKg) || 0
                        ).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-teal-400">
                        $
                        {Math.round(
                          Number(cat.total_value ?? cat.totalValue) || 0
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grade Distribution */}
      {gradeDistribution.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <FileText className="h-4 w-4 text-teal-400" />
              <span className="text-sm font-semibold text-teal-400">
                Grade Distribution
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="px-4 py-2 font-medium text-text-muted">Grade</th>
                    <th className="px-4 py-2 font-medium text-text-muted">Category</th>
                    <th className="px-4 py-2 font-medium text-text-muted text-right">Head</th>
                    <th className="px-4 py-2 font-medium text-text-muted text-right">%</th>
                    <th className="px-4 py-2 font-medium text-text-muted text-right">Total Wt</th>
                    <th className="px-4 py-2 font-medium text-text-muted text-right">Avg Wt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {gradeDistribution.map((gr, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2 font-mono font-semibold text-text-primary">
                        {String(gr.grade_code ?? gr.gradeCode ?? "-")}
                      </td>
                      <td className="px-4 py-2 text-text-secondary">
                        {String(gr.category || "-")}
                      </td>
                      <td className="px-4 py-2 text-right text-text-secondary">
                        {numVal(gr, "body_count") || numVal(gr, "bodyCount")}
                      </td>
                      <td className="px-4 py-2 text-right text-text-muted">
                        {(Number(gr.percentage) || 0).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-right text-text-secondary">
                        {Math.round(
                          Number(gr.total_weight ?? gr.totalWeight) || 0
                        ).toLocaleString()}{" "}
                        kg
                      </td>
                      <td className="px-4 py-2 text-right text-text-secondary">
                        {Math.round(
                          Number(gr.average_weight ?? gr.averageWeight) || 0
                        )}{" "}
                        kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      {lineItems.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <Hash className="h-4 w-4 text-teal-400" />
              <span className="text-sm font-semibold text-teal-400">
                Line Items ({lineItems.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="px-3 py-2 font-medium text-text-muted">#</th>
                    <th className="px-3 py-2 font-medium text-text-muted">Grade</th>
                    <th className="px-3 py-2 font-medium text-text-muted">Cat</th>
                    <th className="px-3 py-2 font-medium text-text-muted text-right">HSCW</th>
                    <th className="px-3 py-2 font-medium text-text-muted text-right">P8</th>
                    <th className="px-3 py-2 font-medium text-text-muted text-right">Dent</th>
                    <th className="px-3 py-2 font-medium text-text-muted text-right">$/kg</th>
                    <th className="px-3 py-2 font-medium text-text-muted text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {lineItems.map((item, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-1.5 text-text-muted">
                        {numVal(item, "body_number") || numVal(item, "bodyNumber") || i + 1}
                      </td>
                      <td className="px-3 py-1.5 font-mono font-semibold text-text-primary">
                        {String(item.grade || item.left_grade || item.leftGrade || "-")}
                      </td>
                      <td className="px-3 py-1.5 text-text-secondary">
                        {String(item.category || "-")}
                      </td>
                      <td className="px-3 py-1.5 text-right text-text-secondary">
                        {(
                          Number(item.hscw_kg ?? item.totalBodyWeight ?? 0)
                        ).toFixed(1)}
                      </td>
                      <td className="px-3 py-1.5 text-right text-text-muted">
                        {numVal(item, "p8_fat_mm", "p8_fat", "p8Fat") || "-"}
                      </td>
                      <td className="px-3 py-1.5 text-right text-text-muted">
                        {numVal(item, "dentition") || "-"}
                      </td>
                      <td className="px-3 py-1.5 text-right text-text-secondary">
                        ${(
                          Number(
                            item.price_per_kg ??
                              item.leftPricePerKg ??
                              item.left_price_per_kg ??
                              0
                          )
                        ).toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-teal-400">
                        ${Math.round(Number(item.gross_value ?? item.grossValue ?? 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary-only notice */}
      {lineItems.length === 0 && totalHead > 0 && (
        <Card className="mt-4">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-text-muted">
              Summary-only kill sheet. {totalHead} head across{" "}
              {categorySummaries.length} categories. No per-head line items in
              this format.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Parent consignment */}
      {parentConsignment && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <ClipboardList className="h-4 w-4 text-teal-400" />
              <span className="text-sm font-semibold text-teal-400">
                Part of consignment
              </span>
            </div>
            <Link
              href={`/dashboard/tools/grid-iq/consignments/${parentConsignment.id}`}
              className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10">
                <ClipboardList className="h-4 w-4 text-teal-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {(parentConsignment.consignment_name as string | null) ||
                    `${parentConsignment.processor_name as string} consignment`}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] capitalize">
                    {String(parentConsignment.status ?? "draft")}
                  </span>
                  {parentConsignment.kill_date && (
                    <span>
                      {new Date(
                        parentConsignment.kill_date as string
                      ).toLocaleDateString("en-AU")}
                    </span>
                  )}
                  {parentConsignment.total_head_count != null && (
                    <span>
                      {parentConsignment.total_head_count as number} head
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Analyses using this kill sheet */}
      {relatedAnalyses && relatedAnalyses.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <TrendingUp className="h-4 w-4 text-teal-400" />
              <span className="text-sm font-semibold text-teal-400">
                Analyses using this kill sheet
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
                const killScore = a.kill_score as number | null;
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
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px]">
                          {mode === "post_sale" ? "Post-Sale" : "Pre-Sale"}
                        </span>
                        {typeof a.head_count === "number" && a.head_count > 0 ? (
                          <span>{a.head_count} head</span>
                        ) : null}
                        {killScore !== null && killScore !== undefined && (
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
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          isProcessor ? "text-emerald-400" : "text-brand"
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className="h-3 w-3 text-text-muted" />
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          {label}
        </p>
      </div>
      <p className="text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

// Safely extract a numeric value from an object with multiple possible key names
function numVal(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return String(obj[key]);
  }
  return "";
}
