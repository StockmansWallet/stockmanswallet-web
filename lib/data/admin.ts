import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin access is now backed by user_profiles.is_admin. The column is
 * set only by service role (enforced by a trigger on user_profiles) so
 * a user cannot self-promote by updating their own row.
 *
 * Returns false if the lookup fails for any reason, so a DB hiccup
 * can't accidentally open the admin surface.
 */
export async function isAdminUser(
  supabase: SupabaseClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.is_admin === true;
}
