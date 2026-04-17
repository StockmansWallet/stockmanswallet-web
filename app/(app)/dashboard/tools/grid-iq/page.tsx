import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Grid3x3,
  FileText,
  Truck,
  ArrowRight,
  Upload,
} from "lucide-react";

export const metadata = { title: "Grid IQ" };

export default async function GridIQPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch saved grids and kill sheets in parallel
  const [{ data: grids }, { data: killSheets }, { data: analyses }, { data: consignments }, { data: pendingConsignments }] =
    await Promise.all([
      supabase
        .from("processor_grids")
        .select(
          "id, grid_name, processor_name, grid_code, grid_date, expiry_date, created_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("kill_sheet_records")
        .select(
          "id, record_name, processor_name, kill_date, total_head_count, total_gross_value, created_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("grid_iq_analyses")
        .select(
          "id, herd_name, processor_name, analysis_date, net_saleyard_value, net_processor_value, grid_iq_advantage, sell_window_status_raw, kill_score, gcr, analysis_mode, updated_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false })
        .limit(3),
      supabase
        .from("consignments")
        .select(
          "id, consignment_name, processor_name, plant_location, booking_reference, kill_date, status, total_head_count, total_gross_value, updated_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false })
        .limit(3),
      supabase
        .from("consignments")
        .select(
          "id, consignment_name, processor_name, plant_location, kill_date, status, total_head_count, processor_grid_id, updated_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .in("status", ["draft", "confirmed"])
        .order("updated_at", { ascending: false })
        .limit(3),
    ]);

  const safeGrids = grids ?? [];
  const safeKillSheets = killSheets ?? [];
  const safeAnalyses = analyses ?? [];
  const safeConsignments = consignments ?? [];
  const safePending = pendingConsignments ?? [];

  return (
    <div className="space-y-4">
      {/* Pending Consignments - Action Needed (full width) */}
      {safePending.length > 0 && (
        <Card className="border-amber-500/20">
            <CardHeader className="border-b border-amber-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-amber-400" />
                  <CardTitle className="text-amber-400">Pending Consignments</CardTitle>
                  <Badge className="bg-amber-500/15 text-amber-400">{safePending.length}</Badge>
                </div>
                <Link
                  href="/dashboard/tools/grid-iq/consignments"
                  className="inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/25"
                >
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-white/[0.06] p-0">
              {safePending.map((c: Record<string, unknown>) => (
                <Link
                  key={c.id as string}
                  href={`/dashboard/tools/grid-iq/consignments/${c.id}`}
                  className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {(c.consignment_name as string | null) || (c.processor_name as string)}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                      {(c.consignment_name as string | null) && <span>{c.processor_name as string}</span>}
                      {(c.kill_date as string | null) && (
                        <span>{new Date(c.kill_date as string).toLocaleDateString("en-AU")}</span>
                      )}
                      <span>{c.total_head_count as number ?? 0} head</span>
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                        {(c.processor_grid_id as string | null) ? "Ready for post-kill" : "Draft"}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-amber-400/50 transition-all group-hover:translate-x-0.5 group-hover:text-amber-400" />
                </Link>
              ))}
            </CardContent>
          </Card>
      )}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                href="/dashboard/tools/grid-iq/library?tab=analyses"
                className="inline-flex items-center rounded-full border border-white/[0.08] bg-surface-lowest px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-white/[0.14] hover:text-text-primary"
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
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-text-muted">
                            Post-Sale
                          </span>
                        )}
                        {killScore !== null && (
                          <span
                            title="Kill Score: 85+ Excellent, 70-84 Good, 50-69 Fair, <50 Poor"
                            className={`text-[10px] font-medium ${killScore >= 85 ? "text-emerald-400" : killScore >= 70 ? "text-teal-400" : killScore >= 50 ? "text-amber-400" : "text-red-400"}`}
                          >
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

        {/* Consignments */}
        <Card>
          <CardHeader className="border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-teal-400" />
                <CardTitle>Consignments</CardTitle>
                {safeConsignments.length > 0 && (
                  <Badge className="bg-teal-500/15 text-teal-400">{safeConsignments.length}</Badge>
                )}
              </div>
              <Link
                href="/dashboard/tools/grid-iq/consignments"
                className="inline-flex items-center rounded-full border border-white/[0.08] bg-surface-lowest px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-white/[0.14] hover:text-text-primary"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-white/[0.06] p-0">
            {safeConsignments.length > 0 ? (
              safeConsignments.map((c: Record<string, unknown>) => {
                const status = c.status as string;
                const badgeCls = status === "completed"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : status === "confirmed"
                    ? "bg-teal-500/15 text-teal-400"
                    : "bg-white/[0.06] text-text-muted";
                return (
                  <Link
                    key={c.id as string}
                    href={`/dashboard/tools/grid-iq/consignments/${c.id}`}
                    className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {(c.consignment_name as string | null) || (c.processor_name as string)}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                        {(c.consignment_name as string | null) && <span>{c.processor_name as string}</span>}
                        {(c.kill_date as string | null) && (
                          <span>{new Date(c.kill_date as string).toLocaleDateString("en-AU")}</span>
                        )}
                        <span>{c.total_head_count as number ?? 0} head</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeCls}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>
                    </div>
                    {(c.total_gross_value as number | null) != null && (c.total_gross_value as number) > 0 && (
                      <p className="text-sm font-semibold text-emerald-400">
                        ${Math.round(c.total_gross_value as number).toLocaleString()}
                      </p>
                    )}
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
                  </Link>
                );
              })
            ) : (
              <div className="px-5 py-6 text-center text-xs text-text-muted">
                No consignments yet. Create one to track processor bookings.
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
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/tools/grid-iq/library?tab=grids&upload=grid"
                  className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-medium text-teal-400 transition-colors hover:bg-teal-500/25"
                >
                  <Upload className="h-3 w-3" />
                  Upload
                </Link>
                <Link
                  href="/dashboard/tools/grid-iq/library?tab=grids"
                  className="inline-flex items-center rounded-full border border-white/[0.08] bg-surface-lowest px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-white/[0.14] hover:text-text-primary"
                >
                  View All
                </Link>
              </div>
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
                        {(g.grid_name as string | null) || (g.processor_name as string)}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {(g.grid_name as string | null) ? `${g.processor_name as string} · ` : ""}
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
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
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
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/tools/grid-iq/library?tab=kill-sheets&upload=killsheet"
                  className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-medium text-teal-400 transition-colors hover:bg-teal-500/25"
                >
                  <Upload className="h-3 w-3" />
                  Upload
                </Link>
                <Link
                  href="/dashboard/tools/grid-iq/library?tab=kill-sheets"
                  className="inline-flex items-center rounded-full border border-white/[0.08] bg-surface-lowest px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-white/[0.14] hover:text-text-primary"
                >
                  View All
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-white/[0.06] p-0">
            {safeKillSheets.length > 0 ? (
              safeKillSheets.map((ks: Record<string, unknown>) => (
                <Link
                  key={ks.id as string}
                  href={`/dashboard/tools/grid-iq/kill-sheets/${ks.id}`}
                  className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {(ks.record_name as string | null) || (ks.processor_name as string)}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {(ks.record_name as string | null) ? `${ks.processor_name as string} · ` : ""}
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
                  <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
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
