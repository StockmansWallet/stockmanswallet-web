-- Waitlist signups with extended profile info
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  name       text,
  role       text check (role in ('producer', 'advisor', 'other')),
  postcode   text,
  herd_size  text check (herd_size in ('under_50', '50_500', '500_2000', '2000_plus')),
  property_count text check (property_count in ('1', '2_plus')),
  created_at timestamptz not null default now(),

  constraint waitlist_email_unique unique (email)
);

-- Allow anonymous inserts (public landing page, no auth)
alter table public.waitlist enable row level security;

create policy "Anyone can insert into waitlist"
  on public.waitlist for insert
  to anon
  with check (true);

-- Only service role can read/update/delete
create policy "Service role full access to waitlist"
  on public.waitlist for all
  to service_role
  using (true)
  with check (true);
