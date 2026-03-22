/**
 * Parse a date string as local time.
 *
 * Date-only strings (YYYY-MM-DD) are parsed by JavaScript as UTC midnight,
 * which shifts to the previous day in timezones ahead of UTC (e.g. Australia
 * UTC+10/11). This function detects date-only strings and parses them as
 * local midnight instead.
 *
 * Full ISO timestamps (with T or Z) are passed through to new Date() as-is
 * since they already contain timezone information.
 */
export function parseLocalDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

/**
 * Get today's date as a YYYY-MM-DD string in local time.
 *
 * Using new Date().toISOString().split("T")[0] returns the UTC date,
 * which can be yesterday in UTC+ timezones after midnight local time.
 */
export function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
