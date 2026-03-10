import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Grid3x3,
  FileText,
} from "lucide-react";

export const metadata = { title: "Grid IQ" };

export default async function GridIQPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch saved grids and kill sheets in parallel
  const [{ data: grids }, { data: killSheets }, { data: analyses }] =
    await Promise.all([
      supabase
        .from("processor_grids")
        .select(
          "id, processor_name, grid_code, grid_date, expiry_date, created_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("kill_sheet_records")
        .select(
          "id, processor_name, kill_date, total_head_count, total_gross_value, created_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("grid_iq_analyses")
        .select(
          "id, herd_name, processor_name, analysis_date, net_saleyard_value, net_processor_value, grid_iq_advantage, sell_window_status_raw, kill_score, gcr, analysis_mode, updated_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

  const safeGrids = grids ?? [];
  const safeKillSheets = killSheets ?? [];
  const safeAnalyses = analyses ?? [];
  const hasData =
    safeGrids.length > 0 ||
    safeKillSheets.length > 0 ||
    safeAnalyses.length > 0;

  return (
    <div>
      <div className="space-y-4">
        {/* Grid Analysis */}
        <Card>
          <CardHeader className="border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-400" />
                <CardTitle>Grid Analysis</CardTitle>
                {safeAnalyses.length > 0 && (
                  <Badge className="bg-teal-500/15 text-teal-400">{safeAnalyses.length}</Badge>
                )}
              </div>
              <Link
                href="/dashboard/tools/grid-iq/analyses"
                className="text-xs font-medium text-teal-400 hover:underline"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-white/[0.06] p-0">
            {safeAnalyses.length > 0 ? (
              safeAnalyses.map((a: Record<string, unknown>) => {
                const advantage = (a.grid_iq_advantage as number) ?? 0;
                const isProcessor = advantage > 0;
                const killScore = a.kill_score as number | null;
                const gcr = a.gcr as number | null;
                const mode = a.analysis_mode as string | null;
                return (
                  <Link
                    key={a.id as string}
                    href={`/dashboard/tools/grid-iq/analysis/${a.id}`}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {a.herd_name as string} vs {a.processor_name as string}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-xs text-text-muted">
                          {new Date(
                            a.analysis_date as string
                          ).toLocaleDateString("en-AU")}
                        </p>
                        {mode === "post_sale" && (
                          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-text-muted">
                            Post-Sale
                          </span>
                        )}
                        {killScore !== null && (
                          <span className={`text-[10px] font-medium ${killScore >= 85 ? "text-emerald-400" : killScore >= 70 ? "text-teal-400" : killScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                            KS {killScore.toFixed(0)}
                          </span>
                        )}
                        {gcr !== null && (
                          <span className="text-[10px] text-text-muted">
                            GCR {gcr.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${isProcessor ? "text-emerald-400" : "text-brand"}`}
                      >
                        {isProcessor ? "Over-the-Hooks" : "Saleyard"}
                      </p>
                      <p className="text-xs text-text-muted">
                        {isProcessor ? "+" : ""}$
                        {Math.abs(Math.round(advantage)).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="px-5 py-6 text-center text-xs text-text-muted">
                No analyses yet. Select New Analysis to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grids */}
        <Card>
          <CardHeader className="border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid3x3 className="h-4 w-4 text-teal-400" />
                <CardTitle>Grids</CardTitle>
                {safeGrids.length > 0 && (
                  <Badge className="bg-teal-500/15 text-teal-400">{safeGrids.length}</Badge>
                )}
              </div>
              <Link
                href="/dashboard/tools/grid-iq/grids"
                className="text-xs font-medium text-teal-400 hover:underline"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-white/[0.06] p-0">
            {safeGrids.length > 0 ? (
              safeGrids.map((g: Record<string, unknown>) => {
                const expiry = g.expiry_date
                  ? new Date(g.expiry_date as string)
                  : null;
                const now = new Date();
                const daysUntilExpiry = expiry
                  ? Math.ceil(
                      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    )
                  : null;
                const isExpired =
                  daysUntilExpiry !== null && daysUntilExpiry < 0;
                const isExpiringSoon =
                  daysUntilExpiry !== null &&
                  daysUntilExpiry >= 0 &&
                  daysUntilExpiry <= 7;

                return (
                  <Link
                    key={g.id as string}
                    href={`/dashboard/tools/grid-iq/grids/${g.id}`}
                    className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {g.processor_name as string}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {g.grid_code ? `${g.grid_code} · ` : ""}
                        {new Date(
                          g.grid_date as string
                        ).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    {(isExpired || isExpiringSoon) && (
                      <div
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          isExpired
                            ? "bg-red-500/15 text-red-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {isExpired
                          ? "Expired"
                          : `${daysUntilExpiry}d left`}
                      </div>
                    )}
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
                  </Link>
                );
              })
            ) : (
              <div className="px-5 py-6 text-center text-xs text-text-muted">
                No grids uploaded yet. Select New Grid to upload one.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kill Sheets */}
        <Card>
          <CardHeader className="border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-400" />
                <CardTitle>Kill Sheets</CardTitle>
                {safeKillSheets.length > 0 && (
                  <Badge className="bg-teal-500/15 text-teal-400">{safeKillSheets.length}</Badge>
                )}
              </div>
              <Link
                href="/dashboard/tools/grid-iq/history"
                className="text-xs font-medium text-teal-400 hover:underline"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-white/[0.06] p-0">
            {safeKillSheets.length > 0 ? (
              safeKillSheets.map((ks: Record<string, unknown>) => (
                <Link
                  key={ks.id as string}
                  href={`/dashboard/tools/grid-iq/history/${ks.id}`}
                  className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {ks.processor_name as string}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {new Date(
                        ks.kill_date as string
                      ).toLocaleDateString("en-AU")}{" "}
                      · {ks.total_head_count as number} head
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    $
                    {Math.round(
                      ks.total_gross_value as number
                    ).toLocaleString()}
                  </p>
                  <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
                </Link>
              ))
            ) : (
              <div className="px-5 py-6 text-center text-xs text-text-muted">
                No kill sheets uploaded yet. Select New Kill Sheet to upload one.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
