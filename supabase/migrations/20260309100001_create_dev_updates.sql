-- Dev updates table for the Changelog admin page
create table if not exists dev_updates (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('ios', 'web')),
  date date not null,
  build_label text,
  title text not null,
  summary text not null,
  detail text,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table dev_updates enable row level security;

create policy "Authenticated users can read dev_updates"
  on dev_updates for select to authenticated using (true);

create index if not exists idx_dev_updates_date on dev_updates (date desc, platform, sort_order);
