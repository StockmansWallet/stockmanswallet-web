"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  TrendingUp,
  ShieldCheck,
  Target,
  Award,
  BarChart3,
  Scale,
} from "lucide-react";
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
          variant="indigo"
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
              value={
                profile.confidenceTier.charAt(0).toUpperCase() +
                profile.confidenceTier.slice(1)
              }
            />
            <MetricCard
              icon={Scale}
              label="Avg Weight"
              value={
                profile.averageBodyWeight
                  ? `${Math.round(profile.averageBodyWeight)} kg`
                  : "-"
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
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
                  {profile.averageKillScore
                    ? `${profile.averageKillScore.toFixed(0)}/100`
                    : "-"}
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
              <Award className="h-4 w-4 text-indigo-400" />
              <p className="text-sm font-semibold text-indigo-400">Kill Score Trend</p>
            </div>
            <div className="space-y-2">
              {trend.map((a) => {
                const ks = a.kill_score;
                const gcr = a.gcr;
                if (ks == null) return null;
                const barWidth = Math.min(ks, 100);
                const barColor =
                  ks >= 85
                    ? "bg-emerald-400"
                    : ks >= 70
                      ? "bg-indigo-400"
                      : ks >= 50
                        ? "bg-amber-400"
                        : "bg-red-400";
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-text-muted">
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
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              <p className="text-sm font-semibold text-indigo-400">Top Grades</p>
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
                        className="h-full rounded-lg bg-indigo-400/60 transition-all"
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
              <Scale className="h-4 w-4 text-indigo-400" />
              <p className="text-sm font-semibold text-indigo-400">Carcase Averages</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {profile.averageP8Fat != null && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                    Avg P8 Fat
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-text-primary">
                    {profile.averageP8Fat.toFixed(1)} mm
                  </p>
                </div>
              )}
              {profile.averageDentition != null && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                    Avg Dentition
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-text-primary">
                    {profile.averageDentition.toFixed(1)}
                  </p>
                </div>
              )}
              {profile.averageBodyWeight != null && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                    Avg HSCW
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-text-primary">
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
        <p className="text-xs text-text-muted">
          {getConfidenceLabel(profile.confidenceTier)}
        </p>
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
        <Icon className="h-3 w-3 text-text-muted" />
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          {label}
        </p>
      </div>
      <p className="text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}
