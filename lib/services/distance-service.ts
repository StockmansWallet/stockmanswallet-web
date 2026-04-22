// Distance calculation service using OSRM (Open Source Routing Machine)
// Returns actual road distances instead of straight-line estimates
// Fallback: haversine x 1.3 if OSRM is unreachable

// OSRM public API - returns real driving distance via OpenStreetMap road data
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export interface RoadDistanceResult {
  distanceKm: number;
  source: "osrm" | "haversine";
}

// Fetch actual road distance between two coordinates via OSRM
// Returns distance in km rounded to nearest integer
export async function getRoadDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<RoadDistanceResult> {
  // Compute the haversine straight-line first so we have a sanity baseline for the
  // OSRM response. Real roads are typically 1.2x-1.6x crow-flies; anything over 1.8x
  // usually indicates a detour (ferry avoidance, off-road gap, bad geocode) that would
  // mislead freight estimates. Matches the iOS MKDirections sanity check.
  const straightLineKm = haversineKmRaw(lat1, lon1, lat2, lon2);
  const haversineRoadEstimate = Math.round(straightLineKm * 1.3);

  try {
    // OSRM expects lon,lat order (not lat,lon)
    const url = `${OSRM_BASE}/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) throw new Error(`OSRM returned ${res.status}`);

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) {
      throw new Error(`OSRM no route: ${data.code}`);
    }

    // OSRM returns distance in metres
    const distanceKm = Math.round(data.routes[0].distance / 1000);

    // Sanity check: if OSRM > 1.8x haversine, the route is likely a detour.
    // Fall back to haversine x 1.3 so downstream freight doesn't double up.
    if (straightLineKm > 0 && distanceKm > straightLineKm * 1.8) {
      return { distanceKm: haversineRoadEstimate, source: "haversine" };
    }

    return { distanceKm, source: "osrm" };
  } catch {
    // Fallback to haversine x 1.3 if OSRM is unreachable
    return { distanceKm: haversineRoadEstimate, source: "haversine" };
  }
}

// Haversine straight-line distance with 1.3x road multiplier (fallback only)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return Math.round(haversineKmRaw(lat1, lon1, lat2, lon2) * 1.3);
}

// Raw haversine great-circle distance (no road multiplier). Used both as the fallback
// baseline and for the OSRM sanity check.
function haversineKmRaw(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Keep the old haversineKm function exported-accessible (used in tests / fallbacks).
export const __haversineKmInternal = haversineKm;
