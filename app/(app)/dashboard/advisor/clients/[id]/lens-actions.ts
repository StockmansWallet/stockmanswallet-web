"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ScenarioType } from "@/lib/types/advisor-lens";

const connectionIdSchema = z.object({
  connectionId: z.string().uuid(),
});

const upsertLensDataSchema = z.object({
  is_active: z.boolean().optional(),
  shading_percentage: z.number().min(0).max(200).optional(),
  breed_premium_override: z.number().nullable().optional(),
  adwg_override: z.number().nullable().optional(),
  calving_rate_override: z.number().nullable().optional(),
  mortality_rate_override: z.number().nullable().optional(),
  head_count_adjustment: z.number().int().nullable().optional(),
  advisor_notes: z.string().max(5000).nullable().optional(),
  active_scenario_id: z.string().uuid().nullable().optional(),
  cached_baseline_value: z.number().nullable().optional(),
  cached_advisor_value: z.number().nullable().optional(),
  cached_shaded_value: z.number().nullable().optional(),
});

const createScenarioSchema = z.object({
  name: z.string().min(1).max(200),
  scenario_type: z.enum(["conservative", "moderate", "aggressive", "custom"]),
  notes: z.string().max(2000).optional(),
  breed_premium_override: z.number().nullable().optional(),
  adwg_override: z.number().nullable().optional(),
  calving_rate_override: z.number().nullable().optional(),
  mortality_rate_override: z.number().nullable().optional(),
  head_count_adjustment: z.number().int().nullable().optional(),
  shading_percentage: z.number().min(0).max(200).optional(),
});

const scenarioIdSchema = z.object({
  connectionId: z.string().uuid(),
  scenarioId: z.string().uuid(),
});

const lockScenarioSchema = z.object({
  connectionId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  advisorName: z.string().min(1).max(200),
});

export async function upsertAdvisorLens(
  connectionId: string,
  data: {
    is_active?: boolean;
    shading_percentage?: number;
    breed_premium_override?: number | null;
    adwg_override?: number | null;
    calving_rate_override?: number | null;
    mortality_rate_override?: number | null;
    head_count_adjustment?: number | null;
    advisor_notes?: string | null;
    active_scenario_id?: string | null;
    cached_baseline_value?: number | null;
    cached_advisor_value?: number | null;
    cached_shaded_value?: number | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const connParsed = connectionIdSchema.safeParse({ connectionId });
  if (!connParsed.success) return { error: "Invalid input" };

  const dataParsed = upsertLensDataSchema.safeParse(data);
  if (!dataParsed.success) return { error: "Invalid input" };

  // Check if lens already exists
  const { data: existing } = await supabase
    .from("advisor_lenses")
    .select("id")
    .eq("client_connection_id", connectionId)
    .eq("is_deleted", false)
    .single();

  const now = new Date().toISOString();

  if (existing) {
    const { error } = await supabase
      .from("advisor_lenses")
      .update({ ...data, updated_at: now, last_calculated_date: now })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("advisor_lenses").insert({
      id: crypto.randomUUID(),
      client_connection_id: connectionId,
      ...data,
      updated_at: now,
      last_calculated_date: now,
    });

    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  return { success: true };
}

export async function resetLensOverrides(connectionId: string) {
  return upsertAdvisorLens(connectionId, {
    breed_premium_override: null,
    adwg_override: null,
    calving_rate_override: null,
    mortality_rate_override: null,
    head_count_adjustment: null,
    active_scenario_id: null,
    cached_advisor_value: null,
    cached_shaded_value: null,
  });
}

// Per-herd lens: upsert overrides for a specific herd
export async function upsertHerdLens(
  connectionId: string,
  herdId: string,
  data: {
    is_active?: boolean;
    shading_percentage?: number;
    breed_premium_override?: number | null;
    adwg_override?: number | null;
    calving_rate_override?: number | null;
    mortality_rate_override?: number | null;
    head_count_adjustment?: number | null;
    advisor_notes?: string | null;
    cached_baseline_value?: number | null;
    cached_advisor_value?: number | null;
    cached_shaded_value?: number | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const connParsed = connectionIdSchema.safeParse({ connectionId });
  if (!connParsed.success) return { error: "Invalid connection ID" };

  const dataParsed = upsertLensDataSchema.safeParse(data);
  if (!dataParsed.success) return { error: "Invalid input" };

  // Check if per-herd lens already exists
  const { data: existing } = await supabase
    .from("advisor_lenses")
    .select("id")
    .eq("client_connection_id", connectionId)
    .eq("herd_id", herdId)
    .eq("is_deleted", false)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const { error } = await supabase
      .from("advisor_lenses")
      .update({ ...data, updated_at: now, last_calculated_date: now })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("advisor_lenses").insert({
      id: crypto.randomUUID(),
      client_connection_id: connectionId,
      herd_id: herdId,
      is_active: true,
      ...data,
      updated_at: now,
      last_calculated_date: now,
    });

    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  revalidatePath(`/dashboard/advisor/clients/${connectionId}/herds/${herdId}`);
  return { success: true };
}

// Per-herd lens: reset all overrides for a specific herd
export async function resetHerdOverrides(connectionId: string, herdId: string) {
  return upsertHerdLens(connectionId, herdId, {
    breed_premium_override: null,
    adwg_override: null,
    calving_rate_override: null,
    mortality_rate_override: null,
    head_count_adjustment: null,
    shading_percentage: 100,
    cached_advisor_value: null,
    cached_shaded_value: null,
  });
}

export async function createScenario(
  connectionId: string,
  data: {
    name: string;
    scenario_type: ScenarioType;
    notes?: string;
    breed_premium_override?: number | null;
    adwg_override?: number | null;
    calving_rate_override?: number | null;
    mortality_rate_override?: number | null;
    head_count_adjustment?: number | null;
    shading_percentage?: number;
  }
) {
  const connParsed = connectionIdSchema.safeParse({ connectionId });
  if (!connParsed.success) return { error: "Invalid input" };

  const scenarioParsed = createScenarioSchema.safeParse(data);
  if (!scenarioParsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const id = crypto.randomUUID();
  const { error } = await supabase.from("advisor_scenarios").insert({
    id,
    client_connection_id: connectionId,
    name: data.name,
    scenario_type: data.scenario_type,
    notes: data.notes ?? null,
    breed_premium_override: data.breed_premium_override ?? null,
    adwg_override: data.adwg_override ?? null,
    calving_rate_override: data.calving_rate_override ?? null,
    mortality_rate_override: data.mortality_rate_override ?? null,
    head_count_adjustment: data.head_count_adjustment ?? null,
    shading_percentage: data.shading_percentage ?? 100,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  return { success: true, id };
}

export async function loadScenarioIntoLens(connectionId: string, scenarioId: string) {
  const parsed = scenarioIdSchema.safeParse({ connectionId, scenarioId });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: scenario, error: fetchError } = await supabase
    .from("advisor_scenarios")
    .select("*")
    .eq("id", scenarioId)
    .eq("is_deleted", false)
    .single();

  if (fetchError || !scenario) return { error: "Scenario not found" };

  return upsertAdvisorLens(connectionId, {
    breed_premium_override: scenario.breed_premium_override,
    adwg_override: scenario.adwg_override,
    calving_rate_override: scenario.calving_rate_override,
    mortality_rate_override: scenario.mortality_rate_override,
    head_count_adjustment: scenario.head_count_adjustment,
    shading_percentage: scenario.shading_percentage,
    active_scenario_id: scenarioId,
  });
}

export async function lockScenario(connectionId: string, scenarioId: string, advisorName: string) {
  const parsed = lockScenarioSchema.safeParse({ connectionId, scenarioId, advisorName });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("advisor_scenarios")
    .update({
      is_locked: true,
      locked_date: new Date().toISOString(),
      locked_by_name: advisorName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scenarioId)
    .eq("is_locked", false);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  return { success: true };
}

export async function deleteScenario(connectionId: string, scenarioId: string) {
  const parsed = scenarioIdSchema.safeParse({ connectionId, scenarioId });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Only delete unlocked scenarios
  const { error } = await supabase
    .from("advisor_scenarios")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", scenarioId)
    .eq("is_locked", false);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  return { success: true };
}
