// Grid IQ Performance Dashboard - aggregated kill performance metrics and trends.
// Shows Kill Score trend, GCR trend, grade distribution, processor comparison.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  computeProducerProfile,
  getConfidenceLabel,
} from "@/lib/grid-iq/producer-profile";
import {
  ArrowLeft,
  TrendingUp,
  ShieldCheck,
  Target,
  Award,
  BarChart3,
  Scale,
} from "lucide-react";

export const metadata = { title: "Historic Results - Grid IQ" };

export default async function PerformancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = await computeProducerProfile(user!.id);

  // Fetch analysis history for trend data
  const { data: analyses } = await supabase
    .from("grid_iq_analyses")
    .select("id, herd_name, processor_name, analysis_date, kill_score, gcr, realisation_factor, head_count, analysis_mode")
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .eq("analysis_mode", "post_sale")
    .order("analysis_date", { ascending: true });

  // Fetch kill sheets for processor comparison
  const { data: killSheets } = await supabase
    .from("kill_sheet_records")
    .select("id, processor_name, kill_date, total_head_count, total_gross_value, total_body_weight, average_price_per_kg, realisation_factor")
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("kill_date", { ascending: false });

  const safeAnalyses = analyses ?? [];
  const safeKillSheets = killSheets ?? [];
  const hasData = profile.killSheetCount > 0;

  // Build processor comparison data
  const processorMap = new Map<string, { kills: number; totalHead: number; totalValue: number; rfSum: number; rfCount: number }>();
  for (const ks of safeKillSheets) {
    const name = ks.processor_name as string;
    const existing = processorMap.get(name) ?? { kills: 0, totalHead: 0, totalValue: 0, rfSum: 0, rfCount: 0 };
    existing.kills++;
    existing.totalHead += (ks.total_head_count as number) ?? 0;
    existing.totalValue += (ks.total_gross_value as number) ?? 0;
    const rf = ks.realisation_factor as number | null;
    if (rf != null && rf > 0) {
      existing.rfSum += rf;
      existing.rfCount++;
    }
    processorMap.set(name, existing);
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4 sm:hidden">
        <Link href="/dashboard/tools/grid-iq">
          <Button variant="ghost" size="sm" className="gap-1.5 text-text-muted hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            Grid IQ
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Historic Results"
        titleClassName="text-2xl font-semibold text-text-primary"
        subtitle="Historical kill performance metrics and trends"
        subtitleClassName="text-sm text-text-muted"
        compact
      />

      {!hasData ? (
        <Card className="mt-4">
          <EmptyState
            title="No performance data yet"
            description="Upload kill sheets and run post-sale analyses to build your performance profile. The more data you add, the more accurate your insights become."
            actionLabel="Upload Kill Sheet"
            actionHref="/dashboard/tools/grid-iq/upload?type=killsheet"
            variant="teal"
          />
        </Card>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Profile Overview */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MetricCard
                  icon={BarChart3}
                  label="Kill Sheets"
                  value={`${profile.killSheetCount}`}
                />
                <MetricCard
                  icon={Target}
                  label="Total Head"
                  value={profile.totalHeadProcessed.toLocaleString()}
                />
                <MetricCard
                  icon={Award}
                  label="Confidence"
                  value={profile.confidenceTier.charAt(0).toUpperCase() + profile.confidenceTier.slice(1)}
                />
                <MetricCard
                  icon={Scale}
                  label="Avg Weight"
                  value={profile.averageBodyWeight ? `${Math.round(profile.averageBodyWeight)} kg` : "-"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Average RF */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
                    <TrendingUp className="h-4 w-4 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                      Avg Realisation Factor
                    </p>
                    <p className="text-lg font-bold text-text-primary">
                      {profile.averageRF ? `${Math.round(profile.averageRF * 100)}%` : "-"}
                    </p>
                  </div>
                </div>
                {profile.latestRF != null && profile.averageRF != null && (
                  <p className="mt-2 text-xs text-text-muted">
                    Latest: {Math.round(profile.latestRF * 100)}%
                    {profile.latestRF > profile.averageRF ? " (above avg)" : profile.latestRF < profile.averageRF ? " (below avg)" : ""}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Average GCR */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                      Avg Grid Capture
                    </p>
                    <p className="text-lg font-bold text-text-primary">
                      {profile.averageGCR ? `${profile.averageGCR.toFixed(1)}%` : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Kill Score */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                    <Award className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                      Avg Kill Score
                    </p>
                    <p className="text-lg font-bold text-text-primary">
                      {profile.averageKillScore ? `${profile.averageKillScore.toFixed(0)}/100` : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Kill Score Trend */}
          {safeAnalyses.length > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-teal-400" />
                  <p className="text-sm font-semibold text-teal-400">Kill Score Trend</p>
                </div>
                <div className="space-y-2">
                  {safeAnalyses.map((a) => {
                    const ks = a.kill_score as number | null;
                    const gcr = a.gcr as number | null;
                    if (ks == null) return null;
                    const barWidth = Math.min(ks, 100);
                    const barColor = ks >= 85 ? "bg-emerald-400" : ks >= 70 ? "bg-teal-400" : ks >= 50 ? "bg-amber-400" : "bg-red-400";
                    return (
                      <div key={a.id} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-xs text-text-muted">
                          {new Date(a.analysis_date as string).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}
                        </span>
                        <div className="flex-1">
                          <div className="h-5 w-full overflow-hidden rounded-lg bg-white/[0.04]">
                            <div
                              className={`h-full rounded-lg ${barColor} transition-all`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-10 shrink-0 text-right text-xs font-semibold text-text-primary">
                          {ks.toFixed(0)}
                        </span>
                        {gcr != null && (
                          <span className="w-16 shrink-0 text-right text-[10px] text-text-muted">
                            GCR {gcr.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Grades */}
          {profile.topGrades.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-teal-400" />
                  <p className="text-sm font-semibold text-teal-400">Top Grades</p>
                </div>
                <div className="space-y-2">
                  {profile.topGrades.map((g) => (
                    <div key={g.gradeCode} className="flex items-center gap-3">
                      <span className="w-12 shrink-0 font-mono text-sm font-semibold text-text-primary">
                        {g.gradeCode}
                      </span>
                      <div className="flex-1">
                        <div className="h-5 w-full overflow-hidden rounded-lg bg-white/[0.04]">
                          <div
                            className="h-full rounded-lg bg-teal-400/60 transition-all"
                            style={{ width: `${Math.min(g.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-14 shrink-0 text-right text-xs text-text-muted">
                        {g.percentage.toFixed(1)}%
                      </span>
                      <span className="w-14 shrink-0 text-right text-xs text-text-secondary">
                        {g.bodyCount} head
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Line Item Averages */}
          {(profile.averageP8Fat != null || profile.averageDentition != null) && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-teal-400" />
                  <p className="text-sm font-semibold text-teal-400">Carcase Averages</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {profile.averageP8Fat != null && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Avg P8 Fat</p>
                      <p className="mt-0.5 text-sm font-bold text-text-primary">{profile.averageP8Fat.toFixed(1)} mm</p>
                    </div>
                  )}
                  {profile.averageDentition != null && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Avg Dentition</p>
                      <p className="mt-0.5 text-sm font-bold text-text-primary">{profile.averageDentition.toFixed(1)}</p>
                    </div>
                  )}
                  {profile.averageBodyWeight != null && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Avg HSCW</p>
                      <p className="mt-0.5 text-sm font-bold text-text-primary">{Math.round(profile.averageBodyWeight)} kg</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processor Comparison */}
          {processorMap.size > 1 && (
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                  <Target className="h-4 w-4 text-teal-400" />
                  <span className="text-sm font-semibold text-teal-400">Processor Comparison</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left">
                        <th className="px-4 py-2 font-medium text-text-muted">Processor</th>
                        <th className="px-4 py-2 font-medium text-text-muted text-right">Kills</th>
                        <th className="px-4 py-2 font-medium text-text-muted text-right">Head</th>
                        <th className="px-4 py-2 font-medium text-text-muted text-right">Total Value</th>
                        <th className="px-4 py-2 font-medium text-text-muted text-right">Avg RF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {Array.from(processorMap.entries())
                        .sort((a, b) => b[1].totalHead - a[1].totalHead)
                        .map(([name, data]) => (
                          <tr key={name} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-2 font-medium text-text-primary">{name}</td>
                            <td className="px-4 py-2 text-right text-text-secondary">{data.kills}</td>
                            <td className="px-4 py-2 text-right text-text-secondary">{data.totalHead.toLocaleString()}</td>
                            <td className="px-4 py-2 text-right font-semibold text-teal-400">
                              ${Math.round(data.totalValue).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right text-text-secondary">
                              {data.rfCount > 0 ? `${Math.round((data.rfSum / data.rfCount) * 100)}%` : "-"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confidence tier note */}
          <div className="rounded-xl bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-text-muted">
              {getConfidenceLabel(profile.confidenceTier)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
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
      <div className="mb-0.5 flex items-center justify-center gap-1">
        <Icon className="h-3 w-3 text-text-muted" />
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      </div>
      <p className="text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}
