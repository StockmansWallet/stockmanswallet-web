// Admin email whitelist - shared across admin pages and settings.
// Real admin users only. Test accounts must not appear here (they would
// give a non-employee access to the admin surface).
export const ADMIN_EMAILS = [
  "leon@stockmanswallet.com.au",
  "mil@stockmanswallet.com.au",
  "luke@stockmanswallet.com.au",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.includes(email ?? "");
}
