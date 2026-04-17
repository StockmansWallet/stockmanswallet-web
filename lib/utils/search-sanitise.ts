/**
 * Produces a PostgREST `.or()`-safe search fragment.
 *
 * PostgREST's filter syntax uses commas, parentheses, periods, and asterisks
 * as delimiters inside `.or()` strings. Interpolating raw user input into
 * `display_name.ilike.%${query}%` lets a caller escape the clause and append
 * their own filters (e.g. `.eq.`, `.is.null`) to enumerate data beyond the
 * intended ilike. This helper strips everything that could break the grammar
 * while preserving common name characters.
 *
 * Returns `null` if the input is empty after sanitising.
 */
export function sanitiseSearchQuery(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Keep letters, numbers, whitespace, hyphen, apostrophe, ampersand.
  // Drop commas, periods, parens, asterisks, percent, underscore, backslash, etc.
  const cleaned = raw.replace(/[^\p{L}\p{N}\s'&-]/gu, "").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 100);
}
