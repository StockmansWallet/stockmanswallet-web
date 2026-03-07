// Admin email whitelist - shared across admin pages and settings
export const ADMIN_EMAILS = [
  "leon@stockmanswallet.com.au",
  "mil@stockmanswallet.com.au",
  "luke@stockmanswallet.com.au",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.includes(email ?? "");
}
