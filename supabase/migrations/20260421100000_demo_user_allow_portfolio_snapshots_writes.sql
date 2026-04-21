-- Allow the demo user to write portfolio_snapshots for their own account.
--
-- Rationale: portfolio_snapshots is a derived cache of the user's own
-- portfolio value over time. The demo user is read-only on source data
-- (herds, properties, sales_records, etc.) but needs to write derived cache
-- rows so the dashboard chart populates on first visit via the existing
-- backfill logic in app/(app)/dashboard/page.tsx. No shared state is mutated,
-- and the existing "Users can *" policies already scope writes to auth.uid() = user_id.
DROP POLICY IF EXISTS demo_readonly_block_insert ON public.portfolio_snapshots;
DROP POLICY IF EXISTS demo_readonly_block_update ON public.portfolio_snapshots;
DROP POLICY IF EXISTS demo_readonly_block_delete ON public.portfolio_snapshots;
