-- Stockman's Wallet — Advisor-Farmer Connection Schema
-- Creates user_profiles (discoverable directory) and connection_requests (access flow)

-- Enable pg_trgm for fuzzy search indexes
create extension if not exists pg_trgm;

-- ============================================================
-- 1. USER PROFILES — Discoverable user directory
-- ============================================================

create table if not exists user_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    display_name text not null,
    company_name text,
    property_name text,
    property_pic text,
    state text default 'QLD',
    region text,
    role text not null,
    is_discoverable boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    constraint user_profiles_user_id_unique unique (user_id)
);

-- Partial index for discoverable farmer lookups
create index if not exists idx_user_profiles_discoverable
    on user_profiles (is_discoverable, role)
    where is_discoverable = true;

-- Trigram indexes for fuzzy name/property search
create index if not exists idx_user_profiles_display_name
    on user_profiles using gin (display_name gin_trgm_ops);

create index if not exists idx_user_profiles_property_name
    on user_profiles using gin (property_name gin_trgm_ops);

-- RLS
alter table user_profiles enable row level security;

create policy "Read discoverable profiles or own"
    on user_profiles for select
    using (is_discoverable = true or user_id = auth.uid());

create policy "Insert own profile"
    on user_profiles for insert
    with check (user_id = auth.uid());

create policy "Update own profile"
    on user_profiles for update
    using (user_id = auth.uid());

-- Auto-update updated_at
create or replace function update_user_profiles_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger user_profiles_updated_at
    before update on user_profiles
    for each row execute function update_user_profiles_updated_at();


-- ============================================================
-- 2. CONNECTION REQUESTS — Advisor-to-farmer access requests
-- ============================================================

create table if not exists connection_requests (
    id uuid primary key default gen_random_uuid(),
    requester_user_id uuid references auth.users(id) not null,
    target_user_id uuid references auth.users(id) not null,
    requester_name text not null,
    requester_role text not null,
    requester_company text,
    status text default 'pending' not null,
    permission_granted_at timestamptz,
    permission_expires_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    constraint valid_status check (status in ('pending', 'approved', 'denied', 'expired'))
);

create index if not exists idx_connection_requests_target
    on connection_requests (target_user_id, status);

create index if not exists idx_connection_requests_requester
    on connection_requests (requester_user_id, status);

-- RLS
alter table connection_requests enable row level security;

create policy "Read own requests (sent or received)"
    on connection_requests for select
    using (requester_user_id = auth.uid() or target_user_id = auth.uid());

create policy "Insert own requests"
    on connection_requests for insert
    with check (requester_user_id = auth.uid());

create policy "Update requests targeting self"
    on connection_requests for update
    using (target_user_id = auth.uid());

-- Auto-update updated_at
create or replace function update_connection_requests_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger connection_requests_updated_at
    before update on connection_requests
    for each row execute function update_connection_requests_updated_at();
