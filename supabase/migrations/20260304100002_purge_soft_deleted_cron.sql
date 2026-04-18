-- ============================================================================
-- Purge Soft-Deleted Sync Records
-- Runs daily at 3am UTC. Hard-deletes records where is_deleted = true
-- and deleted_at is more than 30 days ago.
--
-- Requires pg_cron extension (enabled by default on Supabase Pro plans).
-- ============================================================================

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing job if re-running migration
SELECT cron.unschedule('purge-soft-deleted-sync-records')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'purge-soft-deleted-sync-records'
);

-- Schedule daily purge at 3am UTC
SELECT cron.schedule(
    'purge-soft-deleted-sync-records',
    '0 3 * * *',
    $$
      DELETE FROM grid_iq_analyses     WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM kill_sheet_records    WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM sales_records         WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM health_records        WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM muster_records        WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM yard_book_items       WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM herds           WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM properties            WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM processor_grids       WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM saved_freight_estimates WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM custom_sale_locations WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
    $$
);
