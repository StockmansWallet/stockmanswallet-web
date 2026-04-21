// Grid IQ analysis detail page - full view of a single analysis
// Shows value comparison, scorecard metrics, sell window, and opportunity insights

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KillScoreCard } from "@/components/grid-iq/kill-score-card";
import { PaymentCheckCard } from "@/components/grid-iq/payment-check-card";
import { AnalysisComparison } from "@/components/grid-iq/analysis-comparison";
import { CategoryBreakdown } from "@/components/grid-iq/category-breakdown";
import { PredictionAccuracy } from "@/components/grid-iq/prediction-accuracy";
import type { PaymentCheckResult } from "@/lib/engines/grid-iq-payment-check";
import type { GridIQAnalysisRow } from "@/lib/types/grid-iq";
import {
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Zap,
  Truck,
} from "lucide-react";
import { EditableProcessorName } from "../../components/editable-processor-name";
import { AnalysisDeleteButton } from "./analysis-delete-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Sibling-row projection used for pre/post prediction-accuracy comparisons.
type SiblingAnalysis = Pick<
  GridIQAnalysisRow,
  "id" | "analysis_mode" | "analysis_date" | "net_saleyard_value" | "net_processor_value" | "grid_iq_advantage"
>;

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
    .single<GridIQAnalysisRow>();

  if (!analysis) notFound();

  // Fetch payment check result from kill sheet (if linked)
  let paymentCheck: PaymentCheckResult | null = null;
  if (analysis.kill_sheet_record_id) {
    const { data: ksRecord } = await supabase
      .from("kill_sheet_records")
      .select("payment_check_result")
      .eq("id", analysis.kill_sheet_record_id)
      .single<{ payment_check_result: PaymentCheckResult | null }>();
    if (ksRecord?.payment_check_result) {
      paymentCheck = ksRecord.payment_check_result;
    }
  }

  // Fetch sibling analysis for prediction accuracy (post-sale vs pre-sale)
  let siblingAnalysis: SiblingAnalysis | null = null;
  if (analysis.consignment_id) {
    const siblingMode = analysis.analysis_mode === "post_sale" ? "pre_sale" : "post_sale";
    const { data: sibling } = await supabase
      .from("grid_iq_analyses")
      .select("id, analysis_mode, analysis_date, net_saleyard_value, net_processor_value, grid_iq_advantage")
      .eq("consignment_id", analysis.consignment_id)
      .eq("analysis_mode", siblingMode)
      .eq("is_deleted", false)
      .limit(1)
      .single<SiblingAnalysis>();
    if (sibling) siblingAnalysis = sibling;
  }

  const isPostSale = analysis.analysis_mode === "post_sale";
  const advantage = analysis.grid_iq_advantage ?? 0;
  const categoryResults = analysis.category_results ?? [];
  const consignmentId = analysis.consignment_id;

  const sellWindowConfig = getSellWindowConfig(analysis.sell_window_status_raw);

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-x-2">
          <EditableProcessorName
            recordId={id}
            table="grid_iq_analyses"
            column="herd_name"
            initialName={analysis.herd_name || "Untitled"}
          />
          <span className="text-2xl font-bold text-text-muted">vs</span>
          <EditableProcessorName
            recordId={id}
            table="grid_iq_analyses"
            column="processor_name"
            initialName={analysis.processor_name || "Unknown"}
          />
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {new Date(analysis.analysis_date).toLocaleDateString("en-AU")} - {isPostSale ? "Post-Sale Audit" : "Pre-Sale Planning"}
        </p>
      </div>

      {/* Value Comparison */}
      <div className="mt-4">
        <AnalysisComparison
          mlaMarketValue={analysis.mla_market_value}
          headlineGridValue={analysis.headline_grid_value}
          realisticGridOutcome={analysis.realistic_grid_outcome}
          realisationFactor={analysis.realisation_factor}
          freightToSaleyard={analysis.freight_to_saleyard}
          freightToProcessor={analysis.freight_to_processor}
          netSaleyardValue={analysis.net_saleyard_value}
          netProcessorValue={analysis.net_processor_value}
          gridIQAdvantage={advantage}
          headCount={analysis.head_count}
          carcaseWeight={analysis.estimated_carcase_weight}
          dressingPercentage={analysis.dressing_percentage}
          isUsingPersonalisedData={analysis.is_using_personalised_data}
        />
      </div>

      {/* Per-Category Breakdown (multi-herd consignments) */}
      {categoryResults.length > 1 && (
        <div className="mt-4">
          <CategoryBreakdown
            categoryResults={categoryResults}
            totalHead={analysis.head_count}
            totalNetSaleyard={analysis.net_saleyard_value}
            totalNetProcessor={analysis.net_processor_value}
            totalAdvantage={advantage}
          />
        </div>
      )}

      {/* Prediction Accuracy (post-sale with pre-sale sibling) */}
      {isPostSale && siblingAnalysis && (
        <div className="mt-4">
          <PredictionAccuracy
            preSaleNetProcessor={siblingAnalysis.net_processor_value}
            preSaleNetSaleyard={siblingAnalysis.net_saleyard_value}
            preSaleAdvantage={siblingAnalysis.grid_iq_advantage}
            actualNetProcessor={analysis.net_processor_value}
            actualNetSaleyard={analysis.net_saleyard_value}
            actualAdvantage={advantage}
            preSaleDate={siblingAnalysis.analysis_date}
            postSaleDate={analysis.analysis_date}
          />
        </div>
      )}

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
                  {analysis.days_to_target !== null && (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="h-3 w-3" />
                      {analysis.days_to_target} days
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {analysis.sell_window_detail}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processor Fit */}
      {analysis.processor_fit_score !== null && (
        <div className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-grid-iq/15">
                    <Target className="h-5 w-5 text-grid-iq" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Processor Fit</p>
                    <p className="text-xs text-text-muted">
                      {analysis.processor_fit_label_raw}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-grid-iq">
                  {analysis.processor_fit_score.toFixed(0)}/100
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Opportunity Insight */}
      {analysis.opportunity_value !== null && (
        <div className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15">
                  <Zap className="h-5 w-5 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary">Opportunity</p>
                    <span className="text-sm font-bold text-warning">
                      ${Math.round(analysis.opportunity_value).toLocaleString()}
                    </span>
                  </div>
                  {analysis.opportunity_driver && (
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {analysis.opportunity_driver}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kill Score / Post-Sale Scorecard */}
      {isPostSale && analysis.kill_score !== null && (
        <div className="mt-4">
          <KillScoreCard
            killScore={analysis.kill_score}
            gcr={analysis.gcr}
            gridRisk={analysis.grid_risk}
            gridCompliance={analysis.grid_compliance_score}
            fatCompliance={analysis.fat_compliance_score}
            dentitionCompliance={analysis.dentition_compliance_score}
            realisationFactor={analysis.realisation_factor}
          />
        </div>
      )}

      {/* Payment Check */}
      {isPostSale && paymentCheck && (
        <div className="mt-4">
          <PaymentCheckCard result={paymentCheck} />
        </div>
      )}

      {/* Brangus Commentary */}
      {analysis.brangus_commentary && (
        <div className="mt-4">
          <BrangusCommentarySection commentary={analysis.brangus_commentary} />
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        <AnalysisDeleteButton analysisId={id} />
        <div className="flex items-center gap-2">
          {consignmentId && (
            <Link href={`/dashboard/tools/grid-iq/consignments/${consignmentId}`}>
              <Button
                variant={!isPostSale && !siblingAnalysis ? "indigo" : "ghost"}
                size="sm"
                className={
                  !isPostSale && !siblingAnalysis
                    ? undefined
                    : "border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
                }
              >
                <Truck className="mr-1.5 h-3.5 w-3.5" />
                View Consignment
              </Button>
            </Link>
          )}
          <Link href="/dashboard/tools/grid-iq/library?tab=analyses">
            <Button
              variant="ghost"
              size="sm"
              className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
            >
              Done
            </Button>
          </Link>
        </div>
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
                <span className="mt-0.5 text-grid-iq">-</span>
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
        color: "text-success",
        bg: "bg-success/15",
        icon: CheckCircle,
      };
    case "EARLY":
      return {
        label: "Early",
        color: "text-grid-iq",
        bg: "bg-grid-iq/15",
        icon: TrendingUp,
      };
    case "RISK_OF_OVERWEIGHT":
      return {
        label: "Risk of Overweight",
        color: "text-warning",
        bg: "bg-warning/15",
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
