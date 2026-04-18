// Typed row shape for supabase.from("grid_iq_analyses").
// Mirrors the live schema after migrations 20260304, 20260310, 20260312,
// 20260417 (nullable herd_id, category_results JSONB, processor_id).

export interface GridIQCategoryResult {
  herdGroupId: string;
  herdName: string;
  category: string;
  headCount: number;
  netSaleyardValue: number;
  netProcessorValue: number;
  gridIQAdvantage: number;
  sellWindowStatus: string;
  daysToTarget: number | null;
  dressingPercentage: number;
  realisationFactor: number;
  isUsingPersonalisedData: boolean;
}

export interface GridIQBrangusCommentary {
  bullets?: string[];
  narrative?: string;
}

export interface GridIQAnalysisRow {
  id: string;
  user_id: string;
  herd_id: string | null;
  processor_grid_id: string;
  processor_id: string | null;
  kill_sheet_record_id: string | null;
  consignment_id: string | null;
  analysis_date: string;
  analysis_mode: "pre_sale" | "post_sale";

  // Snapshot labels
  herd_name: string;
  processor_name: string;

  // Core comparison values
  mla_market_value: number;
  headline_grid_value: number;
  realisation_factor: number;
  realistic_grid_outcome: number;

  // Freight impact
  freight_to_saleyard: number;
  freight_to_processor: number;

  // Net comparison
  net_saleyard_value: number;
  net_processor_value: number;
  grid_iq_advantage: number;

  // Sell window
  sell_window_status_raw: string;
  sell_window_detail: string;
  days_to_target: number | null;
  projected_carcase_weight: number | null;

  // Opportunity insight
  opportunity_value: number | null;
  opportunity_driver: string | null;
  opportunity_detail: string | null;

  // Processor fit
  processor_fit_score: number | null;
  processor_fit_label_raw: string | null;

  // Post-sale scorecard (nullable until a kill sheet is attached)
  gcr: number | null;
  grid_risk: number | null;
  kill_score: number | null;
  grid_compliance_score: number | null;
  fat_compliance_score: number | null;
  dentition_compliance_score: number | null;

  // Per-head breakdown
  head_count: number;
  estimated_carcase_weight: number;
  dressing_percentage: number;
  is_using_personalised_data: boolean;

  // Multi-herd category breakdown (JSONB)
  category_results: GridIQCategoryResult[] | null;

  // Brangus commentary (JSONB)
  brangus_commentary: GridIQBrangusCommentary | null;

  // Sync metadata
  is_deleted: boolean;
  deleted_at: string | null;
  last_synced_at: string | null;
  updated_at: string;
}
