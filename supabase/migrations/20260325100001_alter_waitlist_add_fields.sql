-- Add extended profile columns to existing waitlist table
alter table public.waitlist add column if not exists name text;
alter table public.waitlist add column if not exists role text check (role in ('producer', 'advisor', 'other'));
alter table public.waitlist add column if not exists postcode text;
alter table public.waitlist add column if not exists herd_size text check (herd_size in ('under_50', '50_500', '500_2000', '2000_plus'));
alter table public.waitlist add column if not exists property_count text check (property_count in ('1', '2_plus'));
