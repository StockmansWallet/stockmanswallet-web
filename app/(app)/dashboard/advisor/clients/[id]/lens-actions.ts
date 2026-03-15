"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ScenarioType } from "@/lib/types/advisor-lens";

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
