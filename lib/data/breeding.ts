import { parseLocalDate } from "@/lib/dates";

/**
 * Derives the effective joined date for a breeder herd.
 *
 * Priority (mirrors iOS Herd.effectiveJoinedDate):
 *   1. Explicit joined_date (stored midpoint from add/edit flows)
 *   2. Midpoint of joining_period_start and joining_period_end (AI/controlled)
 *   3. Herd creation date (uncontrolled breeding, accrual starts from creation)
 *   4. joining_period_start alone (partial data fallback)
 *   5. null (no breeding date data available)
 */
export function getEffectiveJoinedDate(herd: {
  joined_date: string | null;
  joining_period_start: string | null;
  joining_period_end: string | null;
  breeding_program_type?: string | null;
  created_at?: string;
}): Date | null {
  if (herd.joined_date) return parseLocalDate(herd.joined_date);

  if (herd.joining_period_start && herd.joining_period_end) {
    const start = parseLocalDate(herd.joining_period_start).getTime();
    const end = parseLocalDate(herd.joining_period_end).getTime();
    // Normalize midpoint to local midnight so daysBetween counts full days
    const mid = new Date((start + end) / 2);
    return new Date(mid.getFullYear(), mid.getMonth(), mid.getDate());
  }

  if (
    herd.created_at &&
    (herd.breeding_program_type === "uncontrolled" ||
      herd.breeding_program_type === "uncontrolled_breeding")
  ) {
    return new Date(herd.created_at);
  }

  if (herd.joining_period_start) return parseLocalDate(herd.joining_period_start);

  return null;
}
