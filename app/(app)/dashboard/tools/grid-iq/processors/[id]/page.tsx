import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronRight,
  Grid3x3,
  FileText,
  TrendingUp,
} from "lucide-react";
import { ProcessorForm } from "../processor-form";
import { ProcessorDeleteButton } from "./processor-delete-button";
import { PrimaryToggle } from "./primary-toggle";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProcessorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: processor } = await supabase
    .from("processors")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .single();

  if (!processor) notFound();

  const [{ data: gridsRaw }, { data: killSheetsRaw }, { data: analysesRaw }] =
    await Promise.all([
      supabase
        .from("processor_grids")
        .select("id, grid_name, processor_name, grid_date")
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .eq("processor_id", id)
        .order("grid_date", { ascending: false })
        .limit(26),
      supabase
        .from("kill_sheet_records")
        .select("id, record_name, processor_name, kill_date, total_head_count")
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .eq("processor_id", id)
        .order("kill_date", { ascending: false })
        .limit(26),
      supabase
        .from("grid_iq_analyses")
        .select("id, herd_name, analysis_mode, analysis_date, grid_iq_advantage")
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .eq("processor_id", id)
        .order("analysis_date", { ascending: false })
        .limit(26),
    ]);
  const hasMoreGrids = (gridsRaw?.length ?? 0) > 25;
  const hasMoreKillSheets = (killSheetsRaw?.length ?? 0) > 25;
  const hasMoreAnalyses = (analysesRaw?.length ?? 0) > 25;
  const grids = (gridsRaw ?? []).slice(0, 25);
  const killSheets = (killSheetsRaw ?? []).slice(0, 25);
  const analyses = (analysesRaw ?? []).slice(0, 25);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <PageHeader feature="grid-iq"
          title={processor.name}
          titleClassName="text-2xl font-bold text-teal"
          subtitle={processor.address || "No address set"}
          subtitleClassName="text-sm text-text-secondary"
          compact
        />
        <div className="shrink-0 self-start">
          <PrimaryToggle
            processorId={id}
            initialIsPrimary={!!processor.is_primary}
          />
        </div>
      </div>

      <div className="mt-4">
        <ProcessorForm
          mode="edit"
          initial={{
            id,
            name: processor.name,
            address: processor.address,
            location_latitude: processor.location_latitude,
            location_longitude: processor.location_longitude,
            contact_name: processor.contact_name,
            contact_phone: processor.contact_phone,
            contact_email: processor.contact_email,
            notes: processor.notes,
          }}
        />
      </div>

      {grids && grids.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <Grid3x3 className="h-4 w-4 text-teal" />
              <span className="text-sm font-semibold text-teal">
                Grids ({grids.length})
              </span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {grids.map((g) => (
                <Link
                  key={g.id}
                  href={`/dashboard/tools/grid-iq/grids/${g.id}`}
                  className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <Grid3x3 className="h-4 w-4 shrink-0 text-teal" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary">
                      {g.grid_name || g.processor_name}
                    </p>
                    {g.grid_date && (
                      <p className="text-xs text-text-muted">
                        {new Date(g.grid_date).toLocaleDateString("en-AU")}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
            {hasMoreGrids && (
              <div className="border-t border-white/[0.06] px-4 py-2.5 text-center">
                <Link
                  href="/dashboard/tools/grid-iq/library?tab=grids"
                  className="text-xs font-medium text-teal hover:underline"
                >
                  Showing latest 25. View all in Library →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {killSheets && killSheets.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <FileText className="h-4 w-4 text-teal" />
              <span className="text-sm font-semibold text-teal">
                Kill Sheets ({killSheets.length})
              </span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {killSheets.map((k) => (
                <Link
                  key={k.id}
                  href={`/dashboard/tools/grid-iq/kill-sheets/${k.id}`}
                  className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <FileText className="h-4 w-4 shrink-0 text-teal" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary">
                      {k.record_name || k.processor_name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {k.kill_date
                        ? new Date(k.kill_date).toLocaleDateString("en-AU")
                        : "No date"}
                      {k.total_head_count != null
                        ? ` - ${k.total_head_count} head`
                        : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
            {hasMoreKillSheets && (
              <div className="border-t border-white/[0.06] px-4 py-2.5 text-center">
                <Link
                  href="/dashboard/tools/grid-iq/library?tab=kill-sheets"
                  className="text-xs font-medium text-teal hover:underline"
                >
                  Showing latest 25. View all in Library →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {analyses && analyses.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <TrendingUp className="h-4 w-4 text-teal" />
              <span className="text-sm font-semibold text-teal">
                Analyses ({analyses.length})
              </span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {analyses.map((a) => {
                const advantage = (a.grid_iq_advantage as number) ?? 0;
                const isProcessor = advantage > 0;
                return (
                  <Link
                    key={a.id}
                    href={`/dashboard/tools/grid-iq/analysis/${a.id}`}
                    className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <TrendingUp className="h-4 w-4 shrink-0 text-teal" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary">
                        {a.herd_name ?? "Multi-herd"}
                      </p>
                      <p className="text-xs text-text-muted">
                        {a.analysis_date
                          ? new Date(a.analysis_date as string).toLocaleDateString("en-AU")
                          : "-"}
                        {" - "}
                        {a.analysis_mode === "post_sale"
                          ? "Post-Sale"
                          : "Pre-Sale"}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${isProcessor ? "text-success" : "text-warning"}`}
                    >
                      {isProcessor ? "+" : "-"}$
                      {Math.abs(Math.round(advantage)).toLocaleString()}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
            {hasMoreAnalyses && (
              <div className="border-t border-white/[0.06] px-4 py-2.5 text-center">
                <Link
                  href="/dashboard/tools/grid-iq/library?tab=analyses"
                  className="text-xs font-medium text-teal hover:underline"
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
        <ProcessorDeleteButton processorId={id} />
      </div>
    </div>
  );
}
