import { createClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client authenticated with the service-role key.
 *
 * Use this only for admin and advisor flows where the caller's identity has
 * already been verified at the app layer (e.g. `isAdminUser` or an approved
 * advisor connection). Bypasses RLS entirely.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
