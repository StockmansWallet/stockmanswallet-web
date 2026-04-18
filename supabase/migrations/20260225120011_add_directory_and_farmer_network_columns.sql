-- Stockman's Wallet — Directory & Farmer Network Schema Additions
-- Adds columns to user_profiles for:
--   1. Advisor directory listing (is_listed_in_directory, contact details, bio)
--   2. Farmer-to-farmer discovery (is_discoverable_to_farmers)
-- Updates RLS policy to allow reading directory-listed and farmer-discoverable profiles

-- ============================================================
-- 1. NEW COLUMNS — Advisor directory listing
-- ============================================================

-- Debug: When true, advisor appears in the farmer-side Advisor Directory
alter table user_profiles
    add column if not exists is_listed_in_directory boolean default false;

-- Debug: Public contact email shown in directory/network profiles
alter table user_profiles
    add column if not exists contact_email text;

-- Debug: Public contact phone shown in directory/network profiles
alter table user_profiles
    add column if not exists contact_phone text;

-- Debug: Short bio/description shown in directory/network profiles
alter table user_profiles
    add column if not exists bio text;

-- ============================================================
-- 2. NEW COLUMN — Farmer-to-farmer discovery
-- ============================================================

-- Debug: When true, other farmers can find this farmer via Farmer Network
alter table user_profiles
    add column if not exists is_discoverable_to_farmers boolean default false;

-- ============================================================
-- 3. INDEXES — Directory and farmer network lookups
-- ============================================================

-- Partial index for directory-listed advisor lookups
create index if not exists idx_user_profiles_directory_listed
    on user_profiles (is_listed_in_directory, role)
    where is_listed_in_directory = true;

-- Partial index for farmer-to-farmer discoverable lookups
create index if not exists idx_user_profiles_discoverable_to_farmers
    on user_profiles (is_discoverable_to_farmers, role)
    where is_discoverable_to_farmers = true;

-- Trigram index on company_name for advisor directory search
create index if not exists idx_user_profiles_company_name
    on user_profiles using gin (company_name gin_trgm_ops);

-- ============================================================
-- 4. RLS POLICY UPDATE — Allow reading directory-listed and farmer-discoverable profiles
-- ============================================================

-- Drop the existing read policy and replace with an expanded one
-- Original: only is_discoverable or own profile
-- New: is_discoverable OR is_listed_in_directory OR is_discoverable_to_farmers OR own profile
drop policy if exists "Read discoverable profiles or own" on user_profiles;

create policy "Read discoverable profiles or own"
    on user_profiles for select
    using (
        is_discoverable = true
        or is_listed_in_directory = true
        or is_discoverable_to_farmers = true
        or user_id = auth.uid()
    );
