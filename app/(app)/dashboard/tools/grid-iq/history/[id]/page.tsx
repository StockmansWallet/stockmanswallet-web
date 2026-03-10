// Kill sheet detail page - shows full kill sheet data with summaries and line items

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Hash,
  Scale,
  DollarSign,
  Layers,
} from "lucide-react";
import { KillSheetDeleteButton } from "./kill-sheet-delete-button";

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
        <Link href="/dashboard/tools/grid-iq/history">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kill Sheet History
          </Button>
        </Link>
      </div>

      <PageHeader
        title={String(ks.processor_name)}
        titleClassName="text-2xl font-bold text-teal-400"
        subtitle={
          ks.kill_date
            ? new Date(ks.kill_date as string).toLocaleDateString("en-AU")
            : undefined
        }
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
        actions={<KillSheetDeleteButton killSheetId={id} />}
      />

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
                        {numVal(item, "p8_fat_mm") || numVal(item, "p8Fat") || "-"}
                      </td>
                      <td className="px-3 py-1.5 text-right text-text-muted">
                        {numVal(item, "dentition") || "-"}
                      </td>
                      <td className="px-3 py-1.5 text-right text-text-secondary">
                        ${(Number(item.price_per_kg ?? item.leftPricePerKg ?? 0)).toFixed(2)}
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
