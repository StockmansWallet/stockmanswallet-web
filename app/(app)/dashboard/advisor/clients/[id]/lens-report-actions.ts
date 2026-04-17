"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  calculateHerdValuation,
  categoryFallback,
  type CategoryPriceEntry,
} from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import {
  cattleBreedPremiums,
  resolveMLASaleyardName,
} from "@/lib/data/reference-data";
import { expandWithNearbySaleyards } from "@/lib/data/saleyard-proximity";
import { applyShadingTo } from "@/lib/types/advisor-lens";
import type {
  LensHerdSummary,
  RegionalDataSnapshot,
  AdvisorLensReportData,
} from "@/lib/types/lens-report";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid();

const herdOverridesSchema = z.object({
  shading_percentage: z.number().min(0).max(100).default(100),
  breed_premium_override: z.number().nullable().default(null),
  adwg_override: z.number().nullable().default(null),
  calving_rate_override: z.number().nullable().default(null),
  mortality_rate_override: z.number().nullable().default(null),
  head_count_adjustment: z.number().int().nullable().default(null),
  advisor_notes: z.string().max(5000).nullable().default(null),
});

type HerdOverrides = z.infer<typeof herdOverridesSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyAdvisorConnection(connectionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, supabase: null!, user: null! };

  const { data: conn } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id, status, permission_granted_at")
    .eq("id", connectionId)
    .single();

  if (!conn) return { error: "Connection not found" as const, supabase: null!, user: null! };
  if (conn.status !== "approved" || !conn.permission_granted_at)
    return { error: "Connection not approved" as const, supabase: null!, user: null! };

  const isInvolved =
    conn.requester_user_id === user.id || conn.target_user_id === user.id;
  if (!isInvolved) return { error: "Not authorised" as const, supabase: null!, user: null! };

  const clientUserId =
    conn.requester_user_id === user.id
      ? conn.target_user_id
      : conn.requester_user_id;

  return { error: null, supabase, user, clientUserId, connectionId };
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key);
}

// ---------------------------------------------------------------------------
// 1. Create a new lens report (draft)
// ---------------------------------------------------------------------------

export async function createLensReport(connectionId: string, name: string) {
  const parsed = uuidSchema.safeParse(connectionId);
  if (!parsed.success) return { error: "Invalid connection ID" };
  if (!name.trim()) return { error: "Name is required" };

  const ctx = await verifyAdvisorConnection(connectionId);
  if (ctx.error) return { error: ctx.error };

  const id = crypto.randomUUID();
  const { error } = await ctx.supabase.from("lens_reports").insert({
    id,
    client_connection_id: connectionId,
    name: name.trim(),
    status: "draft",
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  return { success: true, id };
}

// ---------------------------------------------------------------------------
// 2. Add a herd to a lens report (creates a new advisor_lenses row)
// ---------------------------------------------------------------------------

export async function addHerdToLensReport(
  lensReportId: string,
  connectionId: string,
  herdId: string,
  overrides: HerdOverrides
) {
  const ids = z
    .object({ lensReportId: uuidSchema, connectionId: uuidSchema, herdId: uuidSchema })
    .safeParse({ lensReportId, connectionId, herdId });
  if (!ids.success) return { error: "Invalid IDs" };

  const data = herdOverridesSchema.safeParse(overrides);
  if (!data.success) return { error: "Invalid overrides" };

  const ctx = await verifyAdvisorConnection(connectionId);
  if (ctx.error) return { error: ctx.error };

  // Check the lens report exists and belongs to this connection
  const { data: report } = await ctx.supabase
    .from("lens_reports")
    .select("id, status")
    .eq("id", lensReportId)
    .eq("client_connection_id", connectionId)
    .eq("is_deleted", false)
    .single();

  if (!report) return { error: "Lens report not found" };
  if (report.status !== "draft") return { error: "Report is no longer editable" };

  // Check herd is not already in this report
  const { data: existing } = await ctx.supabase
    .from("advisor_lenses")
    .select("id")
    .eq("lens_report_id", lensReportId)
    .eq("herd_id", herdId)
    .eq("is_deleted", false)
    .maybeSingle();

  const now = new Date().toISOString();
  const overrideData = data.data;

  if (existing) {
    // Update existing row
    const { error } = await ctx.supabase
      .from("advisor_lenses")
      .update({
        ...overrideData,
        updated_at: now,
        last_calculated_date: now,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    // Create new row specifically for this report
    const { error } = await ctx.supabase.from("advisor_lenses").insert({
      id: crypto.randomUUID(),
      client_connection_id: connectionId,
      herd_id: herdId,
      lens_report_id: lensReportId,
      is_active: true,
      ...overrideData,
      updated_at: now,
      last_calculated_date: now,
    });

    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// 3. Update a herd within a lens report
// ---------------------------------------------------------------------------

export async function updateHerdInLensReport(
  lensReportId: string,
  connectionId: string,
  herdId: string,
  overrides: HerdOverrides
) {
  return addHerdToLensReport(lensReportId, connectionId, herdId, overrides);
}

// ---------------------------------------------------------------------------
// 4. Remove a herd from a lens report
// ---------------------------------------------------------------------------

export async function removeHerdFromLensReport(
  lensReportId: string,
  connectionId: string,
  herdId: string
) {
  const ids = z
    .object({ lensReportId: uuidSchema, connectionId: uuidSchema, herdId: uuidSchema })
    .safeParse({ lensReportId, connectionId, herdId });
  if (!ids.success) return { error: "Invalid IDs" };

  const ctx = await verifyAdvisorConnection(connectionId);
  if (ctx.error) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("advisor_lenses")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("lens_report_id", lensReportId)
    .eq("herd_id", herdId)
    .eq("is_deleted", false);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. Fetch regional price data for a herd
// ---------------------------------------------------------------------------

export async function fetchRegionalData(
  connectionId: string,
  herdId: string
): Promise<{ error?: string; data?: RegionalDataSnapshot }> {
  const ids = z
    .object({ connectionId: uuidSchema, herdId: uuidSchema })
    .safeParse({ connectionId, herdId });
  if (!ids.success) return { error: "Invalid IDs" };

  const ctx = await verifyAdvisorConnection(connectionId);
  if (ctx.error) return { error: ctx.error };

  const serviceClient = getServiceClient();

  // Load the herd
  const { data: herd } = await serviceClient
    .from("herds")
    .select("*")
    .eq("id", herdId)
    .eq("user_id", ctx.clientUserId)
    .eq("is_deleted", false)
    .single();

  if (!herd) return { error: "Herd not found" };

  // Resolve MLA category
  const resolution = resolveMLACategory(
    herd.category as string,
    herd.initial_weight as number,
    (herd.breeder_sub_type as string) ?? undefined
  );
  const primaryCat = resolution.primaryMLACategory;
  const fallbackCat = categoryFallback(primaryCat);
  const mlaCategories = [primaryCat, ...(fallbackCat ? [fallbackCat] : [])];

  // Resolve saleyards
  const herdSaleyard = herd.selected_saleyard
    ? resolveMLASaleyardName(herd.selected_saleyard as string)
    : null;
  const saleyards = herdSaleyard
    ? expandWithNearbySaleyards([herdSaleyard])
    : ["National"];

  // Fetch prices via RPC
  type PriceRow = {
    category: string;
    price_per_kg: number;
    weight_range: string | null;
    saleyard: string;
    breed: string | null;
    data_date: string;
  };
  const { data: rpcPrices } = (await ctx.supabase.rpc("latest_saleyard_prices", {
    p_saleyards: [...saleyards, "National"],
    p_categories: mlaCategories,
  })) as unknown as { data: PriceRow[] | null };

  const prices = rpcPrices ?? [];

  const saleyardPrices = prices
    .filter((p) => p.saleyard !== "National" && p.breed === null)
    .map((p) => ({
      category: p.category,
      saleyard: p.saleyard,
      price_per_kg: p.price_per_kg / 100,
      weight_range: p.weight_range,
      data_date: p.data_date,
    }));

  const nationalPrices = prices
    .filter((p) => p.saleyard === "National" && p.breed === null)
    .map((p) => ({
      category: p.category,
      price_per_kg: p.price_per_kg / 100,
      weight_range: p.weight_range,
      data_date: p.data_date,
    }));

  return {
    data: {
      saleyard_prices: saleyardPrices,
      national_prices: nationalPrices,
      fetched_at: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// 6. Save a lens report (recalculate all valuations, set status to saved)
// ---------------------------------------------------------------------------

export async function saveLensReport(
  connectionId: string,
  lensReportId: string
) {
  const ids = z
    .object({ connectionId: uuidSchema, lensReportId: uuidSchema })
    .safeParse({ connectionId, lensReportId });
  if (!ids.success) return { error: "Invalid IDs" };

  const ctx = await verifyAdvisorConnection(connectionId);
  if (ctx.error) return { error: ctx.error };

  // Load lens report
  const { data: report } = await ctx.supabase
    .from("lens_reports")
    .select("*")
    .eq("id", lensReportId)
    .eq("client_connection_id", connectionId)
    .eq("is_deleted", false)
    .single();

  if (!report) return { error: "Lens report not found" };

  // Load all herd lenses for this report
  const { data: lensRows } = await ctx.supabase
    .from("advisor_lenses")
    .select("*")
    .eq("lens_report_id", lensReportId)
    .eq("is_deleted", false);

  if (!lensRows || lensRows.length === 0)
    return { error: "No herds in this report" };

  const serviceClient = getServiceClient();
  const herdIds = lensRows.map((l) => l.herd_id).filter(Boolean) as string[];

  // Load herds (scoped to this client's user_id to prevent cross-client leaks).
  const { data: herds } = await serviceClient
    .from("herds")
    .select("*")
    .in("id", herdIds)
    .eq("user_id", ctx.clientUserId)
    .eq("is_deleted", false);

  if (!herds || herds.length === 0) return { error: "Herds not found" };

  // Build price maps (same pattern as client detail page)
  const herdSaleyards = [
    ...new Set(
      herds
        .map((h) =>
          h.selected_saleyard
            ? resolveMLASaleyardName(h.selected_saleyard as string)
            : null
        )
        .filter(Boolean)
    ),
  ] as string[];
  const saleyards = expandWithNearbySaleyards(herdSaleyards);
  const primaryCategories = [
    ...new Set(
      herds.map(
        (h) =>
          resolveMLACategory(
            h.category as string,
            h.initial_weight as number,
            (h.breeder_sub_type as string) ?? undefined
          ).primaryMLACategory
      )
    ),
  ];
  const mlaCategories = [
    ...new Set([
      ...primaryCategories,
      ...primaryCategories
        .map((c) => categoryFallback(c))
        .filter((c): c is string => c !== null),
    ]),
  ];

  type PriceRow = {
    category: string;
    price_per_kg: number;
    weight_range: string | null;
    saleyard: string;
    breed: string | null;
    data_date: string;
  };
  const { data: rpcPrices } =
    mlaCategories.length > 0
      ? ((await ctx.supabase.rpc("latest_saleyard_prices", {
          p_saleyards: [...saleyards, "National"],
          p_categories: mlaCategories,
        })) as unknown as { data: PriceRow[] | null })
      : { data: [] as PriceRow[] };

  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();

  for (const p of rpcPrices ?? []) {
    const priceEntry = {
      price_per_kg: p.price_per_kg / 100,
      weight_range: p.weight_range,
      data_date: p.data_date,
    };
    if (p.saleyard === "National" && p.breed === null) {
      const entries = nationalPriceMap.get(p.category) ?? [];
      entries.push(priceEntry);
      nationalPriceMap.set(p.category, entries);
    } else if (p.saleyard !== "National") {
      if (p.breed === null) {
        const key = `${p.category}|${p.saleyard}`;
        const entries = saleyardPriceMap.get(key) ?? [];
        entries.push(priceEntry);
        saleyardPriceMap.set(key, entries);
      } else {
        const key = `${p.category}|${p.breed}|${p.saleyard}`;
        const entries = saleyardBreedPriceMap.get(key) ?? [];
        entries.push(priceEntry);
        saleyardBreedPriceMap.set(key, entries);
      }
    }
  }

  // Build breed premium map
  const { data: breedPremiumData } = await ctx.supabase
    .from("breed_premiums")
    .select("breed, premium_percent:premium_pct");
  const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
  for (const b of breedPremiumData ?? []) {
    premiumMap.set(b.breed, b.premium_percent);
  }

  // Calculate valuations for each herd with lens overrides
  let totalBaseline = 0;
  let totalAdjusted = 0;
  let totalShaded = 0;
  let totalHead = 0;
  let totalOriginalHead = 0;

  const herdSummaries: LensHerdSummary[] = [];

  for (const lens of lensRows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const herd = herds.find((h) => h.id === lens.herd_id) as any;
    if (!herd) continue;

    const originalHeadCount = herd.head_count as number;

    // Apply overrides to herd data for valuation
    const adjustedHerd = { ...herd };
    if (lens.breed_premium_override != null)
      adjustedHerd.breed_premium_override = lens.breed_premium_override;
    if (lens.adwg_override != null)
      adjustedHerd.daily_weight_gain = lens.adwg_override;
    if (lens.calving_rate_override != null)
      adjustedHerd.calving_rate = lens.calving_rate_override;
    if (lens.mortality_rate_override != null)
      adjustedHerd.mortality_rate = lens.mortality_rate_override;
    if (lens.head_count_adjustment != null)
      adjustedHerd.head_count = Math.max(
        0,
        originalHeadCount + lens.head_count_adjustment
      );

    // Baseline (original herd, no overrides)
    const baselineResult = calculateHerdValuation(
      herd as Parameters<typeof calculateHerdValuation>[0],
      nationalPriceMap,
      premiumMap,
      undefined,
      saleyardPriceMap,
      saleyardBreedPriceMap
    );

    // Adjusted (with overrides)
    const adjustedResult = calculateHerdValuation(
      adjustedHerd as Parameters<typeof calculateHerdValuation>[0],
      nationalPriceMap,
      premiumMap,
      undefined,
      saleyardPriceMap,
      saleyardBreedPriceMap
    );

    const shadedValue = applyShadingTo(
      adjustedResult.netValue,
      lens.shading_percentage ?? 100
    );

    totalBaseline += baselineResult.netValue;
    totalAdjusted += adjustedResult.netValue;
    totalShaded += shadedValue;
    totalHead += adjustedHerd.head_count as number;
    totalOriginalHead += originalHeadCount;

    // Update cached values on the lens row
    await ctx.supabase
      .from("advisor_lenses")
      .update({
        cached_baseline_value: baselineResult.netValue,
        cached_advisor_value: adjustedResult.netValue,
        cached_shaded_value: shadedValue,
        last_calculated_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", lens.id);

    herdSummaries.push({
      herd_id: herd.id as string,
      herd_name: (herd.name as string) ?? "Unnamed Herd",
      category: herd.category as string,
      breed: herd.breed as string,
      species: herd.species as string,
      head_count: adjustedHerd.head_count as number,
      original_head_count: originalHeadCount,
      initial_weight: herd.initial_weight as number,
      projected_weight: adjustedResult.projectedWeight,
      baseline_value: baselineResult.netValue,
      adjusted_value: adjustedResult.netValue,
      shaded_value: shadedValue,
      shading_percentage: lens.shading_percentage ?? 100,
      overrides: {
        breed_premium_override: lens.breed_premium_override,
        adwg_override: lens.adwg_override,
        calving_rate_override: lens.calving_rate_override,
        mortality_rate_override: lens.mortality_rate_override,
        head_count_adjustment: lens.head_count_adjustment,
      },
      advisor_notes: lens.advisor_notes,
      regional_data: null,
      price_per_kg: adjustedResult.pricePerKg,
      price_source: adjustedResult.priceSource,
      breed_premium_applied: adjustedResult.breedPremiumApplied,
    });
  }

  // Update the lens report with totals
  const { error: updateError } = await ctx.supabase
    .from("lens_reports")
    .update({
      status: "saved",
      total_baseline_value: totalBaseline,
      total_adjusted_value: totalAdjusted,
      total_shaded_value: totalShaded,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lensReportId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  revalidatePath(
    `/dashboard/advisor/clients/${connectionId}/lens/${lensReportId}`
  );

  return {
    success: true,
    redirectUrl: `/dashboard/advisor/clients/${connectionId}/lens/${lensReportId}`,
    totals: {
      baseline: totalBaseline,
      adjusted: totalAdjusted,
      shaded: totalShaded,
      head: totalHead,
    },
  };
}

// ---------------------------------------------------------------------------
// 7. Generate AI report narrative
// ---------------------------------------------------------------------------

export async function generateLensReport(
  connectionId: string,
  lensReportId: string
) {
  const ids = z
    .object({ connectionId: uuidSchema, lensReportId: uuidSchema })
    .safeParse({ connectionId, lensReportId });
  if (!ids.success) return { error: "Invalid IDs" };

  const ctx = await verifyAdvisorConnection(connectionId);
  if (ctx.error) return { error: ctx.error };

  // Load report
  const { data: report } = await ctx.supabase
    .from("lens_reports")
    .select("*")
    .eq("id", lensReportId)
    .eq("client_connection_id", connectionId)
    .eq("is_deleted", false)
    .single();

  if (!report) return { error: "Lens report not found" };
  if (report.status === "draft") return { error: "Report must be saved first" };

  // Load herd lenses
  const { data: lensRows } = await ctx.supabase
    .from("advisor_lenses")
    .select("*")
    .eq("lens_report_id", lensReportId)
    .eq("is_deleted", false);

  if (!lensRows || lensRows.length === 0)
    return { error: "No herds in this report" };

  const serviceClient = getServiceClient();
  const herdIds = lensRows.map((l) => l.herd_id).filter(Boolean) as string[];

  const { data: herds } = await serviceClient
    .from("herds")
    .select("*")
    .in("id", herdIds)
    .eq("user_id", ctx.clientUserId)
    .eq("is_deleted", false);

  // Get client and advisor names
  const { data: clientProfile } = await serviceClient
    .from("user_profiles")
    .select("display_name, company_name")
    .eq("user_id", ctx.clientUserId)
    .single();

  const { data: advisorProfile } = await ctx.supabase
    .from("user_profiles")
    .select("display_name, company_name")
    .eq("user_id", ctx.user.id)
    .single();

  const clientName =
    clientProfile?.display_name ?? "Unknown Producer";
  const advisorName =
    advisorProfile?.display_name ?? "Advisor";

  // Build herd summaries from cached lens data
  const herdDetails = lensRows
    .map((lens) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const herd = herds?.find((h) => h.id === lens.herd_id) as any;
      if (!herd) return null;
      return {
        name: herd.name ?? "Unnamed",
        category: herd.category,
        breed: herd.breed,
        species: herd.species,
        original_head_count: herd.head_count,
        adjusted_head_count: lens.head_count_adjustment != null
          ? Math.max(0, herd.head_count + lens.head_count_adjustment)
          : herd.head_count,
        initial_weight_kg: herd.initial_weight,
        saleyard: herd.selected_saleyard ?? "N/A",
        baseline_value: lens.cached_baseline_value,
        adjusted_value: lens.cached_advisor_value,
        shaded_value: lens.cached_shaded_value,
        shading_percentage: lens.shading_percentage,
        overrides: {
          breed_premium: lens.breed_premium_override,
          daily_weight_gain: lens.adwg_override,
          calving_rate: lens.calving_rate_override,
          mortality_rate: lens.mortality_rate_override,
          head_count_adjustment: lens.head_count_adjustment,
        },
        advisor_notes: lens.advisor_notes,
      };
    })
    .filter(Boolean);

  // Build the AI prompt
  const promptData = JSON.stringify(
    {
      client_name: clientName,
      advisor_name: advisorName,
      report_name: report.name,
      total_baseline_value: report.total_baseline_value,
      total_adjusted_value: report.total_adjusted_value,
      total_shaded_value: report.total_shaded_value,
      herds: herdDetails,
      date: new Date().toISOString().slice(0, 10),
    },
    null,
    2
  );

  const systemPrompt = `You are a professional livestock valuation analyst preparing a formal bank lending assessment report for an Australian agribusiness advisor.

Write a comprehensive valuation assessment suitable for inclusion in bank lending documentation.

REQUIREMENTS:
- Professional, formal tone suitable for financial institutions
- Australian English, AUD currency ($), metric units (kg)
- Reference specific numbers: herd names, head counts, dollar values, percentages
- Never use "mob", always "herd"
- Never use em-dashes. Use hyphens, commas, or full stops instead.
- Structure the report with clear sections

REPORT STRUCTURE:
1. Executive Summary: 2-3 sentences summarising the total portfolio valuation and key adjustments
2. Portfolio Overview: Total head count, baseline vs adjusted vs shaded values, overall shading rationale
3. Individual Herd Assessments: For each herd, explain the adjustments applied and why. Reference the advisor's notes where provided.
4. Risk Considerations: Mortality assumptions, market price sensitivity, seasonal factors
5. Valuation Conclusion: Final shaded portfolio value with confidence statement for lending purposes

Return ONLY the narrative text. Do not wrap in JSON or markdown fences. Use plain paragraphs with section headings on their own line (no markdown # symbols, just the heading text followed by a blank line).`;

  // Call Claude via the claude-proxy edge function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { data: sessionData } = await ctx.supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { error: "No session for report generation" };

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/claude-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Generate a formal bank lending valuation assessment based on the following advisor lens data:\n\n${promptData}`,
          },
        ],
        purpose: "advisor-lens-report",
      }),
    });

    if (!res.ok) {
      console.error("Lens report generation: Claude proxy returned", res.status);
      return { error: "Failed to generate report narrative" };
    }

    const aiData = await res.json();
    const narrative =
      aiData.content?.[0]?.text ?? "Report generation failed.";

    // Sanitise: strip em-dashes, replace "mob" with "herd"
    const sanitised = narrative
      .replace(/\u2014/g, ", ")
      .replace(/\u2013/g, "-")
      .replace(/\bmobs?\b/gi, (m: string) =>
        m[0] === "M" ? (m.length > 3 ? "Herds" : "Herd") : m.length > 3 ? "herds" : "herd"
      );

    // Build the full report data payload
    const reportData: AdvisorLensReportData = {
      lens_report_id: lensReportId,
      lens_name: report.name as string,
      client_name: clientName,
      advisor_name: advisorName,
      generated_at: new Date().toISOString(),
      herds: herdDetails.map((h) => ({
        herd_id: lensRows.find(
          (l) =>
            herds?.find((hr) => hr.id === l.herd_id && hr.name === h!.name)
        )?.herd_id ?? "",
        herd_name: h!.name,
        category: h!.category,
        breed: h!.breed,
        species: h!.species,
        head_count: h!.adjusted_head_count,
        original_head_count: h!.original_head_count,
        initial_weight: h!.initial_weight_kg,
        projected_weight: 0,
        baseline_value: h!.baseline_value ?? 0,
        adjusted_value: h!.adjusted_value ?? 0,
        shaded_value: h!.shaded_value ?? 0,
        shading_percentage: h!.shading_percentage ?? 100,
        overrides: {
          breed_premium_override: h!.overrides.breed_premium,
          adwg_override: h!.overrides.daily_weight_gain,
          calving_rate_override: h!.overrides.calving_rate,
          mortality_rate_override: h!.overrides.mortality_rate,
          head_count_adjustment: h!.overrides.head_count_adjustment,
        },
        advisor_notes: h!.advisor_notes,
        regional_data: null,
        price_per_kg: 0,
        price_source: "",
        breed_premium_applied: 0,
      })),
      totals: {
        baseline_value: report.total_baseline_value ?? 0,
        adjusted_value: report.total_adjusted_value ?? 0,
        shaded_value: report.total_shaded_value ?? 0,
        total_head: herdDetails.reduce(
          (sum, h) => sum + (h!.adjusted_head_count ?? 0),
          0
        ),
        total_original_head: herdDetails.reduce(
          (sum, h) => sum + (h!.original_head_count ?? 0),
          0
        ),
      },
      narrative: sanitised,
    };

    // Save to database
    const { error: saveError } = await ctx.supabase
      .from("lens_reports")
      .update({
        status: "report_generated",
        advisor_narrative: sanitised,
        report_data: reportData,
        report_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", lensReportId);

    if (saveError) return { error: saveError.message };

    revalidatePath(
      `/dashboard/advisor/clients/${connectionId}/lens/${lensReportId}`
    );
    return { success: true };
  } catch (err) {
    console.error("Lens report generation error:", err);
    return { error: "Failed to generate report" };
  }
}

// ---------------------------------------------------------------------------
// 8. Delete a lens report (soft delete)
// ---------------------------------------------------------------------------

export async function deleteLensReport(
  connectionId: string,
  lensReportId: string
) {
  const ids = z
    .object({ connectionId: uuidSchema, lensReportId: uuidSchema })
    .safeParse({ connectionId, lensReportId });
  if (!ids.success) return { error: "Invalid IDs" };

  const ctx = await verifyAdvisorConnection(connectionId);
  if (ctx.error) return { error: ctx.error };

  const now = new Date().toISOString();

  // Soft delete the report
  const { error } = await ctx.supabase
    .from("lens_reports")
    .update({ is_deleted: true, updated_at: now })
    .eq("id", lensReportId)
    .eq("client_connection_id", connectionId);

  if (error) return { error: error.message };

  // Also soft delete associated lens rows
  await ctx.supabase
    .from("advisor_lenses")
    .update({ is_deleted: true, updated_at: now })
    .eq("lens_report_id", lensReportId);

  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// 9. List lens reports for a connection
// ---------------------------------------------------------------------------

export async function listLensReports(connectionId: string) {
  const parsed = uuidSchema.safeParse(connectionId);
  if (!parsed.success) return { error: "Invalid connection ID", data: [] };

  const ctx = await verifyAdvisorConnection(connectionId);
  if (ctx.error) return { error: ctx.error, data: [] };

  const { data, error } = await ctx.supabase
    .from("lens_reports")
    .select("*")
    .eq("client_connection_id", connectionId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };

  return { data: data ?? [] };
}
