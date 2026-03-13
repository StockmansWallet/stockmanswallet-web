// Brangus chat types for web

import type { CategoryPriceEntry } from "../engines/valuation-engine";
import type { PropertyWeatherData } from "../services/weather-service";

// MARK: - Chat Message (UI display)

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  // Quick insight cards from display_summary_cards tool (display-only, no tool_result sent)
  quickInsights?: QuickInsight[];
}

// Quick insight card extracted from display_summary_cards tool_use blocks
export interface QuickInsight {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  sentiment: "positive" | "negative" | "neutral";
}

// MARK: - Anthropic API Types

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

export interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: "end_turn" | "tool_use" | "max_tokens";
  usage: { input_tokens: number; output_tokens: number };
}

// MARK: - Chat Data Store

export interface ChatDataStore {
  herds: HerdRow[];
  properties: PropertyRow[];
  salesRecords: SalesRow[];
  yardBookItems: YardBookRow[];
  musterRecords: MusterRow[];
  healthRecords: HealthRow[];
  categoryPricesRaw: CategoryPriceRow[];
  portfolioValue: number;
  nationalPriceMap: Map<string, CategoryPriceEntry[]>;
  saleyardPriceMap: Map<string, CategoryPriceEntry[]>;
  premiumMap: Map<string, number>;

  // Grid IQ data (for Brangus tool lookups)
  gridIQAnalyses: GridIQAnalysisRow[];
  killSheets: KillSheetRow[];
  processorGrids: ProcessorGridRow[];

  // Seasonal monthly averages per category (month 1-12 → $/kg)
  seasonalData: SeasonalCategoryData[];

  // Weather data for property_weather lookups (fetched from Open-Meteo)
  weatherData: PropertyWeatherData[];

  // Pending mutations from tool calls (persisted after response)
  pendingYardBookEvents: PendingYardBookEvent[];
  pendingYardBookActions: PendingYardBookAction[];
}

// MARK: - Supabase Row Types (subset of columns needed for chat)

export interface HerdRow {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  category: string;
  age_months: number;
  head_count: number;
  initial_weight: number;
  current_weight: number;
  daily_weight_gain: number;
  dwg_change_date: string | null;
  previous_dwg: number | null;
  created_at: string;
  updated_at: string;
  is_sold: boolean;
  is_breeder: boolean;
  is_pregnant: boolean;
  joined_date: string | null;
  calving_rate: number;
  breeding_program_type: string | null;
  joining_period_start: string | null;
  joining_period_end: string | null;
  selected_saleyard: string | null;
  breed_premium_override: number | null;
  mortality_rate: number | null;
  property_id: string | null;
  paddock_name: string | null;
  notes: string | null;
  additional_info: string | null;
  calf_weight_recorded_date: string | null;
}

export interface PropertyRow {
  id: string;
  property_name: string;
  property_pic: string | null;
  state: string;
  suburb: string | null;
  region: string | null;
  acreage: number | null;
  latitude: number | null;
  longitude: number | null;
  default_saleyard: string | null;
  default_saleyard_distance: number | null;
  is_default: boolean;
}

export interface SalesRow {
  id: string;
  sale_date: string;
  head_count: number;
  sale_location: string | null;
  total_sale_price: number | null;
  pricing_type: string | null;
  price_per_unit: number | null;
}

export interface YardBookRow {
  id: string;
  title: string;
  event_date: string;
  category_raw: string;
  is_completed: boolean;
  notes: string | null;
}

export interface MusterRow {
  id: string;
  herd_group_id: string;
  date: string;
  head_count_observed: number | null;
}

export interface HealthRow {
  id: string;
  herd_group_id: string;
  date: string;
  treatment_type: string | null;
  notes: string | null;
}

export interface CategoryPriceRow {
  category: string;
  price_per_kg: number;
  weight_range: string | null;
  saleyard: string | null;
}

// MARK: - Grid IQ Row Types (for Brangus tool lookups)

export interface GridIQAnalysisRow {
  id: string;
  herd_group_id: string;
  processor_grid_id: string;
  kill_sheet_record_id: string | null;
  analysis_date: string;
  herd_name: string;
  processor_name: string;
  mla_market_value: number;
  headline_grid_value: number;
  realisation_factor: number;
  realistic_grid_outcome: number;
  freight_to_saleyard: number;
  freight_to_processor: number;
  net_saleyard_value: number;
  net_processor_value: number;
  grid_iq_advantage: number;
  sell_window_status_raw: string;
  sell_window_detail: string;
  days_to_target: number | null;
  head_count: number;
  estimated_carcase_weight: number;
  dressing_percentage: number;
  is_using_personalised_data: boolean;
  analysis_mode: string | null;
  gcr: number | null;
  grid_risk: number | null;
  kill_score: number | null;
  grid_compliance_score: number | null;
  fat_compliance_score: number | null;
  dentition_compliance_score: number | null;
  processor_fit_score: number | null;
  processor_fit_label_raw: string | null;
  opportunity_value: number | null;
  opportunity_driver: string | null;
}

export interface KillSheetRow {
  id: string;
  processor_name: string;
  kill_date: string;
  total_head_count: number;
  total_body_weight: number;
  total_gross_value: number;
  average_body_weight: number;
  average_price_per_kg: number;
  average_value_per_head: number;
  condemns: number;
  realisation_factor: number | null;
  herd_group_id: string | null;
  property_name: string | null;
  notes: string | null;
}

export interface ProcessorGridRow {
  id: string;
  processor_name: string;
  grid_code: string | null;
  grid_date: string;
  expiry_date: string | null;
  location: string | null;
}

// MARK: - Seasonal Data

export interface SeasonalCategoryData {
  category: string;
  monthlyAvg: Record<number, number>; // month (1-12) → $/kg
  bestMonth: number | null;
  isFallback: boolean;
}

// MARK: - Pending Mutations

export interface PendingYardBookEvent {
  title: string;
  date: string;
  category: string;
  is_all_day: boolean;
  notes?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  linked_herd_names?: string[];
}

export interface PendingYardBookAction {
  action: string;
  itemId: string;
  title: string;
}
