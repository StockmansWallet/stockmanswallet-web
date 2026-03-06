import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Grid3x3,
  Upload,
  FileText,
  BarChart3,
  Target,
  Brain,
  ChevronRight,
  AlertTriangle,
  Plus,
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
          "id, herd_name, processor_name, analysis_date, net_saleyard_value, net_processor_value, grid_iq_advantage, sell_window_status_raw, created_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
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
    <div className="max-w-6xl">
      <PageHeader
        title="Grid IQ"
        subtitle="Processor intelligence. What's the smartest selling move right now?"
        actions={
          <Link href="/dashboard/tools/grid-iq/upload">
            <Button size="sm">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload Grid
            </Button>
          </Link>
        }
      />

      {/* Feature Highlights */}
      {!hasData && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  icon: Grid3x3,
                  label: "Grid Analysis",
                  desc: "Upload processor grids via photo or PDF",
                },
                {
                  icon: FileText,
                  label: "Kill Sheets",
                  desc: "Track abattoir performance over time",
                },
                {
                  icon: BarChart3,
                  label: "Net Comparison",
                  desc: "Saleyard vs over-the-hooks with freight",
                },
                {
                  icon: Brain,
                  label: "Decision Intelligence",
                  desc: "AI-powered sell window and fit scoring",
                },
              ].map((f) => (
                <div key={f.label} className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15">
                    <f.icon className="h-5 w-5 text-teal-400" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-text-primary">
                    {f.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Link href="/dashboard/tools/grid-iq/upload">
          <Card className="group h-full transition-all hover:bg-white/[0.07]">
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                <Plus className="h-5 w-5 text-teal-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-text-primary">
                  New Analysis
                </h3>
                <p className="text-xs text-text-muted">
                  Upload grid and compare
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/tools/grid-iq/grids">
          <Card className="group h-full transition-all hover:bg-white/[0.07]">
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                <Grid3x3 className="h-5 w-5 text-teal-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-text-primary">
                  Saved Grids
                </h3>
                <p className="text-xs text-text-muted">
                  {safeGrids.length > 0
                    ? `${safeGrids.length} grid${safeGrids.length !== 1 ? "s" : ""}`
                    : "No grids yet"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/tools/grid-iq/history">
          <Card className="group h-full transition-all hover:bg-white/[0.07]">
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                <FileText className="h-5 w-5 text-teal-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-text-primary">
                  Kill Sheets
                </h3>
                <p className="text-xs text-text-muted">
                  {safeKillSheets.length > 0
                    ? `${safeKillSheets.length} sheet${safeKillSheets.length !== 1 ? "s" : ""}`
                    : "No kill sheets yet"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Analyses */}
      {safeAnalyses.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Analyses</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-white/[0.06] p-0">
              {safeAnalyses.map((a: Record<string, unknown>) => {
                const advantage = (a.grid_iq_advantage as number) ?? 0;
                const isProcessor = advantage > 0;
                return (
                  <div
                    key={a.id as string}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {a.herd_name as string} vs {a.processor_name as string}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {new Date(
                          a.analysis_date as string
                        ).toLocaleDateString("en-AU")}
                      </p>
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
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Grids with Expiry */}
      {safeGrids.length > 0 && (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Saved Grids</CardTitle>
                <Link
                  href="/dashboard/tools/grid-iq/grids"
                  className="text-xs font-medium text-brand hover:underline"
                >
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-white/[0.06] p-0">
              {safeGrids.map((g: Record<string, unknown>) => {
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
                  <div
                    key={g.id as string}
                    className="flex items-center justify-between px-5 py-3.5"
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
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Kill Sheets */}
      {safeKillSheets.length > 0 && (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Kill Sheets</CardTitle>
                <Link
                  href="/dashboard/tools/grid-iq/history"
                  className="text-xs font-medium text-brand hover:underline"
                >
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-white/[0.06] p-0">
              {safeKillSheets.map((ks: Record<string, unknown>) => (
                <div
                  key={ks.id as string}
                  className="flex items-center justify-between px-5 py-3.5"
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
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!hasData && (
        <div className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10">
                <Target className="h-6 w-6 text-teal-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-text-primary">
                No analyses yet
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-text-muted">
                Upload a processor grid to compare saleyard vs over-the-hooks
                value with freight and kill history factored in.
              </p>
              <Link href="/dashboard/tools/grid-iq/upload">
                <Button size="sm" className="mt-4">
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload Your First Grid
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
