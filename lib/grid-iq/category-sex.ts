// Sex derivation for Grid IQ kill sheet rows and consignment allocations.
// Single source of truth so extraction, engine, and UI banners agree.

export type Sex = "Male" | "Female" | "Unknown";

export function deriveSexFromCategory(category: string | null | undefined): Sex {
  if (!category) return "Unknown";
  const c = category.toLowerCase();
  if (c.includes("heifer") || c.includes("cow")) return "Female";
  if (c.includes("steer") || c.includes("bull") || c.includes("ox")) return "Male";
  return "Unknown";
}

// Herd.sex is stored as "Male"/"Female" in the iOS model but callers occasionally
// pass lowercase or a category string. Normalise so the filter is robust.
export function normaliseHerdSex(sex: string | null | undefined): Sex {
  if (!sex) return "Unknown";
  const s = sex.toLowerCase();
  if (s.startsWith("m")) return "Male";
  if (s.startsWith("f")) return "Female";
  return deriveSexFromCategory(sex);
}
