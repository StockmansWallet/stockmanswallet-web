// Kill Score card component - displays composite Kill Score with label and breakdown
// Used in Grid IQ analysis detail view

import { Card, CardContent } from "@/components/ui/card";
import { Star, CheckCircle, MinusCircle, AlertCircle } from "lucide-react";
import { killScoreLabelFromScore, type KillScoreLabel } from "@/lib/engines/kill-score-engine";

interface KillScoreCardProps {
  killScore: number;
  gcr: number | null;
  gridRisk: number | null;
  gridCompliance: number | null;
  fatCompliance: number | null;
  dentitionCompliance: number | null;
  realisationFactor: number | null;
  compact?: boolean;
}

// Debug: Map Kill Score label to colour and icon
function labelConfig(label: KillScoreLabel) {
  switch (label) {
    case "Excellent":
      return { color: "text-emerald-400", bg: "bg-emerald-500/15", icon: Star };
    case "Good":
      return { color: "text-teal-400", bg: "bg-teal-500/15", icon: CheckCircle };
    case "Fair":
      return { color: "text-amber-400", bg: "bg-amber-500/15", icon: MinusCircle };
    case "Poor":
      return { color: "text-red-400", bg: "bg-red-500/15", icon: AlertCircle };
  }
}

export function KillScoreCard({
  killScore,
  gcr,
  gridRisk,
  gridCompliance,
  fatCompliance,
  dentitionCompliance,
  realisationFactor,
  compact = false,
}: KillScoreCardProps) {
  const label = killScoreLabelFromScore(killScore);
  const config = labelConfig(label);
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bg}`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div>
          <p className={`text-sm font-bold ${config.color}`}>{killScore.toFixed(0)}</p>
          <p className="text-[10px] text-text-muted">{label}</p>
        </div>
      </div>
    );
  }

  // Debug: Build metrics array for the breakdown grid
  const metrics: { label: string; value: string; weight: string }[] = [];
  if (gcr !== null) metrics.push({ label: "GCR", value: `${gcr.toFixed(1)}%`, weight: "40%" });
  if (gridCompliance !== null) metrics.push({ label: "Grid Compliance", value: `${gridCompliance.toFixed(1)}%`, weight: "20%" });
  if (realisationFactor !== null) metrics.push({ label: "Realisation Factor", value: `${(realisationFactor * 100).toFixed(1)}%`, weight: "20%" });
  if (fatCompliance !== null) metrics.push({ label: "Fat Compliance", value: `${fatCompliance.toFixed(1)}%`, weight: "10%" });
  if (dentitionCompliance !== null) metrics.push({ label: "Dentition", value: `${dentitionCompliance.toFixed(1)}%`, weight: "10%" });

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header with score */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-muted">Kill Score</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`text-2xl font-bold ${config.color}`}>
                {killScore.toFixed(0)}
              </span>
              <span className="text-sm text-text-muted">/100</span>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${config.bg}`}>
            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
            <span className={`text-xs font-semibold ${config.color}`}>{label}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            85+ Excellent
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            70-84 Good
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            50-69 Fair
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            &lt;50 Poor
          </span>
        </div>

        {/* GCR and Grid Risk highlight */}
        {(gcr !== null || gridRisk !== null) && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {gcr !== null && (
              <div className="rounded-lg bg-white/[0.04] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Grid Capture Ratio
                </p>
                <p className="mt-1 text-lg font-bold text-text-primary">
                  {gcr.toFixed(1)}%
                </p>
              </div>
            )}
            {gridRisk !== null && (
              <div className="rounded-lg bg-white/[0.04] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Grid Risk
                </p>
                <p className={`mt-1 text-lg font-bold ${gridRisk > 30 ? "text-red-400" : gridRisk > 15 ? "text-amber-400" : "text-emerald-400"}`}>
                  {gridRisk.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        )}

        {/* Metric breakdown */}
        {metrics.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Score Breakdown
            </p>
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">{m.label}</span>
                  <span className="text-[10px] text-text-muted">({m.weight})</span>
                </div>
                <span className="text-xs font-semibold text-text-primary">{m.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
