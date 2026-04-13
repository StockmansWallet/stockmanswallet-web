// Advisor Lens and Scenario types - matches iOS AdvisorLens.swift and AdvisorScenario.swift

export type ScenarioType =
  | "optimistic"
  | "base"
  | "conservative"
  | "severe_downside"
  | "bank_policy"
  | "custom";

export const SCENARIO_TYPE_CONFIG: Record<ScenarioType, { label: string; icon: string }> = {
  optimistic: { label: "Optimistic", icon: "trending-up" },
  base: { label: "Base Case", icon: "target" },
  conservative: { label: "Conservative", icon: "shield" },
  severe_downside: { label: "Severe Downside", icon: "alert-triangle" },
  bank_policy: { label: "Bank Policy", icon: "landmark" },
  custom: { label: "Custom", icon: "sliders-horizontal" },
};

export interface AdvisorLens {
  id: string;
  client_connection_id: string;
  herd_id: string | null;
  is_active: boolean;
  shading_percentage: number;
  breed_premium_override: number | null;
  adwg_override: number | null;
  calving_rate_override: number | null;
  mortality_rate_override: number | null;
  head_count_adjustment: number | null;
  advisor_notes: string | null;
  active_scenario_id: string | null;
  lens_report_id: string | null;
  cached_baseline_value: number | null;
  cached_advisor_value: number | null;
  cached_shaded_value: number | null;
  last_calculated_date: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdvisorScenario {
  id: string;
  client_connection_id: string;
  name: string;
  scenario_type: ScenarioType;
  notes: string | null;
  is_locked: boolean;
  locked_date: string | null;
  locked_by_name: string | null;
  breed_premium_override: number | null;
  adwg_override: number | null;
  calving_rate_override: number | null;
  mortality_rate_override: number | null;
  head_count_adjustment: number | null;
  shading_percentage: number;
  cached_advisor_value: number | null;
  cached_shaded_value: number | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export function hasOverrides(lens: AdvisorLens): boolean {
  return (
    lens.breed_premium_override != null ||
    lens.adwg_override != null ||
    lens.calving_rate_override != null ||
    lens.mortality_rate_override != null ||
    lens.head_count_adjustment != null
  );
}

export function overrideCount(lens: AdvisorLens): number {
  let count = 0;
  if (lens.breed_premium_override != null) count++;
  if (lens.adwg_override != null) count++;
  if (lens.calving_rate_override != null) count++;
  if (lens.mortality_rate_override != null) count++;
  if (lens.head_count_adjustment != null) count++;
  return count;
}

export function applyShadingTo(value: number, shadingPercentage: number): number {
  return value * (shadingPercentage / 100);
}
