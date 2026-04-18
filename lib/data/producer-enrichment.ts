import type { SupabaseClient } from "@supabase/supabase-js";

export type PrimarySpecies = "Cattle" | "Sheep" | "Pig" | "Goat";
export type HerdSizeBucket = "small" | "medium" | "large";

export interface ProducerEnrichment {
  primary_species: PrimarySpecies | null;
  total_head: number;
  herd_size_bucket: HerdSizeBucket | null;
  property_count: number;
}

const SPECIES_VALUES: readonly PrimarySpecies[] = ["Cattle", "Sheep", "Pig", "Goat"];

function bucketFor(totalHead: number): HerdSizeBucket | null {
  if (totalHead <= 0) return null;
  if (totalHead < 100) return "small";
  if (totalHead < 1000) return "medium";
  return "large";
}

/**
 * Fetch species + herd-size + property-count for a set of producers in
 * two batched queries. Returns a map keyed by user_id. Caller applies any
 * display or filter logic against the returned map.
 */
export async function enrichProducers(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, ProducerEnrichment>> {
  const result = new Map<string, ProducerEnrichment>();
  if (userIds.length === 0) return result;

  // Seed every user so the caller can trust .get() returns a row.
  for (const id of userIds) {
    result.set(id, {
      primary_species: null,
      total_head: 0,
      herd_size_bucket: null,
      property_count: 0,
    });
  }

  // Pull only the columns we actually aggregate on to keep the payload small.
  const [{ data: herds }, { data: properties }] = await Promise.all([
    supabase
      .from("herds")
      .select("user_id, species, head_count")
      .in("user_id", userIds)
      .eq("is_deleted", false)
      .eq("is_sold", false)
      .neq("is_demo_data", true),
    supabase
      .from("properties")
      .select("user_id")
      .in("user_id", userIds)
      .eq("is_deleted", false)
      .eq("is_simulated", false),
  ]);

  // Per-user: tally head_count by species and pick the species with the most.
  const perUserSpeciesHead = new Map<string, Map<PrimarySpecies, number>>();
  for (const h of (herds ?? []) as Array<{ user_id: string; species: string; head_count: number | null }>) {
    if (!SPECIES_VALUES.includes(h.species as PrimarySpecies)) continue;
    const species = h.species as PrimarySpecies;
    const head = h.head_count ?? 0;
    let speciesMap = perUserSpeciesHead.get(h.user_id);
    if (!speciesMap) {
      speciesMap = new Map();
      perUserSpeciesHead.set(h.user_id, speciesMap);
    }
    speciesMap.set(species, (speciesMap.get(species) ?? 0) + head);
  }

  for (const [userId, speciesMap] of perUserSpeciesHead) {
    let primary: PrimarySpecies | null = null;
    let primaryHead = -1;
    let totalHead = 0;
    for (const [species, head] of speciesMap) {
      totalHead += head;
      if (head > primaryHead) {
        primary = species;
        primaryHead = head;
      }
    }
    const existing = result.get(userId);
    if (existing) {
      existing.primary_species = primary;
      existing.total_head = totalHead;
      existing.herd_size_bucket = bucketFor(totalHead);
    }
  }

  const propertyCounts = new Map<string, number>();
  for (const p of (properties ?? []) as Array<{ user_id: string }>) {
    propertyCounts.set(p.user_id, (propertyCounts.get(p.user_id) ?? 0) + 1);
  }
  for (const [userId, count] of propertyCounts) {
    const existing = result.get(userId);
    if (existing) existing.property_count = count;
  }

  return result;
}
