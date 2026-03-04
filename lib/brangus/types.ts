// Brangus chat types for web

import type { CategoryPriceEntry } from "../engines/valuation-engine";

// MARK: - Chat Message (UI display)

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
  date: string;
  category: string;
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
