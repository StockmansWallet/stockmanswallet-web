// Advisor Lens Report types: grouped multi-herd assessments with report generation

export type LensReportStatus = "draft" | "saved" | "report_generated";

export interface LensReport {
  id: string;
  client_connection_id: string;
  name: string;
  status: LensReportStatus;
  total_baseline_value: number | null;
  total_adjusted_value: number | null;
  total_shaded_value: number | null;
  advisor_narrative: string | null;
  report_data: AdvisorLensReportData | null;
  report_generated_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface LensHerdSummary {
  herd_id: string;
  herd_name: string;
  category: string;
  breed: string;
  species: string;
  head_count: number;
  original_head_count: number;
  initial_weight: number;
  projected_weight: number;
  baseline_value: number;
  adjusted_value: number;
  shaded_value: number;
  shading_percentage: number;
  overrides: {
    breed_premium_override: number | null;
    adwg_override: number | null;
    calving_rate_override: number | null;
    mortality_rate_override: number | null;
    head_count_adjustment: number | null;
  };
  advisor_notes: string | null;
  regional_data: RegionalDataSnapshot | null;
  price_per_kg: number;
  price_source: string;
  breed_premium_applied: number;
}

export interface RegionalDataSnapshot {
  saleyard_prices: {
    category: string;
    saleyard: string;
    price_per_kg: number;
    weight_range: string | null;
    data_date: string;
  }[];
  national_prices: {
    category: string;
    price_per_kg: number;
    weight_range: string | null;
    data_date: string;
  }[];
  fetched_at: string;
}

export interface AdvisorLensReportData {
  lens_report_id: string;
  lens_name: string;
  client_name: string;
  advisor_name: string;
  generated_at: string;
  herds: LensHerdSummary[];
  totals: {
    baseline_value: number;
    adjusted_value: number;
    shaded_value: number;
    total_head: number;
    total_original_head: number;
  };
  narrative: string;
}
