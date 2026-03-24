-- Allow authenticated users to read waitlist (admin page access is gated at app level)
create policy "Authenticated users can read waitlist"
  on public.waitlist for select
  to authenticated
  using (true);
