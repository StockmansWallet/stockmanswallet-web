# Build Summaries

## Session 10 - 6 Mar 2026

### Summary

Per-tool accent colors and consistent border radius across the entire web app. Each tool now has its own color identity matching the iOS themes, and all interactive elements use `rounded-xl` for a cohesive look.

### What's New

**Per-tool accent colors** - Every tool section now uses its own accent color instead of the default brand orange, matching the iOS app's theme colors. Grid IQ uses teal, Freight IQ uses sky blue, Yard Book uses lime green, Reports uses amber, and Advisory Hub uses purple. This applies to sidebar active states, buttons, empty states, stat card icons, section icons, links, and filter pills across all tool pages. The Button, EmptyState, and StatCard components all gained new variant/accent props to support tool-specific colors.

**Consistent rounded-xl radius** - Standardised all interactive elements (buttons, nav items, filter pills, tab buttons, inline links) from a mix of `rounded-full` and `rounded-2xl` to `rounded-xl` (12px). This gives the app a cohesive, slightly rounded look across the board. Circular decorative elements (icons, avatars, typing dots) and structural containers (cards, modals) were kept as-is.

---

## Session 9 - 6 Mar 2026

### Summary

UI polish and iOS feature parity. Standardised button styling to Apple quality, moved form actions to PageHeader, redesigned reports layout, and completely rebuilt Freight IQ to match the iOS app's 3-step calculator flow.

### What's New

**Button styling overhaul** - Redesigned the core Button component for consistent Apple-quality styling across the app. All buttons now use pill shape (`rounded-full`) with fixed heights per size, consistent font sizes, refined hover/active states, and `shadow-sm` on primary buttons. All PageHeader action buttons standardised to `size="sm"` with smaller icons.

**Form actions in PageHeader** - Removed the bottom Save/Cancel buttons from herd create and edit forms. Cancel now appears as a styled link in the top-right PageHeader alongside the Save button. Save uses the `form="herd-form"` attribute for cross-element form submission, keeping the form clean and the actions prominent.

**Reports page redesign** - Changed from a vertical stack to a 2-column responsive grid matching the Tools page layout, with larger icon containers and consistent card styling.

**Freight IQ rebuild** - Complete rewrite to match the iOS app's 3-step wizard flow. The page now fetches real herds and properties from Supabase server-side. Step 1 lets you pick a property and herd (selecting a herd auto-fills weight, head count, heads per deck, and origin property). Step 2 picks a saleyard destination with auto-distance calculation using the haversine formula with a 1.3x road factor. Step 3 shows 5 editable assumption fields (weight, head count, distance, head per deck, rate) matching the iOS layout. Results show a centered hero cost card with GST, an icon-row breakdown (freight cost, cost per head, cost per deck, required decks), an assumptions summary, and colour-coded alert cards.

---

## Session 7 - 6 Mar 2026

### Summary

Fixed a critical bug in the MLA scraper Edge Function that was wiping all uploaded saleyard pricing data on each sequential CSV upload, causing all web app valuations to show national average fallback (red) instead of saleyard-specific prices (green).

### What's New

**MLA scraper fix** - When uploading 41 MLA saleyard CSV files, each upload was deleting all previously uploaded transaction data before inserting its own. Only the last file's data (Armidale) survived, leaving 9,685 rows instead of the expected 300,000+. All dashboard valuations showed red because saleyard prices were missing. Three fixes applied: removed the broad delete so historic data accumulates, fixed a destructuring bug in the per-saleyard dedup logic, and added `prices_inserted`/`insert_errors` to the CSV response for upload visibility. This is a shared Supabase Edge Function so the fix benefits both web and iOS apps.

---

## Session 6 - 6 Mar 2026

### Summary

Dashboard and sidebar redesign to match the new mockup. Two-column layout, expanded navigation, updated icons, and a properties query fix.

### What's New

**Dashboard redesign** - Switched from single-column to a two-column flex layout. Left column has the portfolio value card (renamed to "Total Herd Value") with centered value and inline stats (head, herds, properties), plus the 12-Month Outlook chart. Right column has the user profile card, properties list (with primary/demo labels), Coming Up (Yard Book), and Growth & Mortality cards. Columns stack independently so cards fit content height without forced row alignment.

**Sidebar overhaul** - Expanded from 7 to 10 top-level nav items (Yard Book, Reports, Freight IQ, Grid IQ, Advisory Hub promoted). Added a bottom section with Plan indicator (Free Plan badge), Help Center, Settings, and Log Out. Replaced the app icon with the full `sw-logo.svg` showing orange tally marks. Sidebar is now sticky, has no background (blends with page), and cards use more transparent backgrounds (`bg-white/[0.03]`). Page background updated to `#1C1B1B`.

**Icon updates** - Properties nav icon changed from custom `IconFarm` to Lucide `MapPinned`. Stockman IQ icon changed from custom SVG to Lucide `Brain`. Cattle tags icon SVG updated to a filled `fillRule evenOdd` style.

**Bug fix** - Fixed properties not appearing on the dashboard. The query was filtering on `is_demo_data` (wrong column name) instead of `is_simulated`, causing Supabase to return null.

---

## Session 5 - 5 Mar 2026

### Summary

Major UI/UX overhaul, herd valuation engine, property grouping, and critical bug fixes for CRUD operations and iOS sync compatibility.

### What's New

**Premium UI redesign** - Complete visual refresh across the entire web app. The herds page was redesigned first with stat cards, species pill filters, sortable bespoke table, and responsive column hiding. Then the same premium treatment was applied to all other pages: properties, tools, reports, market, settings, Stockman IQ, chat, yard book, Grid IQ, and freight calculator. Consistent design tokens throughout: `ring-1 ring-inset ring-white/8` card borders, `bg-brand/15` icon backgrounds, `divide-white/[0.04]` row dividers, chevron hover animations, and uppercase tracking section headings.

**Herd valuation engine** - Ported the iOS `matchWeightRange()` logic to TypeScript. The dashboard and herds page now show live portfolio values calculated from MLA category prices, breed premiums, and weight-range bracket matching. A "Total Value" stat card shows the full portfolio value, and each herd row displays its individual value.

**Property grouping** - Herds are now grouped by property on the herds page. Each property renders as its own separate card with a header bar (Home icon, property name, "Primary" badge for the default property, head count and value subtotals). Default property appears first, then alphabetical, then unassigned.

**Lucide-react icons** - Replaced all inline SVG icons with lucide-react components to match the iOS app's SF Symbols approach. Covers dashboard, herds, properties, tools, reports, and settings.

**Yard Book - full implementation** - Complete Yard Book matching the iOS app's feature set. The run sheet groups items by time horizon (Overdue, Today, Next 7 Days, Next 30 Days, Next 90 Days, Later) with colour-coded countdown badges. Five category types (Livestock, Operations, Finance, Family, Me) with distinct colours and filter pills. Main page has 4 stat cards (Upcoming, Overdue, Today, Completed), show/hide completed toggle, and item rows with linked herd pills. Detail page resolves linked herds and properties with full info display. Form supports date/time with all-day toggle, category chips, reminder offsets (0-21 days before), recurrence rules, multi-select herd linking, and property assignment. All data syncs between iOS and web via the shared Supabase yard_book_items table - mutations set updated_at for iOS sync detection, soft-delete pattern matches iOS exactly.

**Saleyard-specific pricing** - Valuation engine now follows the iOS price hierarchy with a 4-tier resolution: saleyard general (breed=null) with breed premium → saleyard breed-specific (premium already baked in, double-application guard) → national (breed=null) with breed premium → hardcoded fallback. Dashboard and herds pages fetch saleyard prices and split into general vs breed-specific maps. National queries filter with `.is("breed", null)` to avoid mixing breed-specific rows.

**Herd detail valuation** - The herd detail page now displays the estimated herd value with per-head breakdown. Fetches national prices, breed premiums, and saleyard-specific prices in parallel, then calculates and shows the value in a branded card.

**Brangus chat (Stockman IQ)** - Refactored the static chat placeholder into a fully interactive AI chat component. New `BrangusChat` client component with message display, input handling, and API integration. Chat service, tool definitions, and types extracted into `lib/brangus/`.

**Clear All Data** - New "Data Management" section in settings with a "Clear All Data" button that calls the `clear-user-data` Edge Function. Double confirmation required. Permanently deletes all user herds, records, and data from the cloud — affects both web and iOS. Account remains active.

**Price source indicators** - Valuation engine now returns detailed results via `calculateHerdValuation` including `priceSource` (saleyard/national/fallback), `pricePerKg`, and `breedPremiumApplied`. Herd detail page shows a red warning icon and "National Avg" or "Est. Fallback" badge when not using saleyard pricing. Herds table highlights values in red for non-saleyard prices. Dashboard shows a fallback count badge next to Portfolio Value.

**Local breed premium fallback** - Premium map now seeds with local `cattleBreedPremiums` before applying Supabase overrides, matching iOS `BreedPremiumService`. Ensures valuations work even when breed_premiums table is empty.

**Admin MLA CSV upload** - Admin-only page for uploading MLA market data CSV files. Server-side email whitelist, CSV format auto-detection, chunked upload with progress. Linked from Settings.

**Bug fixes** - Fixed Supabase column names: `price_per_kg` → `final_price_per_kg`, `premium_percent` → `premium_pct` (using query aliases for backward compatibility). Fixed national price filter from `.is("saleyard", null)` to `.eq("saleyard", "National")`. Fixed prices stored in cents not being converted to dollars (÷ 100). Fixed saleyard price queries exceeding PostgREST's 1000-row default limit by adding category filters. Fixed saleyard name mismatch (app short names vs MLA full names) with `resolveMLASaleyardName`. Fixed price resolution to match iOS cache overwrite behaviour (last entry wins for weight-range, highest for fallback). Fixed herd/property creation failing with "null value in column id" by adding client-generated UUIDs. Fixed delete operations blocked by RLS by switching to soft-delete. Fixed all create/update mutations missing `updated_at`, preventing iOS sync. Fixed yard book field names (`category` → `category_raw`, `recurrence_rule` → `recurrence_rule_raw`).

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
