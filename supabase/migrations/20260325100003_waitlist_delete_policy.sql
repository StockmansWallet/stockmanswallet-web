-- Allow authenticated users to delete from waitlist (admin page, access gated at app level)
create policy "Authenticated users can delete from waitlist"
  on public.waitlist for delete
  to authenticated
  using (true);
