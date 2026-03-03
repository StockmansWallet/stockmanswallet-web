-- Stockman's Wallet: User Data Tables
-- Mirrors iOS SwiftData models for web app
-- All tables have user_id FK, RLS policies, and relevant indexes

-- ============================================================================
-- Helper: auto-update updated_at timestamp
-- ============================================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 1. PROPERTIES
-- ============================================================================
create table properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  property_name text not null,
  property_pic text,
  is_default boolean not null default false,
  is_simulated boolean not null default false,

  -- Location
  state text not null,
  region text,
  address text,
  suburb text,
  postcode text,
  latitude double precision,
  longitude double precision,

  -- Details
  acreage double precision,
  property_type text,
  notes text,

  -- Preferences
  default_saleyard text,
  default_saleyard_distance double precision,
  mortality_rate double precision not null default 0.02,
  calving_rate double precision not null default 0.85,
  freight_cost_per_km double precision not null default 3.00
);

alter table properties enable row level security;

create policy "Users can view own properties"
  on properties for select using (auth.uid() = user_id);
create policy "Users can insert own properties"
  on properties for insert with check (auth.uid() = user_id);
create policy "Users can update own properties"
  on properties for update using (auth.uid() = user_id);
create policy "Users can delete own properties"
  on properties for delete using (auth.uid() = user_id);

create index idx_properties_user_id on properties(user_id);

create trigger properties_updated_at
  before update on properties
  for each row execute function update_updated_at();

-- ============================================================================
-- 2. HERDS
-- ============================================================================
create table herds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  animal_id_number text,

  -- Biological
  species text not null check (species in ('Cattle', 'Sheep', 'Pig', 'Goat')),
  breed text not null,
  sex text not null check (sex in ('Male', 'Female')),
  category text not null,
  age_months integer not null default 0,

  -- Physical
  head_count integer not null default 1,
  initial_weight double precision not null default 0,
  current_weight double precision not null default 0,
  daily_weight_gain double precision not null default 0,
  dwg_change_date timestamptz,
  previous_dwg double precision,
  use_creation_date_for_weight boolean not null default false,

  -- Breeding
  is_breeder boolean not null default false,
  is_pregnant boolean not null default false,
  joined_date timestamptz,
  calving_rate double precision not null default 0.85,
  lactation_status text,
  calving_processed_date timestamptz,
  breeding_program_type text check (breeding_program_type in ('ai', 'controlled', 'uncontrolled')),
  joining_period_start timestamptz,
  joining_period_end timestamptz,

  -- Market
  selected_saleyard text,
  market_category text,

  -- Status
  is_sold boolean not null default false,
  sold_date timestamptz,
  sold_price double precision,

  -- Location
  paddock_name text,
  location_latitude double precision,
  location_longitude double precision,

  -- Property
  property_id uuid references properties(id) on delete set null,

  -- Adjustments
  breed_premium_override double precision,
  additional_info text,
  notes text,
  mortality_rate double precision,
  calf_weight_recorded_date timestamptz,

  -- Demo
  is_demo_data boolean not null default false
);

alter table herds enable row level security;

create policy "Users can view own herds"
  on herds for select using (auth.uid() = user_id);
create policy "Users can insert own herds"
  on herds for insert with check (auth.uid() = user_id);
create policy "Users can update own herds"
  on herds for update using (auth.uid() = user_id);
create policy "Users can delete own herds"
  on herds for delete using (auth.uid() = user_id);

create index idx_herds_user_id on herds(user_id);
create index idx_herds_property_id on herds(property_id);
create index idx_herds_species on herds(user_id, species);
create index idx_herds_is_sold on herds(user_id, is_sold);

create trigger herds_updated_at
  before update on herds
  for each row execute function update_updated_at();

-- ============================================================================
-- 3. MUSTER RECORDS
-- ============================================================================
create table muster_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  herd_id uuid not null references herds(id) on delete cascade,
  created_at timestamptz not null default now(),

  date timestamptz not null,
  notes text,

  total_head_count integer,
  cattle_yard text,
  weaners_count integer,
  branders_count integer,

  is_demo_data boolean not null default false,
  linked_yard_book_item_id uuid
);

alter table muster_records enable row level security;

create policy "Users can view own muster records"
  on muster_records for select using (auth.uid() = user_id);
create policy "Users can insert own muster records"
  on muster_records for insert with check (auth.uid() = user_id);
create policy "Users can update own muster records"
  on muster_records for update using (auth.uid() = user_id);
create policy "Users can delete own muster records"
  on muster_records for delete using (auth.uid() = user_id);

create index idx_muster_records_user_id on muster_records(user_id);
create index idx_muster_records_herd_id on muster_records(herd_id);
create index idx_muster_records_date on muster_records(herd_id, date desc);

-- ============================================================================
-- 4. HEALTH RECORDS
-- ============================================================================
create table health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  herd_id uuid not null references herds(id) on delete cascade,
  created_at timestamptz not null default now(),

  date timestamptz not null,
  treatment_type text not null check (treatment_type in ('Vaccination', 'Drenching', 'Parasite Treatment', 'Other')),
  notes text,

  is_demo_data boolean not null default false,
  linked_yard_book_item_id uuid
);

alter table health_records enable row level security;

create policy "Users can view own health records"
  on health_records for select using (auth.uid() = user_id);
create policy "Users can insert own health records"
  on health_records for insert with check (auth.uid() = user_id);
create policy "Users can update own health records"
  on health_records for update using (auth.uid() = user_id);
create policy "Users can delete own health records"
  on health_records for delete using (auth.uid() = user_id);

create index idx_health_records_user_id on health_records(user_id);
create index idx_health_records_herd_id on health_records(herd_id);
create index idx_health_records_date on health_records(herd_id, date desc);

-- ============================================================================
-- 5. SALES RECORDS
-- ============================================================================
create table sales_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  herd_group_id uuid not null references herds(id) on delete cascade,
  created_at timestamptz not null default now(),

  sale_date timestamptz not null,
  head_count integer not null,
  average_weight double precision not null,
  price_per_kg double precision not null,
  price_per_head double precision,
  pricing_type text not null default 'per_kg' check (pricing_type in ('per_kg', 'per_head')),
  sale_type text,
  sale_location text,
  total_gross_value double precision not null,
  freight_cost double precision not null default 0,
  freight_distance double precision not null default 0,
  net_value double precision not null,
  notes text,
  pdf_path text,

  is_demo_data boolean not null default false
);

alter table sales_records enable row level security;

create policy "Users can view own sales records"
  on sales_records for select using (auth.uid() = user_id);
create policy "Users can insert own sales records"
  on sales_records for insert with check (auth.uid() = user_id);
create policy "Users can update own sales records"
  on sales_records for update using (auth.uid() = user_id);
create policy "Users can delete own sales records"
  on sales_records for delete using (auth.uid() = user_id);

create index idx_sales_records_user_id on sales_records(user_id);
create index idx_sales_records_herd_group_id on sales_records(herd_group_id);
create index idx_sales_records_sale_date on sales_records(user_id, sale_date desc);

-- ============================================================================
-- 6. YARD BOOK ITEMS
-- ============================================================================
create table yard_book_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  title text not null,
  notes text,
  event_date date not null,
  is_all_day boolean not null default true,
  event_time time,

  category text not null default 'Livestock' check (category in ('Livestock', 'Operations', 'Finance', 'Family', 'Me')),

  is_completed boolean not null default false,
  completed_date timestamptz,

  is_recurring boolean not null default false,
  recurrence_rule text check (recurrence_rule in ('Weekly', 'Fortnightly', 'Monthly', 'Annual')),
  recurrence_interval integer,

  reminder_offsets integer[],
  notifications_scheduled boolean not null default false,

  linked_herd_ids uuid[],
  property_id uuid references properties(id) on delete set null,

  pack_id text,
  pack_item_index integer,

  is_demo_data boolean not null default false,

  linked_muster_record_id uuid,
  linked_health_record_id uuid
);

alter table yard_book_items enable row level security;

create policy "Users can view own yard book items"
  on yard_book_items for select using (auth.uid() = user_id);
create policy "Users can insert own yard book items"
  on yard_book_items for insert with check (auth.uid() = user_id);
create policy "Users can update own yard book items"
  on yard_book_items for update using (auth.uid() = user_id);
create policy "Users can delete own yard book items"
  on yard_book_items for delete using (auth.uid() = user_id);

create index idx_yard_book_items_user_id on yard_book_items(user_id);
create index idx_yard_book_items_event_date on yard_book_items(user_id, event_date);
create index idx_yard_book_items_category on yard_book_items(user_id, category);
create index idx_yard_book_items_property_id on yard_book_items(property_id);

create trigger yard_book_items_updated_at
  before update on yard_book_items
  for each row execute function update_updated_at();

-- ============================================================================
-- 7. KILL SHEET RECORDS
-- ============================================================================
create table kill_sheet_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  processor_name text not null,
  grid_code text,
  kill_date timestamptz not null,
  vendor_code text,
  pic text,
  property_name text,
  booking_reference text,
  booking_type text,
  herd_group_id uuid references herds(id) on delete set null,

  total_head_count integer not null,
  total_body_weight double precision not null,
  total_gross_value double precision not null,
  average_body_weight double precision not null,
  average_price_per_kg double precision not null,
  average_value_per_head double precision not null,
  condemns integer not null default 0,

  -- Complex sub-data stored as JSONB
  category_summaries jsonb not null default '[]'::jsonb,
  grade_distribution jsonb not null default '[]'::jsonb,
  weight_class_distribution jsonb not null default '[]'::jsonb,
  fat_class_distribution jsonb not null default '[]'::jsonb,
  line_items jsonb not null default '[]'::jsonb,

  realisation_factor double precision,
  payment_check_result jsonb,
  source_file_path text,
  notes text
);

alter table kill_sheet_records enable row level security;

create policy "Users can view own kill sheet records"
  on kill_sheet_records for select using (auth.uid() = user_id);
create policy "Users can insert own kill sheet records"
  on kill_sheet_records for insert with check (auth.uid() = user_id);
create policy "Users can update own kill sheet records"
  on kill_sheet_records for update using (auth.uid() = user_id);
create policy "Users can delete own kill sheet records"
  on kill_sheet_records for delete using (auth.uid() = user_id);

create index idx_kill_sheet_records_user_id on kill_sheet_records(user_id);
create index idx_kill_sheet_records_kill_date on kill_sheet_records(user_id, kill_date desc);
create index idx_kill_sheet_records_herd_group_id on kill_sheet_records(herd_group_id);

-- ============================================================================
-- 8. SAVED FREIGHT ESTIMATES
-- ============================================================================
create table saved_freight_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Link to herd (optional — manual estimates have no herd)
  herd_group_id uuid references herds(id) on delete set null,

  -- Estimate inputs
  app_category text not null,
  sex text not null,
  average_weight_kg double precision not null,
  head_count integer not null,
  distance_km double precision not null,
  rate_per_deck_per_km double precision not null,

  -- Resolved category
  freight_category_id text not null,
  freight_category_name text not null,
  capacity_source text not null default 'library',

  -- Results
  heads_per_deck integer not null,
  decks_required integer not null,
  has_partial_deck boolean not null default false,
  spare_spots_on_last_deck integer not null default 0,
  total_cost double precision not null,
  cost_per_head double precision not null,
  cost_per_deck double precision not null,
  cost_per_km double precision not null,

  -- Warnings/notices
  category_warning text,
  breeder_auto_detect_notice text,
  efficiency_prompt text,

  is_custom_job boolean not null default false,
  notes text
);

alter table saved_freight_estimates enable row level security;

create policy "Users can view own freight estimates"
  on saved_freight_estimates for select using (auth.uid() = user_id);
create policy "Users can insert own freight estimates"
  on saved_freight_estimates for insert with check (auth.uid() = user_id);
create policy "Users can update own freight estimates"
  on saved_freight_estimates for update using (auth.uid() = user_id);
create policy "Users can delete own freight estimates"
  on saved_freight_estimates for delete using (auth.uid() = user_id);

create index idx_saved_freight_estimates_user_id on saved_freight_estimates(user_id);
create index idx_saved_freight_estimates_herd_group_id on saved_freight_estimates(herd_group_id);
