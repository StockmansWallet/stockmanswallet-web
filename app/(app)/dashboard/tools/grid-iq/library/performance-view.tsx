"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, ShieldCheck, Target, Award, BarChart3, Scale } from "lucide-react";
import type { ProducerProfile } from "@/lib/grid-iq/producer-profile";

// Inlined so this client component does not pull in the server-only
// producer-profile module at runtime.
function getConfidenceLabel(tier: ProducerProfile["confidenceTier"]): string {
  switch (tier) {
    case "expert":
      return "Expert - Strong historical data. Predictions are highly tuned to your operation.";
    case "personalised":
      return "Personalised - Based on your kill history. Predictions are tailored to your operation.";
    case "provisional":
      return "Provisional - Based on limited kill history. More data will improve accuracy.";
    case "baseline":
      return "Industry Baseline - Using industry defaults. Upload kill sheets to personalise.";
  }
}

export interface PerformanceTrendRow {
  id: string;
  analysis_date: string | null;
  kill_score: number | null;
  gcr: number | null;
}

interface Props {
  profile: ProducerProfile | null;
  trend: PerformanceTrendRow[];
}

export function PerformanceView({ profile, trend }: Props) {
  const hasData = (profile?.killSheetCount ?? 0) > 0;

  if (!hasData || !profile) {
    return (
      <Card>
        <EmptyState
          title="No performance data yet"
          description="Upload kill sheets and run post-sale analyses to build your performance profile. The more data you add, the more accurate your insights become."
          variant="grid-iq"
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Profile Overview */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard icon={BarChart3} label="Kill Sheets" value={`${profile.killSheetCount}`} />
            <MetricCard
              icon={Target}
              label="Total Head"
              value={profile.totalHeadProcessed.toLocaleString()}
            />
            <MetricCard
              icon={Award}
              label="Confidence"
              value={
                profile.confidenceTier.charAt(0).toUpperCase() + profile.confidenceTier.slice(1)
              }
            />
            <MetricCard
              icon={Scale}
              label="Avg Weight"
              value={
                profile.averageBodyWeight ? `${Math.round(profile.averageBodyWeight)} kg` : "-"
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="bg-grid-iq/15 flex h-8 w-8 items-center justify-center rounded-lg">
                <TrendingUp className="text-grid-iq h-4 w-4" />
              </div>
              <div>
                <p className="text-text-muted text-[10px] font-medium tracking-wider uppercase">
                  Avg Realisation Factor
                </p>
                <p className="text-text-primary text-lg font-bold">
                  {profile.averageRF ? `${Math.round(profile.averageRF * 100)}%` : "-"}
                </p>
              </div>
            </div>
            {profile.latestRF != null && profile.averageRF != null && (
              <p className="text-text-muted mt-2 text-xs">
                Latest: {Math.round(profile.latestRF * 100)}%
                {profile.latestRF > profile.averageRF
                  ? " (above avg)"
                  : profile.latestRF < profile.averageRF
                    ? " (below avg)"
                    : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="bg-success/15 flex h-8 w-8 items-center justify-center rounded-lg">
                <ShieldCheck className="text-success h-4 w-4" />
              </div>
              <div>
                <p className="text-text-muted text-[10px] font-medium tracking-wider uppercase">
                  Avg Grid Capture
                </p>
                <p className="text-text-primary text-lg font-bold">
                  {profile.averageGCR ? `${profile.averageGCR.toFixed(1)}%` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="bg-warning/15 flex h-8 w-8 items-center justify-center rounded-lg">
                <Award className="text-warning h-4 w-4" />
              </div>
              <div>
                <p className="text-text-muted text-[10px] font-medium tracking-wider uppercase">
                  Avg Kill Score
                </p>
                <p className="text-text-primary text-lg font-bold">
                  {profile.averageKillScore ? `${profile.averageKillScore.toFixed(0)}/100` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kill Score Trend */}
      {trend.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Award className="text-grid-iq h-4 w-4" />
              <p className="text-grid-iq text-sm font-semibold">Kill Score Trend</p>
            </div>
            <div className="space-y-2">
              {trend.map((a) => {
                const ks = a.kill_score;
                const gcr = a.gcr;
                if (ks == null) return null;
                const barWidth = Math.min(ks, 100);
                const barColor =
                  ks >= 85
                    ? "bg-success"
                    : ks >= 70
                      ? "bg-grid-iq"
                      : ks >= 50
                        ? "bg-warning"
                        : "bg-error";
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="text-text-muted w-20 shrink-0 text-xs">
                      {a.analysis_date
                        ? new Date(a.analysis_date).toLocaleDateString("en-AU", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "-"}
                    </span>
                    <div className="flex-1">
                      <div className="h-5 w-full overflow-hidden rounded-lg bg-white/[0.04]">
                        <div
                          className={`h-full rounded-lg ${barColor} transition-all`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-text-primary w-10 shrink-0 text-right text-xs font-semibold">
                      {ks.toFixed(0)}
                    </span>
                    {gcr != null && (
                      <span className="text-text-muted w-16 shrink-0 text-right text-[10px]">
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
              <BarChart3 className="text-grid-iq h-4 w-4" />
              <p className="text-grid-iq text-sm font-semibold">Top Grades</p>
            </div>
            <div className="space-y-2">
              {profile.topGrades.map((g) => (
                <div key={g.gradeCode} className="flex items-center gap-3">
                  <span className="text-text-primary w-12 shrink-0 font-mono text-sm font-semibold">
                    {g.gradeCode}
                  </span>
                  <div className="flex-1">
                    <div className="h-5 w-full overflow-hidden rounded-lg bg-white/[0.04]">
                      <div
                        className="bg-grid-iq/60 h-full rounded-lg transition-all"
                        style={{ width: `${Math.min(g.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-text-muted w-14 shrink-0 text-right text-xs">
                    {g.percentage.toFixed(1)}%
                  </span>
                  <span className="text-text-secondary w-14 shrink-0 text-right text-xs">
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
              <Scale className="text-grid-iq h-4 w-4" />
              <p className="text-grid-iq text-sm font-semibold">Carcase Averages</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {profile.averageP8Fat != null && (
                <div>
                  <p className="text-text-muted text-[10px] font-medium tracking-wider uppercase">
                    Avg P8 Fat
                  </p>
                  <p className="text-text-primary mt-0.5 text-sm font-bold">
                    {profile.averageP8Fat.toFixed(1)} mm
                  </p>
                </div>
              )}
              {profile.averageDentition != null && (
                <div>
                  <p className="text-text-muted text-[10px] font-medium tracking-wider uppercase">
                    Avg Dentition
                  </p>
                  <p className="text-text-primary mt-0.5 text-sm font-bold">
                    {profile.averageDentition.toFixed(1)}
                  </p>
                </div>
              )}
              {profile.averageBodyWeight != null && (
                <div>
                  <p className="text-text-muted text-[10px] font-medium tracking-wider uppercase">
                    Avg HSCW
                  </p>
                  <p className="text-text-primary mt-0.5 text-sm font-bold">
                    {Math.round(profile.averageBodyWeight)} kg
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confidence tier note */}
      <div className="rounded-xl bg-white/[0.02] px-4 py-3">
        <p className="text-text-muted text-xs">{getConfidenceLabel(profile.confidenceTier)}</p>
      </div>
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
        <Icon className="text-text-muted h-3 w-3" />
        <p className="text-text-muted text-[10px] font-medium tracking-wider uppercase">{label}</p>
      </div>
      <p className="text-text-primary text-sm font-bold">{value}</p>
    </div>
  );
}
