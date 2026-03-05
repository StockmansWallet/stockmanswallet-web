# Build Summaries

## Session 5 - 5 Mar 2026

### Summary

Major UI/UX overhaul, herd valuation engine, property grouping, and critical bug fixes for CRUD operations and iOS sync compatibility.

### What's New

**Premium UI redesign** - Complete visual refresh across the entire web app. The herds page was redesigned first with stat cards, species pill filters, sortable bespoke table, and responsive column hiding. Then the same premium treatment was applied to all other pages: properties, tools, reports, market, settings, Stockman IQ, chat, yard book, Grid IQ, and freight calculator. Consistent design tokens throughout: `ring-1 ring-inset ring-white/8` card borders, `bg-brand/15` icon backgrounds, `divide-white/[0.04]` row dividers, chevron hover animations, and uppercase tracking section headings.

**Herd valuation engine** - Ported the iOS `matchWeightRange()` logic to TypeScript. The dashboard and herds page now show live portfolio values calculated from MLA category prices, breed premiums, and weight-range bracket matching. A "Total Value" stat card shows the full portfolio value, and each herd row displays its individual value.

**Property grouping** - Herds are now grouped by property on the herds page. Each property renders as its own separate card with a header bar (Home icon, property name, "Primary" badge for the default property, head count and value subtotals). Default property appears first, then alphabetical, then unassigned.

**Lucide-react icons** - Replaced all inline SVG icons with lucide-react components to match the iOS app's SF Symbols approach. Covers dashboard, herds, properties, tools, reports, and settings.

**Yard Book - full implementation** - Complete Yard Book matching the iOS app's feature set. The run sheet groups items by time horizon (Overdue, Today, Next 7 Days, Next 30 Days, Next 90 Days, Later) with colour-coded countdown badges. Five category types (Livestock, Operations, Finance, Family, Me) with distinct colours and filter pills. Main page has 4 stat cards (Upcoming, Overdue, Today, Completed), show/hide completed toggle, and item rows with linked herd pills. Detail page resolves linked herds and properties with full info display. Form supports date/time with all-day toggle, category chips, reminder offsets (0-21 days before), recurrence rules, multi-select herd linking, and property assignment. All data syncs between iOS and web via the shared Supabase yard_book_items table - mutations set updated_at for iOS sync detection, soft-delete pattern matches iOS exactly.

**Saleyard-specific pricing** - Valuation engine now follows the iOS price hierarchy: saleyard-specific > national > hardcoded fallback. Dashboard and herds pages fetch saleyard prices for herds with a `selected_saleyard`. New `resolvePriceFromEntries` helper handles weight-range matching for any price source.

**Herd detail valuation** - The herd detail page now displays the estimated herd value with per-head breakdown. Fetches national prices, breed premiums, and saleyard-specific prices in parallel, then calculates and shows the value in a branded card.

**Brangus chat (Stockman IQ)** - Refactored the static chat placeholder into a fully interactive AI chat component. New `BrangusChat` client component with message display, input handling, and API integration. Chat service, tool definitions, and types extracted into `lib/brangus/`.

**Clear All Data** - New "Data Management" section in settings with a "Clear All Data" button that calls the `clear-user-data` Edge Function. Double confirmation required. Permanently deletes all user herds, records, and data from the cloud — affects both web and iOS. Account remains active.

**Bug fixes** - Fixed herd/property creation failing with "null value in column id" by adding client-generated UUIDs (offline-first sync requirement). Fixed delete operations blocked by RLS by switching from hard `.delete()` to soft-delete with `is_deleted`, `deleted_at`, `updated_at`. Fixed iOS not syncing deletions by including `updated_at` timestamp. Fixed demo data clear not working (same RLS/soft-delete issue). Fixed soft-deleted demo properties appearing in dropdowns by adding `is_deleted: false` filters to all property queries. Fixed all create/update mutations missing `updated_at`, preventing iOS from detecting web changes. Fixed yard book field names (`category` → `category_raw`, `recurrence_rule` → `recurrence_rule_raw`) to match Supabase schema.

---

## Session 4 - 5 Mar 2026

### Summary

Fixed iOS-to-web sync by correcting the Supabase table name from "herds" to "herd_groups" and adding soft-delete filters. Added a Log In link to the marketing header.

### What's New

**iOS sync fix** - The web app was querying a `herds` table that doesn't exist in Supabase. The iOS sync system writes to `herd_groups` (the correct table), so herds added in the iOS app were never appearing in the web dashboard. Renamed all queries across 7 files to use `herd_groups` and added `is_deleted = false` filters to both `herd_groups` and `properties` queries so soft-deleted records don't appear.

**Database types update** - Updated `lib/types/database.ts` to match the current Supabase schema. Added `is_deleted`, `deleted_at`, and `last_synced_at` fields to both `herd_groups` and `properties` types. Renamed the `herds` table key to `herd_groups`.

**Marketing header** - Added a "Log In" link to the marketing site header navigation so visitors can easily reach the sign-in page.

---

## Session 3 - 4 Mar 2026

### Summary

Sign in with Apple is live. The dashboard now shows a 12-month projected portfolio value chart. Fixed herds not appearing on the herds page. Removed card border strokes for a cleaner look.

### What's New

**Sign in with Apple** - Users can now sign in or sign up with their Apple account. Both auth pages show a "Continue with Apple" button below the email/password form. The implementation bypasses Supabase's OAuth code exchange (which couldn't exchange Apple's authorization code) and instead redirects directly to Apple, receives the ID token via form_post, and creates the session with `signInWithIdToken`. Apple Developer is configured with a Services ID, domain verification, and an ES256 JWT client secret.

**12-Month Outlook chart** - The dashboard chart now shows a live projection of portfolio value over the next 12 months. It uses each herd's head count, current weight, daily weight gain rate, and a fallback price per kg to calculate future values month by month. Built with Recharts AreaChart with gradient fill and formatted tooltips.

**Herds page fix** - Demo herds were showing on the dashboard but not on the herds list page. The herds query was using a PostgREST join to fetch property names that was silently failing. Added a fallback query without the join.

**Card styling** - Removed border strokes from all cards across the app and fixed inconsistent padding.

---

## Session 2 - 4 Mar 2026

### Summary

Complete dashboard redesign with hero stats, herd composition breakdown, and chart. Full UI overhaul to match the iOS dark theme. Demo data seeder. Loading skeletons. All pages scaffolded from iOS feature map.

### What's New

**Dashboard redesign** - New hero section showing total portfolio value, total head count, and active herds. Herd composition card breaks down the portfolio by category (breeders, steers, heifers, etc.) with coloured indicators. Chart card for portfolio trends.

**Demo data** - When a user has no herds, the app seeds a complete demo dataset: Doongara Station property with 20 herds across all livestock categories. Went through several iterations to fix Supabase insert issues (UUID generation, NOT NULL defaults, error handling).

**UI overhaul** - Every page now matches the iOS app's dark design system. Neutral dark backgrounds (no more brown tones), proper colour tokens in Tailwind config, updated sidebar styling. All pages from the iOS app are now scaffolded: Herds, Properties, Yard Book, Reports, Freight Calculator, Grid IQ, Stockman IQ, Settings.

**Loading skeletons** - All major pages now show animated skeleton screens while data loads.

**Sydney region** - Vercel serverless functions pinned to `syd1` for lower latency with the Australian Supabase instance.

---

## Session 1 - 3 Mar 2026

### Summary

Full app foundation built in one session. Supabase auth, database tables, TypeScript types, business logic engines, UI component library, app shell with sidebar, and complete CRUD for properties and herds.

### What's New

**Authentication** - Email/password sign-in and sign-up with Supabase Auth. Protected routes via middleware. OAuth callback handler for future social logins.

**Database** - All user data tables created in Supabase (herds, properties, sales records, health records, muster records, kill sheets, freight estimates, processor grids, custom sale locations) with row-level security.

**App shell** - Sidebar navigation, responsive layout, dark theme foundation.

**Properties CRUD** - Full create, read, update, delete for properties with forms and validation.

**Herds CRUD** - Full create, read, update, delete for herds with property assignment, species/breed/category selection.

**Business logic** - Valuation engine and freight calculator ported as TypeScript modules.

**Dashboard** - Wired to real Supabase data showing user's herds and portfolio summary.

---

## Session 0 - 3 Mar 2026

### Summary

Marketing landing page built with Apple-style design.

### What's New

**Landing page** - Hero section with iPhone dashboard mockup, cinematic feature sections (Portfolio Valuation, Stockman IQ, Grid IQ, Freight IQ), pricing tiers with subscription options, waitlist signup. SF Pro Rounded typography. Dark theme matching the app aesthetic.
