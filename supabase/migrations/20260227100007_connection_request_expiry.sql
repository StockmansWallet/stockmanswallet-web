-- ============================================================================
-- 007: Connection Request Auto-Expiry
-- Approved connection requests have a permission_expires_at timestamp, but
-- the status is never flipped to 'expired' when that time passes. This adds:
-- 1. A function to expire stale requests (callable via RPC)
-- 2. A trigger with recursion guard for self-cleaning
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Function to expire stale connection requests
-- Flips any 'approved' request to 'expired' if permission_expires_at < NOW()
-- Also flips any 'pending' request to 'expired' if created > 3 days ago
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION expire_stale_connection_requests()
RETURNS void AS $$
BEGIN
    -- Expire approved requests past their expiry date
    UPDATE connection_requests
    SET status = 'expired'
    WHERE status = 'approved'
      AND permission_expires_at IS NOT NULL
      AND permission_expires_at < NOW();

    -- Expire pending requests older than 3 days (never acted on)
    UPDATE connection_requests
    SET status = 'expired'
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 2. Trigger with recursion guard
-- pg_trigger_depth() = 1 means we're in the first trigger call.
-- The UPDATEs inside expire_stale_connection_requests() will fire this
-- trigger again, but at depth 2+ we skip, preventing infinite recursion.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_expire_stale_connections()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() = 1 THEN
        PERFORM expire_stale_connection_requests();
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_expire_connections ON connection_requests;
CREATE TRIGGER auto_expire_connections
    AFTER INSERT OR UPDATE ON connection_requests
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_expire_stale_connections();

-- --------------------------------------------------------------------------
-- 3. Run expiry now to clean up any currently stale requests
-- Disable trigger temporarily to avoid recursion during initial cleanup
-- --------------------------------------------------------------------------
ALTER TABLE connection_requests DISABLE TRIGGER auto_expire_connections;
SELECT expire_stale_connection_requests();
ALTER TABLE connection_requests ENABLE TRIGGER auto_expire_connections;

-- --------------------------------------------------------------------------
-- 4. Grant RPC access so the app can call this function directly if needed
-- Usage from app: supabase.rpc("expire_stale_connection_requests")
-- --------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION expire_stale_connection_requests() TO anon;
GRANT EXECUTE ON FUNCTION expire_stale_connection_requests() TO authenticated;
