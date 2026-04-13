import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectionRequest } from "@/lib/types/advisory";

interface PermissionResult {
  hasPermission: boolean;
  connection: ConnectionRequest | null;
  expiresAt: Date | null;
}

/**
 * Check if an advisor has active permission to view a client's data.
 * Handles both directions: advisor-initiated and producer-initiated connections.
 */
export async function checkAdvisorPermission(
  supabase: SupabaseClient,
  advisorUserId: string,
  clientUserId: string
): Promise<PermissionResult> {
  const { data } = await supabase
    .from("connection_requests")
    .select("*")
    .or(
      `and(requester_user_id.eq.${advisorUserId},target_user_id.eq.${clientUserId}),and(requester_user_id.eq.${clientUserId},target_user_id.eq.${advisorUserId})`
    )
    .eq("status", "approved")
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { hasPermission: false, connection: null, expiresAt: null };
  }

  const connection = data as ConnectionRequest;
  const hasPermission = connection.permission_granted_at != null;

  return { hasPermission, connection, expiresAt: null };
}
