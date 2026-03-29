-- RPC: get_client_herds_for_advisor
-- Allows an advisor to securely fetch a connected client's herds.
-- SECURITY DEFINER bypasses RLS; permission is verified inside the function.
-- Used by both iOS (Supabase Swift SDK) and web (server actions).

CREATE OR REPLACE FUNCTION get_client_herds_for_advisor(p_client_user_id UUID)
RETURNS SETOF herds
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the caller has an approved connection with data access granted
  IF NOT EXISTS (
    SELECT 1 FROM connection_requests
    WHERE requester_user_id = auth.uid()
      AND target_user_id = p_client_user_id
      AND status = 'approved'
      AND permission_granted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'No active permission for this client';
  END IF;

  RETURN QUERY
  SELECT * FROM herds
  WHERE user_id = p_client_user_id::text
    AND is_deleted = false
    AND (is_demo_data IS NULL OR is_demo_data = false)
  ORDER BY name;
END;
$$;
