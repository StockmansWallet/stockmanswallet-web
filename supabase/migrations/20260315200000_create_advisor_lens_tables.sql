-- Advisor Lens: private valuation overlays per client connection
create table if not exists advisor_lenses (
  id uuid primary key default gen_random_uuid(),
  client_connection_id uuid not null references connection_requests(id) on delete cascade,
  is_active boolean not null default true,
  shading_percentage double precision not null default 100.0,
  breed_premium_override double precision,
  adwg_override double precision,
  calving_rate_override double precision,
  mortality_rate_override double precision,
  head_count_adjustment integer,
  advisor_notes text,
  active_scenario_id uuid,
  cached_baseline_value double precision,
  cached_advisor_value double precision,
  cached_shaded_value double precision,
  last_calculated_date timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_advisor_lenses_connection on advisor_lenses(client_connection_id);

-- Advisor Scenarios: named assumption sets linked to a client connection
create table if not exists advisor_scenarios (
  id uuid primary key default gen_random_uuid(),
  client_connection_id uuid not null references connection_requests(id) on delete cascade,
  name text not null,
  scenario_type text not null default 'custom',
  notes text,
  is_locked boolean not null default false,
  locked_date timestamptz,
  locked_by_name text,
  breed_premium_override double precision,
  adwg_override double precision,
  calving_rate_override double precision,
  mortality_rate_override double precision,
  head_count_adjustment integer,
  shading_percentage double precision not null default 100.0,
  cached_advisor_value double precision,
  cached_shaded_value double precision,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_advisor_scenarios_connection on advisor_scenarios(client_connection_id);

-- Add foreign key from lens to active scenario
alter table advisor_lenses
  add constraint fk_active_scenario
  foreign key (active_scenario_id)
  references advisor_scenarios(id)
  on delete set null;

-- RLS: Only the advisor (requester) on the connection can access their lenses and scenarios
alter table advisor_lenses enable row level security;
alter table advisor_scenarios enable row level security;

create policy "Advisors can manage their own lenses"
  on advisor_lenses for all
  using (
    client_connection_id in (
      select id from connection_requests where requester_user_id = auth.uid()
    )
  );

create policy "Advisors can manage their own scenarios"
  on advisor_scenarios for all
  using (
    client_connection_id in (
      select id from connection_requests where requester_user_id = auth.uid()
    )
  );
