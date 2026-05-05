// Brangus chat types for web

import type { CategoryPriceEntry } from "../engines/valuation-engine";
import type { PropertyWeatherData } from "../services/weather-service";

// MARK: - Chat Message (UI display)

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  // Glovebox files the user attached to this turn via the paperclip. Drives the chip
  // strip rendered inside the user bubble. Empty / undefined for plain text.
  attachments?: ChatMessageAttachment[];
}

export interface ChatMessageAttachment {
  id: string;
  title: string;
  mime_type: string;
}

// Navigation actions triggered by tapping a summary card
// Each type maps to a specific route in the app
export type CardAction =
  | { type: "yardbook" }
  | { type: "herdDetail"; id: string; name: string }
  | { type: "portfolio" }
  | { type: "market" }
  | { type: "freight" };

// Quick insight card extracted from display_summary_cards tool_use blocks
export interface QuickInsight {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  sentiment: "positive" | "negative" | "neutral";
  action?: CardAction;
}

// MARK: - Anthropic API Types

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result" | "image" | "document";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  source?: {
    type: "base64" | "url";
    media_type?: string;
    data?: string;
    url?: string;
  };
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
  yardbookItems: YardbookRow[];
  musterRecords: MusterRow[];
  healthRecords: HealthRow[];
  categoryPricesRaw: CategoryPriceRow[];
  portfolioValue: number;
  nationalPriceMap: Map<string, CategoryPriceEntry[]>;
  saleyardPriceMap: Map<string, CategoryPriceEntry[]>;
  // Breed-specific saleyard prices keyed as `${category}|${breed}|${saleyard}`.
  // Dashboard passes this to the AMV engine so Angus-at-Roma style direct
  // prices resolve ahead of the national-plus-premium fallback. Brangus must
  // pass the same map or its totals diverge from the Dashboard (BRG-013 CAT-06).
  saleyardBreedPriceMap: Map<string, CategoryPriceEntry[]>;
  // Lowercase resolved-MLA-name set tracking which saleyards already have prices
  // loaded into the maps above. Initialised with the user's herd yards (loaded
  // by chat-service at session start). When Brangus asks about an arbitrary yard
  // (e.g. Charters Towers, Gracemere) that the user does not own, valuationForHerd
  // calls ensureSaleyardLoaded to live-fetch that yard's prices from Supabase and
  // merge them into the maps before running the engine. Without this, the engine
  // silently fell through to the national-average default for any non-owned yard.
  loadedSaleyards: Set<string>;
  premiumMap: Map<string, number>;

  // Grid IQ data (for Brangus tool lookups)
  gridIQAnalyses: GridIQAnalysisRow[];
  killSheets: KillSheetRow[];
  processorGrids: ProcessorGridRow[];

  // Seasonal monthly averages per category (month 1-12 → $/kg)
  seasonalData: SeasonalCategoryData[];

  // Weather data for property_weather lookups (fetched from Open-Meteo)
  weatherData: PropertyWeatherData[];

  // Active MLA saleyards (data fresher than 365 days). Used to filter the
  // AVAILABLE SALEYARDS prompt block so Brangus only offers yards we have
  // recent prices for. Empty set means "still loading or fetch failed" -
  // the prompt builder falls back to the full canonical list in that case.
  activeSaleyards: Set<string>;

  // Pending mutations from tool calls (persisted after response)
  pendingYardbookEvents: PendingYardbookEvent[];
  pendingYardbookActions: PendingYardbookAction[];
  pendingSaleRecords: PendingSaleRecord[];
  pendingTreatmentRecords: PendingTreatmentRecord[];
  pendingMusterRecords: PendingMusterRecord[];

  // Authenticated user id - needed by tool handlers that talk back to
  // Supabase (e.g. lookup_file). Populated when the chat starts.
  userId: string | null;

  // Glovebox file ids that lookup_file get_content asked Brangus to read on the
  // NEXT turn (PDFs/images that need to arrive as native document/image
  // blocks). The chat-service drains this after each tool round and
  // appends the corresponding content blocks to the next user message.
  pendingFileFollowups: string[];
}

// MARK: - Glovebox Files (chat-side rows)
export interface GloveboxFileChatRow {
  id: string;
  title: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  kind: string | null;
  page_count: number | null;
  extraction_status: string;
  storage_path: string;
  extracted_text_path: string | null;
  created_at: string;
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
  breeder_sub_type: string | null;
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
  address: string | null;
  access_road: string | null;
  suburb: string | null;
  region: string | null;
  acreage: number | null;
  latitude: number | null;
  longitude: number | null;
  location_source: "geocoded" | "pin_dropped" | null;
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

export interface YardbookRow {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  is_all_day: boolean;
  category_raw: string;
  is_completed: boolean;
  completed_date: string | null;
  is_recurring: boolean;
  recurrence_rule_raw: string | null;
  recurrence_interval: number | null;
  linked_herd_ids: string[] | null;
  property_id: string | null;
  notes: string | null;
}

export interface MusterRow {
  id: string;
  herd_id: string;
  date: string;
  head_count_observed: number | null;
}

export interface HealthRow {
  id: string;
  herd_id: string;
  date: string;
  treatment_type: string | null;
  notes: string | null;
}

export interface CategoryPriceRow {
  category: string;
  price_per_kg: number;
  weight_range: string | null;
  saleyard: string | null;
  data_date: string;
}

// MARK: - Grid IQ Row Types (for Brangus tool lookups)

export interface GridIQAnalysisRow {
  id: string;
  herd_id: string;
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
  herd_id: string | null;
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
  // BRG-015 fix: explicit source label so Brangus can always attribute the data
  sourceLabel: string;
  // BRG-015 (CAT-03 R2): sample size + date range so Brangus can answer
  // "how reliable is that figure?" without guessing. Null on fallback (synthetic) data.
  sampleSize?: number;
  earliestDate?: string; // ISO YYYY-MM-DD
  latestDate?: string;
}

// MARK: - Pending Mutations

export interface PendingYardbookEvent {
  title: string;
  date: string;
  category: string;
  is_all_day: boolean;
  notes?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  linked_herd_names?: string[];
}

export interface PendingYardbookAction {
  action: string;
  itemId: string;
  title: string;
}

export interface PendingSaleRecord {
  herd_id: string;
  herd_name: string;
  sale_date: string;
  head_count: number;
  pricing_type: string;
  price_per_kg: number;
  price_per_head?: number;
  average_weight_kg: number;
  total_gross_value: number;
  sale_type?: string;
  sale_location?: string;
  notes?: string;
  is_full_sale: boolean;
  remaining_head_count: number;
}

export interface PendingTreatmentRecord {
  herd_id: string;
  herd_name: string;
  date: string;
  treatment_type_raw: string;
  notes?: string;
}

export interface PendingMusterRecord {
  herd_id: string;
  herd_name: string;
  date: string;
  total_head_count: number;
  cattle_yard?: string;
  notes?: string;
}
