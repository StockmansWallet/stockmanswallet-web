// Date helpers anchored to Australia/Sydney.
//
// Stockman's Wallet is an Australian product. All MLA data, dev_updates
// entries, and user-visible period boundaries are anchored to Australia/Sydney.
// Browser + server are not guaranteed to share a timezone (Vercel server TZ
// is UTC by default), so date interpretation must be explicit.
//
// Use:
//  - parseLocalDate / todayLocal: legacy, kept for callers that genuinely want
//    the host machine's local timezone (eg. in the valuation engine for
//    comparing against a user-supplied date field stored as YYYY-MM-DD)
//  - startOfDaySydney / endOfDaySydney: build a UTC Date instant representing
//    00:00:00.000 or 23:59:59.999 Australia/Sydney time on the given date
//  - todaySydney: today's YYYY-MM-DD in Australia/Sydney
//  - formatDateAU: render "20 Apr 2026" from either a YYYY-MM-DD string or an
//    ISO timestamp, interpreted in Australia/Sydney

const SYDNEY_TZ = "Australia/Sydney";

/**
 * Parse a date string as local time.
 *
 * Date-only strings (YYYY-MM-DD) are parsed by JavaScript as UTC midnight,
 * which shifts to the previous day in timezones ahead of UTC. This function
 * detects date-only strings and parses them as local midnight instead.
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
 * Get today's date as YYYY-MM-DD in the host machine's local timezone.
 *
 * Prefer todaySydney() for any user-visible period boundary. Use this only
 * when you specifically want the host's local interpretation (eg. comparing
 * against a form input on the browser).
 */
export function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns the offset in milliseconds between UTC and the given IANA timezone
 * at the moment represented by `at`. Positive when the timezone is ahead of
 * UTC (eg. Australia/Sydney at +10 returns +10 * 3600 * 1000).
 */
function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const lookup = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUTC = Date.UTC(
    lookup("year"),
    lookup("month") - 1,
    lookup("day"),
    lookup("hour") === 24 ? 0 : lookup("hour"),
    lookup("minute"),
    lookup("second"),
  );
  return asUTC - at.getTime();
}

/**
 * UTC Date instant for a specific wall-clock moment in Australia/Sydney.
 *
 * Handles DST correctly by computing the Sydney offset at the target moment.
 */
function sydneyInstant(year: number, month: number, day: number, hour: number, minute: number, second: number, ms: number): Date {
  const assumedUtc = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const offset = tzOffsetMs(new Date(assumedUtc), SYDNEY_TZ);
  return new Date(assumedUtc - offset);
}

/**
 * Start-of-day (00:00:00.000) Australia/Sydney for a YYYY-MM-DD string,
 * returned as a UTC Date instant.
 */
export function startOfDaySydney(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return sydneyInstant(y, m, d, 0, 0, 0, 0);
}

/**
 * End-of-day (23:59:59.999) Australia/Sydney for a YYYY-MM-DD string,
 * returned as a UTC Date instant.
 *
 * Use this for "as-at" valuations so the period-end day is fully counted
 * (DWG accrues through to the end of that local day).
 */
export function endOfDaySydney(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return sydneyInstant(y, m, d, 23, 59, 59, 999);
}

/**
 * Today's date as YYYY-MM-DD in Australia/Sydney.
 */
export function todaySydney(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${lookup("year")}-${lookup("month")}-${lookup("day")}`;
}

/**
 * Format a date input as "20 Apr 2026" in Australia/Sydney.
 *
 * Accepts either a YYYY-MM-DD date string (interpreted as that local Sydney
 * day) or a full ISO timestamp (converted to Sydney). Tolerates Date inputs
 * too for convenience.
 */
export function formatDateAU(input: string | Date): string {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
  }
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
