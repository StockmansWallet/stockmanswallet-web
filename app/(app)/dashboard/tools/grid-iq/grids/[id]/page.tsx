// Grid detail page - shows full grid data with entries and delete option

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Grid3x3, Calendar, MapPin, User, Phone, Mail } from "lucide-react";
import { GridDeleteButton } from "./grid-delete-button";
import { EditableProcessorName } from "../../components/editable-processor-name";

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

  // Group entries by gender
  const maleEntries = entries.filter((e) => e.gender === "male");
  const femaleEntries = entries.filter((e) => e.gender === "female");
  const unisexEntries = entries.filter(
    (e) => !e.gender || (e.gender !== "male" && e.gender !== "female")
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Link href="/dashboard/tools/grid-iq/records?tab=grids">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Processor Records
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
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
        <GridDeleteButton gridId={id} />
      </div>

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
            {(g.location as string | null) ? (
              <MetaItem icon={MapPin} label="Location" value={String(g.location)} />
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
            color="text-teal-400"
            bg="bg-teal-500/15"
          />
        )}
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
                            className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5"
                          >
                            <span className="text-text-muted">
                              {String(p.weightBandLabel || p.weightBandKg)}
                            </span>
                            <span className="font-mono font-medium text-teal-400">
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
