import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, ChevronRight, ArrowLeft } from "lucide-react";

export const metadata = { title: "Grid Analyses - Grid IQ" };

export default async function AnalysesListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: analyses } = await supabase
    .from("grid_iq_analyses")
    .select(
      "id, herd_name, processor_name, analysis_date, net_saleyard_value, net_processor_value, grid_iq_advantage, sell_window_status_raw, kill_score, gcr, analysis_mode, updated_at"
    )
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  const safeAnalyses = analyses ?? [];

  return (
    <div>
      <div className="mb-4 sm:hidden">
        <Link href="/dashboard/tools/grid-iq">
          <Button variant="ghost" size="sm" className="gap-1.5 text-text-muted hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            Grid IQ
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Grid Analyses"
        titleClassName="text-2xl font-semibold text-text-primary"
        subtitle="Saleyard vs over-the-hooks comparisons"
        subtitleClassName="text-sm text-text-muted"
        inline
        compact
      />

      {safeAnalyses.length > 0 ? (
        <Card>
          <CardContent className="divide-y divide-white/[0.06] p-0">
            {safeAnalyses.map((a: Record<string, unknown>) => {
              const advantage = (a.grid_iq_advantage as number) ?? 0;
              const isProcessor = advantage > 0;
              const killScore = a.kill_score as number | null;
              const gcr = a.gcr as number | null;
              const mode = a.analysis_mode as string | null;

              return (
                <Link
                  key={a.id as string}
                  href={`/dashboard/tools/grid-iq/analysis/${a.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                    <TrendingUp className="h-5 w-5 text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {a.herd_name as string} vs {a.processor_name as string}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
                      <span>
                        {new Date(a.analysis_date as string).toLocaleDateString("en-AU")}
                      </span>
                      {mode === "post_sale" && (
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px]">
                          Post-Sale
                        </span>
                      )}
                      {killScore !== null && (
                        <span className={`text-[10px] font-medium ${killScore >= 85 ? "text-emerald-400" : killScore >= 70 ? "text-teal-400" : killScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                          KS {killScore.toFixed(0)}
                        </span>
                      )}
                      {gcr !== null && (
                        <span className="text-[10px]">GCR {gcr.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isProcessor ? "text-emerald-400" : "text-brand"}`}>
                      {isProcessor ? "Over-the-Hooks" : "Saleyard"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {isProcessor ? "+" : ""}${Math.abs(Math.round(advantage)).toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="No analyses yet"
            description="Run a Grid IQ analysis to compare saleyard vs over-the-hooks value for your herds."
            actionLabel="New Analysis"
            actionHref="/dashboard/tools/grid-iq/analyse"
            variant="teal"
          />
        </Card>
      )}
    </div>
  );
}
