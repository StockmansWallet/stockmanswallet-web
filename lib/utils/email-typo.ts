// Suggests a corrected email domain when the user has typo'd a common one,
// e.g. `leon@bipond.com` -> `leon@bigpond.com`, `jo@gmai.con` -> `jo@gmail.com`.
//
// Why this exists: an audit of unconfirmed signups found that 100% of
// recently-stuck accounts were typo'd email domains. The verification email
// bounces silently at SMTP and the user thinks the system is broken. Catching
// the typo on the form prevents the bounce in the first place.
//
// We only suggest, never enforce. A user with a genuinely unusual domain
// (e.g. their farm's hosted email) should still be able to submit.

// Common AU + global personal-email domains. Producers skew older and AU,
// hence the heavy Telstra/Optus/iiNet weighting alongside the global majors.
const COMMON_DOMAINS = [
  // Australian ISPs / consumer
  "bigpond.com",
  "bigpond.net.au",
  "optusnet.com.au",
  "iinet.net.au",
  "tpg.com.au",
  "internode.on.net",
  "dodo.com.au",
  "exemail.com.au",
  "westnet.com.au",
  // Global consumer
  "gmail.com",
  "yahoo.com",
  "yahoo.com.au",
  "hotmail.com",
  "hotmail.com.au",
  "outlook.com",
  "outlook.com.au",
  "live.com",
  "live.com.au",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "msn.com",
  "protonmail.com",
  "proton.me",
] as const;

/**
 * Levenshtein distance between two strings.
 * Cheap iterative DP, allocates one row at a time.
 */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

/**
 * If the email's domain looks like a typo of a common one, return the
 * corrected email. Otherwise return null.
 *
 * Behaviour:
 * - Exact-match domains return null (no suggestion needed).
 * - Domains within Levenshtein distance 2 of a common domain return the
 *   suggestion. Distance 2 catches single-char typos like "gmai.com" and
 *   transpositions like "gnail.com", but not fundamentally different
 *   domains like "leon@redriver.farm".
 * - Very short domains (< 5 chars) skip suggestion to avoid noisy hits.
 */
export function suggestEmailCorrection(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex <= 0 || atIndex >= trimmed.length - 1) return null;

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  if (domain.length < 5) return null;
  if ((COMMON_DOMAINS as readonly string[]).includes(domain)) return null;

  let bestDomain: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of COMMON_DOMAINS) {
    const d = distance(domain, candidate);
    if (d < bestDistance) {
      bestDistance = d;
      bestDomain = candidate;
    }
  }

  if (bestDomain && bestDistance > 0 && bestDistance <= 2) {
    return `${local}@${bestDomain}`;
  }
  return null;
}
