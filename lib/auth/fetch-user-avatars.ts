import "server-only";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Batch-fetches avatar URLs for the given user ids and returns them as a
// Map keyed by user_id. Uses the service role client because
// auth.users.user_metadata isn't exposed to RLS-scoped callers. Requests
// are parallelised with Promise.all; typical use cases (a handful of
// chat participants, a page of directory rows) stay well under any
// realistic rate limit.
//
// Returns an empty map when the service role key isn't configured so
// callers don't have to branch on that at every call site.
export async function fetchUserAvatars(userIds: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl || userIds.length === 0) return result;

  const unique = Array.from(new Set(userIds));
  const svc = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  await Promise.all(
    unique.map(async (id) => {
      try {
        const { data } = await svc.auth.admin.getUserById(id);
        const url = data?.user?.user_metadata?.avatar_url;
        result.set(id, typeof url === "string" ? url : null);
      } catch {
        result.set(id, null);
      }
    }),
  );

  return result;
}
