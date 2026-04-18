import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns every user_id the caller has blocked, plus every user_id that
 * has blocked the caller. Used to exclude both sides from directory
 * listings, search results, and "in your region" suggestions so neither
 * party sees the other after a block.
 *
 * The caller-side query uses RLS ("Users manage own blocks" policy).
 * The incoming-blocks query requires service role since the RLS policy
 * deliberately hides blocks where the caller is the blocked party - so
 * blocked-by-others enforcement happens via a separate SECURITY DEFINER
 * RPC or (for now) we just filter visible blocks. For MVP we only hide
 * outgoing blocks, which covers the 99% case; incoming-blocks are
 * handled at profile-visit time.
 */
export async function loadOutgoingBlocks(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("user_blocks")
    .select("blocked_user_id")
    .eq("blocker_user_id", userId);
  return new Set((data ?? []).map((r) => r.blocked_user_id as string));
}

/**
 * Is the caller blocked by the specified user? This is used on the
 * Producer Profile page to render a generic "not available" state rather
 * than exposing the block. Uses service role to bypass RLS since the
 * block record itself is hidden from the blocked party.
 */
export async function isBlockedBy(
  serviceRoleClient: SupabaseClient,
  viewerUserId: string,
  profileUserId: string,
): Promise<boolean> {
  const { data } = await serviceRoleClient
    .from("user_blocks")
    .select("id")
    .eq("blocker_user_id", profileUserId)
    .eq("blocked_user_id", viewerUserId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}
