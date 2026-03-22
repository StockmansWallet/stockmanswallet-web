// Brangus AI commentary generation for Grid IQ analyses.
// Port of iOS GridIQExtractionService+Commentary.swift.
// Calls Claude Haiku via claude-proxy Edge Function to interpret analysis results.

import { createClient } from "@/lib/supabase/server";
import type { GridIQAnalysisResult, AnalysisMode } from "@/lib/engines/grid-iq-engine";
import { computeProducerProfile } from "./producer-profile";

interface CommentaryParams {
  analysisId: string;
  herdName: string;
  herdCategory: string;
  processorName: string;
  analysisMode: AnalysisMode;
  result: GridIQAnalysisResult;
}

interface BrangusCommentary {
  bullets: string[];
  narrative: string;
}

const CLAUDE_MODEL = "claude-sonnet-4-6";

const COMMENTARY_SYSTEM_PROMPT = `You are Brangus, the AI analysis companion in Stockman's Wallet - an Australian \
livestock management app. Write commentary interpreting a Grid IQ analysis for a \
beef producer.

Return ONLY valid JSON with this exact structure:
{
    "bullets": [
        "5-8 concise insight bullet points, each 1-2 sentences"
    ],
    "narrative": "3-4 paragraphs of deeper analysis and advice"
}

RULES:
- Tone: Knowledgeable rural advisor, practical, plain-speaking Australian English
- Use AUD currency ($), metric units (kg, km)
- Reference the producer's specific numbers (herd name, head count, dollar values)
- Never use "mob" - always "herd"
- Never use em-dashes. Use hyphens, commas, or full stops instead.
- Bullets should cover: bottom line recommendation, key value drivers, freight impact, \
sell window timing, and confidence note (personalised vs industry baseline)
- Narrative should provide deeper context: why the numbers look the way they do, \
what the producer should consider doing, and how accuracy can be improved
- Be direct and helpful - no padding or generic disclaimers

ANALYSIS MODE:
- If analysisMode is "pre_sale": Focus on decision support. Compare saleyard vs processor. \
Discuss optimal timing, weight management, and which channel looks better right now.
- If analysisMode is "post_sale": Focus on audit/review. Interpret Kill Score, GCR, \
Grid Risk, and compliance metrics. What went well? Where is there room for improvement? \
Compare against the producer's historical averages if provided.

POST-SALE METRICS (when available):
- Kill Score (0-100): Composite performance score. 85+ = Excellent, 70+ = Good, 50+ = Fair
- GCR (Grid Capture Ratio, 0-100): Actual revenue vs max possible grid revenue. Higher = better.
- Grid Risk (0-100): Revenue left on the table (100 - GCR). Lower = better.
- Grid Compliance: % of animals achieving a grid-listed grade
- Fat Compliance: % of animals with P8 fat within grid's acceptable range
- Dentition Compliance: % of animals within grid's dentition range

PRODUCER PROFILE (when available):
- If historicalAverageRF is provided, compare current RF to the producer's average
- If historicalAverageGCR is provided, note whether this kill improved or declined
- Reference the confidence tier (baseline/provisional/personalised/expert) to frame accuracy
- If confidence is "baseline", mention that uploading kill sheets would improve predictions`;

/**
 * Generate Brangus commentary from a completed Grid IQ analysis.
 * Runs asynchronously after the analysis is saved.
 * Updates the brangus_commentary field on grid_iq_analyses.
 */
export async function generateBrangusCommentary(params: CommentaryParams): Promise<void> {
  const { analysisId, herdName, herdCategory, processorName, result } = params;

  // Fetch producer profile for historical context
  const supabaseForProfile = await createClient();
  const { data: { user } } = await supabaseForProfile.auth.getUser();
  let profileData: Record<string, unknown> | null = null;
  if (user) {
    try {
      const profile = await computeProducerProfile(user.id);
      profileData = {
        confidenceTier: profile.confidenceTier,
        killSheetCount: profile.killSheetCount,
        totalHeadProcessed: profile.totalHeadProcessed,
      };
      if (profile.averageRF != null) profileData.historicalAverageRF = profile.averageRF;
      if (profile.averageGCR != null) profileData.historicalAverageGCR = profile.averageGCR;
      if (profile.averageKillScore != null) profileData.historicalAverageKillScore = profile.averageKillScore;
      if (profile.topGrades.length > 0) {
        profileData.historicalTopGrades = profile.topGrades.slice(0, 3).map(
          (g) => `${g.gradeCode} (${Math.round(g.percentage)}%)`
        );
      }
    } catch (e) {
      console.warn("Brangus commentary: Could not compute producer profile:", e);
    }
  }

  // Build analysis data for the AI prompt
  const analysisData = buildAnalysisJSON(herdName, herdCategory, processorName, result, profileData);

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.error("Brangus commentary: No session for commentary generation");
    return;
  }

  // Call Claude via claude-proxy
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: COMMENTARY_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Interpret this Grid IQ analysis and provide your commentary.\n\n${analysisData}`,
      },
    ],
    purpose: "grid-iq-text",
  };

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/claude-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      console.error("Brangus commentary: Claude proxy returned", res.status);
      return;
    }

    const data = await res.json();
    const responseText = data.content?.[0]?.text;
    if (!responseText) {
      console.error("Brangus commentary: No text in response");
      return;
    }

    // Parse JSON from response (may be wrapped in markdown fences)
    const cleaned = responseText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      console.error("Brangus commentary: No JSON found in response");
      return;
    }

    const commentary: BrangusCommentary = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));

    // Sanitise: strip em-dashes, replace "mob" with "herd"
    commentary.bullets = commentary.bullets.map(sanitise);
    commentary.narrative = sanitise(commentary.narrative);

    // Update the analysis record
    await supabase
      .from("grid_iq_analyses")
      .update({ brangus_commentary: commentary })
      .eq("id", analysisId);

    console.log(`Brangus commentary: Generated ${commentary.bullets.length} bullets for analysis ${analysisId}`);
  } catch (e) {
    console.error("Brangus commentary: Generation failed:", e);
  }
}

function buildAnalysisJSON(
  herdName: string,
  herdCategory: string,
  processorName: string,
  r: GridIQAnalysisResult,
  profileData?: Record<string, unknown> | null,
): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {
    herdName,
    herdCategory,
    processorName,
    headCount: r.headCount,
    analysisMode: r.analysisMode,
    gridIQAdvantage: r.gridIQAdvantage,
    netSaleyardValue: r.netSaleyardValue,
    netProcessorValue: r.netProcessorValue,
    mlaMarketValue: r.mlaMarketValue,
    headlineGridValue: r.headlineGridValue,
    realisationFactor: r.realisationFactor,
    realisticGridOutcome: r.realisticGridOutcome,
    freightToSaleyard: r.freightToSaleyard,
    freightToProcessor: r.freightToProcessor,
    estimatedCarcaseWeight: r.estimatedCarcaseWeight,
    dressingPercentage: r.dressingPercentage,
    sellWindowStatus: r.sellWindowStatus,
    sellWindowDetail: r.sellWindowDetail,
    isUsingPersonalisedData: r.isUsingPersonalisedData,
  };

  if (r.daysToTarget !== null) data.daysToTarget = r.daysToTarget;
  if (r.opportunityValue !== null) {
    data.opportunityValue = r.opportunityValue;
    data.opportunityDriver = r.opportunityDriver ?? "";
    data.opportunityDetail = r.opportunityDetail ?? "";
  }
  if (r.processorFitScore !== null) {
    data.processorFitScore = r.processorFitScore;
    data.processorFitLabel = r.processorFitLabel ?? "";
  }

  // Post-sale scorecard metrics
  if (r.gcr !== null) data.gcr = r.gcr;
  if (r.gridRisk !== null) data.gridRisk = r.gridRisk;
  if (r.killScore !== null) data.killScore = r.killScore;
  if (r.gridComplianceScore !== null) data.gridComplianceScore = r.gridComplianceScore;
  if (r.fatComplianceScore !== null) data.fatComplianceScore = r.fatComplianceScore;
  if (r.dentitionComplianceScore !== null) data.dentitionComplianceScore = r.dentitionComplianceScore;

  // Include producer profile context for historical comparison
  if (profileData) {
    Object.assign(data, profileData);
  }

  return JSON.stringify(data);
}

// Sanitise Brangus output: strip em-dashes, replace "mob" with "herd"
function sanitise(text: string): string {
  return text
    .replace(/\u2014/g, " - ") // em-dash
    .replace(/\u2013/g, " - ") // en-dash
    .replace(/\bmobs?\b/gi, (match) => (match[0] === "M" ? "Herd" : "herd"));
}
