-- Fix get_advisor_connections RPC to support bidirectional connections.
-- Previously only returned connections where the advisor was the requester.
-- Now also returns farmer-initiated connections where the advisor is the target.
-- Uses CASE to resolve the "client" (the other party) regardless of direction.
CREATE OR REPLACE FUNCTION get_advisor_connections()
RETURNS TABLE (
    connection_id uuid,
    target_user_id uuid,
    status text,
    permission_granted_at timestamptz,
    connection_type text,
    sharing_permissions jsonb,
    created_at timestamptz,
    client_display_name text,
    client_company_name text,
    client_state text,
    client_region text,
    client_property_name text,
    client_lga text
) AS $$
DECLARE
    v_client_id uuid;
BEGIN
    RETURN QUERY
    SELECT
        cr.id,
        -- Return the other party's user_id as "target_user_id" for backward compat
        CASE WHEN cr.requester_user_id = auth.uid()
             THEN cr.target_user_id
             ELSE cr.requester_user_id
        END,
        cr.status,
        cr.permission_granted_at,
        cr.connection_type,
        cr.sharing_permissions,
        cr.created_at,
        up.display_name,
        up.company_name,
        up.state,
        up.region,
        p.property_name,
        p.lga
    FROM connection_requests cr
    LEFT JOIN user_profiles up
        ON up.user_id = CASE WHEN cr.requester_user_id = auth.uid()
                             THEN cr.target_user_id
                             ELSE cr.requester_user_id
                        END
    LEFT JOIN properties p
        ON p.user_id = CASE WHEN cr.requester_user_id = auth.uid()
                            THEN cr.target_user_id
                            ELSE cr.requester_user_id
                       END
        AND p.is_default = true
        AND p.is_deleted = false
    WHERE (cr.requester_user_id = auth.uid() OR cr.target_user_id = auth.uid())
      AND cr.status IN ('pending', 'approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
