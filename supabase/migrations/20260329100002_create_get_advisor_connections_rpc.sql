-- RPC function: returns an advisor's connections with client profile + property LGA.
-- SECURITY DEFINER bypasses RLS so advisors can read client property data.
-- Used by both the web advisor dashboard and the iOS advisor sync.
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
BEGIN
    RETURN QUERY
    SELECT
        cr.id,
        cr.target_user_id,
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
    LEFT JOIN user_profiles up ON up.user_id = cr.target_user_id
    LEFT JOIN properties p ON p.user_id = cr.target_user_id
        AND p.is_default = true
        AND p.is_deleted = false
    WHERE cr.requester_user_id = auth.uid()
      AND cr.status IN ('pending', 'approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
