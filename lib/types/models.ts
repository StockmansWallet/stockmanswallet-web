// TypeScript types matching iOS SwiftData models

// MARK: - Enums

export type Species = "Cattle" | "Sheep" | "Pig" | "Goat";

export type UserRole =
  | "Farmer/Grazier"
  | "Agribusiness Banker"
  | "Insurer"
  | "Livestock Agent"
  | "Accountant"
  | "Succession Planner";

export type YardBookCategory =
  | "Livestock"
  | "Operations"
  | "Finance"
  | "Family"
  | "Me";

export type RecurrenceRule = "Weekly" | "Fortnightly" | "Monthly" | "Annual";

export type HealthTreatmentType =
  | "Vaccination"
  | "Drenching"
  | "Parasite Treatment"
  | "Other";

export type PricingType = "per_kg" | "per_head";

export type BindingConstraint = "head_limit";

export type CapacitySource = "library" | "user_override";

// MARK: - Core Models

export interface HerdGroup {
  id: string;
  user_id: string;
  name: string;
  animal_id_number?: string;
  created_at: string;
  updated_at: string;

  // Biological
  species: Species;
  breed: string;
  sex: "Male" | "Female";
  category: string;
  age_months: number;

  // Physical
  head_count: number;
  initial_weight: number;
  current_weight: number;
  daily_weight_gain: number;
  dwg_change_date?: string;
  previous_dwg?: number;
  use_creation_date_for_weight: boolean;

  // Breeding
  is_breeder: boolean;
  is_pregnant: boolean;
  joined_date?: string;
  calving_rate: number;
  lactation_status?: string;
  calving_processed_date?: string;
  breeding_program_type?: "ai" | "controlled" | "uncontrolled";
  joining_period_start?: string;
  joining_period_end?: string;

  // Market
  selected_saleyard?: string;
  market_category?: string;

  // Status
  is_sold: boolean;
  sold_date?: string;
  sold_price?: number;

  // Location
  paddock_name?: string;
  location_latitude?: number;
  location_longitude?: number;

  // Property
  property_id?: string;

  // Adjustments
  breed_premium_override?: number;
  additional_info?: string;
  notes?: string;
  mortality_rate?: number;
  calf_weight_recorded_date?: string;

  // Demo
  is_demo_data: boolean;
}

export interface Property {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;

  property_name: string;
  property_pic?: string;
  is_default: boolean;
  is_simulated: boolean;

  // Location
  state: string;
  region?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;

  // Details
  acreage?: number;
  property_type?: string;
  notes?: string;

  // Preferences
  default_saleyard?: string;
  default_saleyard_distance?: number;
  mortality_rate: number;
  calving_rate: number;
  freight_cost_per_km: number;
}

export interface YardBookItem {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;

  title: string;
  notes?: string;
  event_date: string;
  is_all_day: boolean;
  event_time?: string;

  category: YardBookCategory;

  is_completed: boolean;
  completed_date?: string;

  is_recurring: boolean;
  recurrence_rule?: RecurrenceRule;
  recurrence_interval?: number;

  reminder_offsets?: number[];
  notifications_scheduled: boolean;

  linked_herd_ids?: string[];
  property_id?: string;

  pack_id?: string;
  pack_item_index?: number;

  is_demo_data: boolean;

  linked_muster_record_id?: string;
  linked_health_record_id?: string;
}

export interface MusterRecord {
  id: string;
  user_id: string;
  herd_id: string;
  date: string;
  notes?: string;
  created_at: string;

  total_head_count?: number;
  cattle_yard?: string;
  weaners_count?: number;
  branders_count?: number;

  is_demo_data: boolean;
  linked_yard_book_item_id?: string;
}

export interface HealthRecord {
  id: string;
  user_id: string;
  herd_id: string;
  date: string;
  treatment_type: HealthTreatmentType;
  notes?: string;
  created_at: string;

  is_demo_data: boolean;
  linked_yard_book_item_id?: string;
}

export interface SalesRecord {
  id: string;
  user_id: string;
  herd_group_id: string;
  sale_date: string;
  head_count: number;
  average_weight: number;
  price_per_kg: number;
  price_per_head?: number;
  pricing_type: PricingType;
  sale_type?: string;
  sale_location?: string;
  total_gross_value: number;
  freight_cost: number;
  freight_distance: number;
  net_value: number;
  notes?: string;
  pdf_path?: string;
  is_demo_data: boolean;
}

export interface KillSheetRecord {
  id: string;
  user_id: string;
  processor_name: string;
  grid_code?: string;
  kill_date: string;
  vendor_code?: string;
  pic?: string;
  property_name?: string;
  booking_reference?: string;
  booking_type?: string;
  herd_group_id?: string;
  total_head_count: number;
  total_body_weight: number;
  total_gross_value: number;
  average_body_weight: number;
  average_price_per_kg: number;
  average_value_per_head: number;
  condemns: number;
  category_summaries: KillSheetCategorySummary[];
  grade_distribution: KillSheetGradeEntry[];
  weight_class_distribution: KillSheetWeightClassEntry[];
  fat_class_distribution: KillSheetFatClassEntry[];
  line_items: KillSheetLineItem[];
  realisation_factor?: number;
  payment_check_result?: PaymentCheckResult;
  source_file_path?: string;
  notes?: string;
  created_at: string;
}

// MARK: - Kill Sheet Sub-types

export interface KillSheetCategorySummary {
  id: string;
  category: string;
  body_count: number;
  percentage: number;
  total_weight: number;
  average_weight: number;
  average_value: number;
  average_price_per_kg: number;
  total_value: number;
  condemns: number;
}

export interface KillSheetGradeEntry {
  id: string;
  grade_code: string;
  category: string;
  body_count: number;
  percentage: number;
  total_weight: number;
  average_weight: number;
}

export interface KillSheetWeightClassEntry {
  id: string;
  weight_band: string;
  category: string;
  body_count: number;
  percentage: number;
  total_weight: number;
}

export interface KillSheetFatClassEntry {
  id: string;
  fat_band: string;
  category: string;
  body_count: number;
  percentage: number;
  total_weight: number;
}

export interface KillSheetLineItem {
  id: string;
  body_number: number;
  nlis_rfid?: string;
  category: string;
  dentition: number;
  p8_fat: number;
  butt_shape?: string;
  marbling_score?: number;
  meat_colour?: string;
  fat_colour?: number;
  left_side_weight: number;
  left_grade: string;
  left_price_per_kg: number;
  right_side_weight: number;
  right_grade: string;
  right_price_per_kg: number;
  total_body_weight: number;
  gross_value: number;
  comments?: string;
}

export interface PaymentCheckResult {
  status: string;
  [key: string]: unknown;
}

// MARK: - Freight Types

export interface FreightCapacityCategory {
  id: string;
  displayName: string;
  avgWeightKg: number;
  sqmPerHead: number;
  headsPerDeck: number;
  weightFloorKg: number;
  weightCeilingKg: number;
  sexFilter: "male" | "female" | "any";
}

export interface FreightEstimate {
  herdGroupId?: string;
  freightCategory: FreightCapacityCategory;
  headCount: number;
  averageWeightKg: number;
  headsPerDeck: number;
  decksRequired: number;
  hasPartialDeck: boolean;
  spareSpotsOnLastDeck: number;
  bindingConstraint: BindingConstraint;
  capacitySource: CapacitySource;
  distanceKm: number;
  ratePerDeckPerKm: number;
  totalCost: number;
  costPerHead: number;
  costPerDeck: number;
  costPerKm: number;
  categoryWarning?: string;
  breederAutoDetectNotice?: string;
  efficiencyPrompt?: string;
  userOverrideCategory?: FreightCapacityCategory;
  overrideReason?: string;
  isCustomJob: boolean;
}
