import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectionRequest } from "@/lib/types/advisory";

interface PermissionResult {
  hasPermission: boolean;
  connection: ConnectionRequest | null;
  expiresAt: Date | null;
}

/**
 * Check if an advisor has active permission to view a client's data.
 * Returns the connection and expiry info.
 */
export async function checkAdvisorPermission(
  supabase: SupabaseClient,
  advisorUserId: string,
  clientUserId: string
): Promise<PermissionResult> {
  const { data } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("requester_user_id", advisorUserId)
    .eq("target_user_id", clientUserId)
    .eq("status", "approved")
    .single();

  if (!data) {
    return { hasPermission: false, connection: null, expiresAt: null };
  }

  const connection = data as ConnectionRequest;
  // Open-ended access: permission is active if granted (no expiry check)
  const hasPermission = connection.permission_granted_at != null;

  return { hasPermission, connection, expiresAt: null };
}
