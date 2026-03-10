// Grid IQ analysis detail page - full view of a single analysis
// Shows value comparison, scorecard metrics, sell window, and opportunity insights

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KillScoreCard } from "@/components/grid-iq/kill-score-card";
import { AnalysisComparison } from "@/components/grid-iq/analysis-comparison";
import {
  ArrowLeft,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Zap,
  Check,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalysisDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Debug: Fetch the full analysis record
  const { data: analysis } = await supabase
    .from("grid_iq_analyses")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .single();

  if (!analysis) notFound();

  const a = analysis as Record<string, unknown>;
  const mode = (a.analysis_mode as string) ?? "pre_sale";
  const isPostSale = mode === "post_sale";
  const advantage = (a.grid_iq_advantage as number) ?? 0;

  // Debug: Sell window status mapping
  const sellWindowStatus = a.sell_window_status_raw as string;
  const sellWindowConfig = getSellWindowConfig(sellWindowStatus);

  return (
    <div className="max-w-3xl">
      <div className="mb-4 sm:hidden">
        <Link href="/dashboard/tools/grid-iq">
          <Button variant="ghost" size="sm" className="gap-1.5 text-text-muted hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            Grid IQ
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`${a.herd_name} vs ${a.processor_name}`}
        titleClassName="text-2xl font-bold text-teal-400"
        subtitle={`${new Date(a.analysis_date as string).toLocaleDateString("en-AU")} - ${isPostSale ? "Post-Sale Audit" : "Pre-Sale Planning"}`}
        subtitleClassName="text-sm text-text-secondary"
        compact
      />

      {/* Value Comparison */}
      <div className="mt-4">
        <AnalysisComparison
          mlaMarketValue={a.mla_market_value as number}
          headlineGridValue={a.headline_grid_value as number}
          realisticGridOutcome={a.realistic_grid_outcome as number}
          realisationFactor={a.realisation_factor as number}
          freightToSaleyard={a.freight_to_saleyard as number}
          freightToProcessor={a.freight_to_processor as number}
          netSaleyardValue={a.net_saleyard_value as number}
          netProcessorValue={a.net_processor_value as number}
          gridIQAdvantage={advantage}
          headCount={a.head_count as number}
        />
      </div>

      {/* Herd Details Row */}
      <div className="mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Head</p>
                <p className="mt-0.5 text-sm font-bold text-text-primary">{a.head_count as number}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Carcase Wt</p>
                <p className="mt-0.5 text-sm font-bold text-text-primary">
                  {(a.estimated_carcase_weight as number).toFixed(0)}kg
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Dressing</p>
                <p className="mt-0.5 text-sm font-bold text-text-primary">
                  {((a.dressing_percentage as number) * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Data</p>
                <p className="mt-0.5 text-sm font-bold text-text-primary">
                  {(a.is_using_personalised_data as boolean) ? "Personal" : "Baseline"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sell Window */}
      <div className="mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${sellWindowConfig.bg}`}>
                <sellWindowConfig.icon className={`h-5 w-5 ${sellWindowConfig.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${sellWindowConfig.color}`}>
                    {sellWindowConfig.label}
                  </p>
                  {(a.days_to_target as number | null) !== null && (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="h-3 w-3" />
                      {a.days_to_target as number} days
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {a.sell_window_detail as string}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processor Fit */}
      {(a.processor_fit_score as number | null) !== null && (
        <div className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15">
                    <Target className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Processor Fit</p>
                    <p className="text-xs text-text-muted">
                      {a.processor_fit_label_raw as string}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-teal-400">
                  {(a.processor_fit_score as number).toFixed(0)}/100
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Opportunity Insight */}
      {(a.opportunity_value as number | null) !== null && (
        <div className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                  <Zap className="h-5 w-5 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary">Opportunity</p>
                    <span className="text-sm font-bold text-amber-400">
                      ${Math.round(a.opportunity_value as number).toLocaleString()}
                    </span>
                  </div>
                  {(a.opportunity_driver as string | null) && (
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {a.opportunity_driver as string}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kill Score / Post-Sale Scorecard */}
      {isPostSale && (a.kill_score as number | null) !== null && (
        <div className="mt-4">
          <KillScoreCard
            killScore={a.kill_score as number}
            gcr={a.gcr as number | null}
            gridRisk={a.grid_risk as number | null}
            gridCompliance={a.grid_compliance_score as number | null}
            fatCompliance={a.fat_compliance_score as number | null}
            dentitionCompliance={a.dentition_compliance_score as number | null}
            realisationFactor={a.realisation_factor as number}
          />
        </div>
      )}

      {/* Brangus Commentary */}
      {(a.brangus_commentary as Record<string, unknown> | null) !== null && (
        <div className="mt-4">
          <BrangusCommentarySection commentary={a.brangus_commentary as { bullets?: string[]; narrative?: string }} />
        </div>
      )}

      {/* Saved Confirmation */}
      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-teal-500/10 py-3 text-sm font-medium text-teal-400">
        <Check className="h-4 w-4" />
        Analysis saved
      </div>

      <div className="mt-3 flex justify-center">
        <Link href="/dashboard/tools/grid-iq">
          <Button variant="teal" size="md">
            Done
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Debug: Brangus commentary display
function BrangusCommentarySection({
  commentary,
}: {
  commentary: { bullets?: string[]; narrative?: string };
}) {
  if (!commentary.bullets?.length && !commentary.narrative) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(77,51,31)]/30">
            <span className="text-sm">🐂</span>
          </div>
          <p className="text-sm font-semibold text-text-primary">Brangus Analysis</p>
        </div>

        {commentary.bullets && commentary.bullets.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {commentary.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                <span className="mt-0.5 text-teal-400">-</span>
                {bullet}
              </li>
            ))}
          </ul>
        )}

        {commentary.narrative && (
          <div className="mt-4 border-t border-white/5 pt-4">
            <p className="whitespace-pre-line text-xs leading-relaxed text-text-secondary">
              {commentary.narrative}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Debug: Sell window status configuration
function getSellWindowConfig(status: string) {
  switch (status) {
    case "ON_TARGET":
      return {
        label: "On Target",
        color: "text-emerald-400",
        bg: "bg-emerald-500/15",
        icon: CheckCircle,
      };
    case "EARLY":
      return {
        label: "Early",
        color: "text-teal-400",
        bg: "bg-teal-500/15",
        icon: TrendingUp,
      };
    case "RISK_OF_OVERWEIGHT":
      return {
        label: "Risk of Overweight",
        color: "text-amber-400",
        bg: "bg-amber-500/15",
        icon: AlertTriangle,
      };
    default:
      return {
        label: status,
        color: "text-text-muted",
        bg: "bg-white/[0.06]",
        icon: Clock,
      };
  }
}
