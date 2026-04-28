import { saleyardCoordinates, saleyardToState, saleyards, resolveMLASaleyardName } from "./reference-data";

/**
 * Haversine formula for distance between two coordinates in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the nearest saleyards to a given saleyard within the same state.
 * Uses Haversine distance. Returns sorted by proximity (closest first).
 * Used by the fallback decision tree when primary saleyard has no data.
 */
export function nearestSaleyards(
  saleyard: string,
  state: string,
  limit: number = 3
): string[] {
  const sourceCoords = saleyardCoordinates[saleyard];
  if (!sourceCoords) return [];

  // Find all other saleyards in the same state with coordinates
  const distances: { name: string; distance: number }[] = [];
  for (const [name, coords] of Object.entries(saleyardCoordinates)) {
    if (name === saleyard) continue;
    if (saleyardToState[name] !== state) continue;
    const dist = haversineDistance(
      sourceCoords.lat,
      sourceCoords.lon,
      coords.lat,
      coords.lon
    );
    distances.push({ name, distance: dist });
  }

  // Sort by distance, return closest N
  return distances
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((d) => d.name);
}

/**
 * Returns up to `limit` saleyards closest to a property, using coordinates
 * when available and falling back to state match. Returns an empty array if
 * the property has neither coordinates nor a state.
 */
export function closestSaleyardsToProperty(
  property: { latitude?: number | null; longitude?: number | null; state?: string | null } | null | undefined,
  limit: number = 3
): string[] {
  if (!property) return [];
  if (property.latitude != null && property.longitude != null) {
    const distances = saleyards
      .filter((s) => saleyardCoordinates[s])
      .map((s) => ({
        name: s,
        dist: haversineDistance(
          property.latitude!,
          property.longitude!,
          saleyardCoordinates[s].lat,
          saleyardCoordinates[s].lon
        ),
      }))
      .sort((a, b) => a.dist - b.dist);
    return distances.slice(0, limit).map((d) => d.name);
  }
  if (property.state) {
    return saleyards.filter((s) => saleyardToState[s] === property.state).slice(0, limit);
  }
  return [];
}

/**
 * Expands a list of saleyard names to include their nearest neighbours.
 * Used to prefetch fallback prices so the valuation engine can resolve
 * nearby saleyards without additional Supabase calls.
 *
 * Inputs are normalised to canonical MLA full names so callers can pass
 * either short aliases ("Charters Towers") or full names ("Charters Towers
 * Dalrymple Saleyards") interchangeably. saleyardToState and nearestSaleyards
 * are keyed on full names only - without normalisation a short-alias input
 * silently expanded to nothing, and any downstream .in("saleyard", ...)
 * query missed every row in category_prices because Supabase stores the
 * full names. This produced "$4.473/kg breed-adj" national-fallback values
 * for users whose herds were stored with short-alias saleyards.
 */
export function expandWithNearbySaleyards(
  saleyards: string[],
  limit: number = 3
): string[] {
  const normalised = saleyards
    .map((s) => resolveMLASaleyardName(s))
    .filter((s) => s.length > 0);
  const expanded = new Set(normalised);
  for (const sy of normalised) {
    const state = saleyardToState[sy];
    if (!state) continue;
    for (const nearby of nearestSaleyards(sy, state, limit)) {
      expanded.add(nearby);
    }
  }
  return [...expanded];
}
