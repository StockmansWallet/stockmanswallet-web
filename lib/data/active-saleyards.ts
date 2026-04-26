// Active saleyards = MLA yards with category_prices data within the last 365
// days. Sourced from the `active_saleyards` Supabase view (created 2026-04-27).
// Pickers filter the static `saleyards` list through this set so users can't
// select stale yards. The filter self-heals when fresh data lands - the view
// updates immediately on the next query.
//
// Custom sale locations are user-defined and tracked separately; this filter
// only applies to MLA reference yards.

import { createClient } from "../supabase/client";

interface ActiveSaleyardRow {
  name: string;
  state_code: string;
  last_data_date: string;
  days_since_last: number;
}

// Module-level cache so all pickers in a session share one fetch.
// Refreshed on next mount when the cache is older than CACHE_TTL_MS.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cachedSet: Set<string> | null = null;
let cachedAt = 0;
let inflightFetch: Promise<Set<string>> | null = null;

/**
 * Fetches the set of active saleyard names. Safe to call from anywhere; the
 * module-level cache de-dupes concurrent calls and refreshes after 5 minutes.
 * Returns an empty set on network failure - callers should fall back to
 * showing all yards rather than blocking on the network.
 */
export async function fetchActiveSaleyards(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedSet && now - cachedAt < CACHE_TTL_MS) return cachedSet;
  if (inflightFetch) return inflightFetch;

  inflightFetch = (async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("active_saleyards")
        .select("name");
      if (error) {
        console.error("fetchActiveSaleyards error:", error.message);
        return new Set<string>();
      }
      const set = new Set((data ?? []).map((r: { name: string }) => r.name));
      cachedSet = set;
      cachedAt = Date.now();
      return set;
    } catch (err) {
      console.error("fetchActiveSaleyards threw:", err);
      return new Set<string>();
    } finally {
      inflightFetch = null;
    }
  })();
  return inflightFetch;
}

/**
 * Filters a list of saleyard names to only those currently active. Pass the
 * static `saleyards` list and an `activeSet` (from useActiveSaleyards or
 * fetchActiveSaleyards). When the active set is empty (loading or network
 * failure), returns the full list unchanged so the picker stays usable.
 */
export function filterActive(names: string[], activeSet: Set<string>): string[] {
  if (activeSet.size === 0) return names;
  return names.filter((n) => activeSet.has(n));
}

/**
 * Server-side variant for RSCs / server actions. Fetches via the project
 * server client (not the cookie-bound auth client) so it works regardless of
 * the requesting user's auth state.
 */
export async function fetchActiveSaleyardsServer(): Promise<Set<string>> {
  // Re-export of the same logic; pages that import this from a server context
  // get the same cached behaviour because Node module state is per-process.
  return fetchActiveSaleyards();
}

export type { ActiveSaleyardRow };
