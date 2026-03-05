# Stockman's Wallet Web App - Build Updates

---

# Session 5 - 5 Mar 2026

## Lucide-React Icons

Replaced all inline SVG icons across the app with lucide-react components to match the iOS app's SF Symbols usage. Consistent icon sizing and styling throughout.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Dashboard stat icons (Wallet, Tags, Layers, TrendingUp)
- `app/(app)/dashboard/herds/page.tsx` - Herds stat icons (DollarSign, Tags, Layers, Scale)
- `app/(app)/dashboard/herds/[id]/page.tsx` - Section icons (Info, Scale, Heart, MapPin, FileText)
- `app/(app)/dashboard/properties/page.tsx` - Property card icons (Home, Plus)
- `app/(app)/dashboard/tools/page.tsx` - Tool card chevrons
- Multiple other pages across tools, reports, market, settings

## Herd Valuation Engine

Added weight-range bracket matching to the valuation engine, matching the iOS `matchWeightRange()` logic. The herds page and dashboard now compute live portfolio values from MLA category prices and breed premiums.

**Files changed:**
- `lib/engines/valuation-engine.ts` - Added `CategoryPriceEntry` type, `matchWeightRange()` function, updated `calculateHerdValue` to use weight-range bracket matching
- `lib/types/database.ts` - Added `category_prices` and `breed_premiums` table types
- `app/(app)/dashboard/page.tsx` - Fetches prices/premiums, computes portfolio value with `calculateHerdValue`
- `app/(app)/dashboard/herds/page.tsx` - Fetches prices/premiums in parallel, computes per-herd values, passes to table, shows Total Value stat card

## Herd Creation Fix — Client-Generated UUIDs

Both `herd_groups` and `properties` tables require client-generated UUIDs for offline-first sync compatibility with the iOS app. Added `id: crypto.randomUUID()` / `id: randomUUID()` to insert operations.

**Files changed:**
- `app/(app)/dashboard/herds/actions.ts` - Added `id: crypto.randomUUID()` to herd insert
- `app/(app)/dashboard/properties/actions.ts` - Added `id: randomUUID()` to property insert

## Soft-Delete for Herd and Property Deletion

Hard `.delete()` calls were blocked by Supabase RLS policies. Changed all delete operations to soft-delete using `.update({ is_deleted: true, deleted_at, updated_at })`. The `updated_at` field is required for iOS sync to detect changes.

**Files changed:**
- `app/(app)/dashboard/herds/actions.ts` - `deleteHerd` uses soft-delete with `updated_at`
- `app/(app)/dashboard/properties/actions.ts` - `deleteProperty` uses soft-delete with `updated_at`
- `app/(app)/dashboard/settings/demo-actions.ts` - Both `seedDemoData` cleanup and `clearDemoData` use soft-delete with `updated_at`

## Premium UI Redesign — Herds Page

Complete redesign of the herds page with high-end UI treatment: 4 stat cards (Total Value, Total Head, Herds, Avg Weight) with brand-coloured icons, species pill filter buttons with counts, bespoke sortable table with responsive column hiding, search input, chevron hover animations, and a footer count.

**Files changed:**
- `app/(app)/dashboard/herds/page.tsx` - Stat cards layout, parallel data fetching
- `app/(app)/dashboard/herds/herds-table.tsx` - Full rewrite with pill filters, sortable columns, search, responsive design

## Premium UI Redesign — Entire Web App

Applied the same premium design treatment across all 18+ files in the app to create a consistent, polished experience.

**Files changed:**
- `components/ui/card.tsx` - Added `ring-1 ring-inset ring-white/8` default border
- `app/(app)/dashboard/herds/[id]/page.tsx` - Section icons, InfoRow styling, consistent dividers
- `app/(app)/dashboard/properties/page.tsx` - Icon cards, hover chevrons
- `components/app/herd-form.tsx` - Uppercase tracking section headings, textarea styling
- `components/app/property-form.tsx` - Same form styling updates
- `app/(app)/dashboard/tools/page.tsx` - Chevron animations, hover states
- `app/(app)/dashboard/tools/reports/page.tsx` - Per-report icons
- `app/(app)/dashboard/market/page.tsx` - Icon cards
- `app/(app)/dashboard/market/indicators/page.tsx` - Section icon, tabular-nums
- `app/(app)/dashboard/settings/page.tsx` - Chevron animations, consistent dividers
- `app/(app)/dashboard/stockman-iq/page.tsx` - Category icons, prompt pills
- `app/(app)/dashboard/stockman-iq/chat/page.tsx` - Input styling, ring borders
- `app/(app)/dashboard/stockman-iq/chat/[id]/page.tsx` - Same chat styling
- `app/(app)/dashboard/tools/yard-book/page.tsx` - Pill filters
- `app/(app)/dashboard/tools/grid-iq/page.tsx` - Icon cards with chevrons
- `app/(app)/dashboard/tools/grid-iq/upload/page.tsx` - Drop zone hover
- `app/(app)/dashboard/tools/freight/freight-calculator.tsx` - Result card styling

## Property Grouping on Herds Page

Herds are now grouped by property. Each property renders as its own separate card with a header bar showing the property name, Home icon, "Primary" badge for the default property, and subtotals for head count and value. Default property appears first, then alphabetical, then unassigned. Search also matches property names.

**Files changed:**
- `app/(app)/dashboard/herds/page.tsx` - Fetches properties with `is_default` flag, builds sorted `propertyGroups` array
- `app/(app)/dashboard/herds/herds-table.tsx` - Groups herds by `property_id`, renders separate card per property with header and table

## Soft-Deleted Properties Filtered from All Queries

Fixed soft-deleted demo properties (e.g. Doongara Station) still appearing in property dropdowns on the new herd and edit herd forms, and being accessible via direct URL.

**Files changed:**
- `app/(app)/dashboard/herds/new/page.tsx` - Added `.eq("is_deleted", false)` to properties query
- `app/(app)/dashboard/herds/[id]/edit/page.tsx` - Same filter
- `app/(app)/dashboard/properties/[id]/page.tsx` - Same filter

## Saleyard Name Resolution

App-side saleyard names (e.g. "Charters Towers") don't always match MLA's full names (e.g. "Charters Towers Dalrymple Saleyards"). Added `resolveMLASaleyardName()` to map short names to full MLA names before querying `category_prices`. Used in the valuation engine and all page-level saleyard price queries.

**Files changed:**
- `lib/engines/valuation-engine.ts` - Calls `resolveMLASaleyardName` before building saleyard price lookup keys
- `app/(app)/dashboard/herds/[id]/page.tsx` - Resolves saleyard name before query
- `app/(app)/dashboard/herds/page.tsx` - Resolves saleyard names in set before query

## Last-Price and Max-Price Resolution (iOS Cache Parity)

`resolvePriceFromEntries` now matches iOS `ValuationEngine` cache overwrite behaviour. Multiple entries per weight range are common (one per MLA sale date). For weight-range matches, takes the last entry (most recently uploaded price, matching iOS cache overwrite). For fallback (no weight range), takes the highest price (matching iOS max-wins logic).

**Files changed:**
- `lib/engines/valuation-engine.ts` - Updated `resolvePriceFromEntries` to use last-wins for range matches and max for fallback

## Category Filter on Saleyard Price Queries

A single saleyard can have 7000+ rows across all categories in `category_prices`, exceeding PostgREST's default 1000-row limit. Added `.in("category", mlaCategories)` filter to all saleyard price queries so only the relevant categories are fetched. Brangus chat service refactored to fetch national prices in the parallel batch and saleyard prices in a separate filtered query after herds load.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Adds `.in("category", mlaCategories)` to saleyard query
- `app/(app)/dashboard/herds/page.tsx` - Same category filter
- `app/(app)/dashboard/herds/[id]/page.tsx` - Uses `.eq("category", mlaCategory)` for single-herd query
- `lib/brangus/chat-service.ts` - Split into parallel national fetch + sequential saleyard fetch with category filter

## Saleyard Breed-Specific Pricing (iOS Parity)

Valuation engine now supports breed-specific saleyard prices with a double-application guard matching iOS `resolveGeneralBasePrice()`. MLA saleyard transaction data is mostly breed-specific (breed IS NOT NULL), so prices are split into two maps: general (breed=null) where breed premium is applied, and breed-specific where premium is skipped since it's already baked into the price.

The price resolution hierarchy is now 4 tiers:
1. Saleyard general (breed=null) + breed premium
2. Saleyard breed-specific (no breed premium — already reflected in price)
3. National (breed=null) + breed premium
4. Hardcoded category fallback + breed premium

National price queries now also filter with `.is("breed", null)` to avoid mixing breed-specific rows into the national map.

**Files changed:**
- `lib/engines/valuation-engine.ts` - New `saleyardBreedPriceMap` parameter, `skipBreedPremium` flag, 4-tier hierarchy, updated `calculateHerdValue` wrapper
- `app/(app)/dashboard/page.tsx` - Splits saleyard prices by breed, passes `saleyardBreedPriceMap`, adds `.is("breed", null)` to national query
- `app/(app)/dashboard/herds/page.tsx` - Same breed split and national filter
- `app/(app)/dashboard/herds/[id]/page.tsx` - Same breed split and national filter
- `lib/brangus/chat-service.ts` - Same 3-map split for Brangus chat data store

## Price Source Indicators and Valuation Detail

Added price source tracking to the valuation engine. New `calculateHerdValuation` function returns a `HerdValuationResult` with `netValue`, `priceSource` (saleyard/national/fallback), `pricePerKg`, and `breedPremiumApplied`. The original `calculateHerdValue` is kept as a convenience wrapper.

Herd detail page shows red warning icon and "National Avg" or "Est. Fallback" badge when not using saleyard-specific pricing. Herds table highlights values in red when using non-saleyard prices. Dashboard shows a badge like "3 herds using national avg" next to Portfolio Value when applicable.

**Files changed:**
- `lib/engines/valuation-engine.ts` - New `calculateHerdValuation`, `HerdValuationResult` type, `PriceSource` type; `calculateHerdValue` kept as wrapper
- `app/(app)/dashboard/herds/[id]/page.tsx` - Red AlertTriangle icon, price source badge, conditional colour styling
- `app/(app)/dashboard/herds/herds-table.tsx` - New `herdSources` prop, red text for fallback values
- `app/(app)/dashboard/herds/page.tsx` - Passes `herdSourcesObj` to table
- `app/(app)/dashboard/page.tsx` - Counts fallback herds, shows badge on portfolio value

## Supabase Column Name Fixes

Fixed column names to match the actual Supabase schema. `price_per_kg` → `final_price_per_kg` (aliased as `price_per_kg` in queries), `premium_percent` → `premium_pct` (aliased as `premium_percent`). National prices filtered with `.eq("saleyard", "National")` instead of `.is("saleyard", null).is("state", null)`. Prices converted from cents to dollars (÷ 100) in all price maps.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Column aliases, cents→dollars, national filter
- `app/(app)/dashboard/herds/page.tsx` - Same
- `app/(app)/dashboard/herds/[id]/page.tsx` - Same
- `lib/brangus/chat-service.ts` - Same, plus national/saleyard split logic updated

## Local Breed Premium Fallback

Premium map now seeds with local `cattleBreedPremiums` from reference data before applying Supabase overrides, matching the iOS `BreedPremiumService` pattern. Ensures valuations work even when the breed_premiums table is empty or missing entries.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Seeds premiumMap from `cattleBreedPremiums`
- `app/(app)/dashboard/herds/page.tsx` - Same
- `app/(app)/dashboard/herds/[id]/page.tsx` - Same
- `lib/brangus/chat-service.ts` - Same

## Admin MLA CSV Upload

New admin-only page for uploading MLA market data CSV files. Server-side email whitelist gate restricts access to admin users. Supports CSV format auto-detection, chunked transaction upload with progress indicator. Linked from the Settings page.

**Files created/changed:**
- `app/(app)/dashboard/admin/mla-upload/page.tsx` - Admin gate with email whitelist
- `app/(app)/dashboard/admin/mla-upload/mla-uploader.tsx` - CSV parser, format detection, chunked upload with progress
- `app/(app)/dashboard/settings/page.tsx` - Admin section with link to MLA upload

## iOS Sync Fix — updated_at on All Mutations

Herd and property create/update actions were not setting `updated_at`, so the iOS app couldn't detect changes made on the web. Added `updated_at: new Date().toISOString()` to `createHerd`, `updateHerd`, `createProperty`, and `updateProperty`. Delete actions already had it.

**Files changed:**
- `app/(app)/dashboard/herds/actions.ts` - Added `updated_at` to `createHerd` and `updateHerd`
- `app/(app)/dashboard/properties/actions.ts` - Added `updated_at` to `createProperty` and `updateProperty`

## Brangus Chat Component (Stockman IQ)

Refactored the Stockman IQ chat page from a static placeholder into a fully interactive AI chat. The new `BrangusChat` client component handles message display, user input, API calls, and tool execution. Chat service, tool definitions, and types extracted into `lib/brangus/`.

**Files created/changed:**
- `components/app/brangus-chat.tsx` - Interactive chat component with message list, input, suggested prompts
- `lib/brangus/chat-service.ts` - Chat API service layer
- `lib/brangus/tools.ts` - Tool definitions for AI function calling
- `lib/brangus/types.ts` - Chat message and conversation types
- `app/(app)/dashboard/stockman-iq/chat/page.tsx` - Replaced inline placeholder with `BrangusChat` component

## Herd Detail Page — Valuation Display

The herd detail page now shows the estimated herd value with per-head breakdown. Fetches national prices, breed premiums, and saleyard-specific prices in parallel, then runs `calculateHerdValue` to display a value card with DollarSign icon.

**Files changed:**
- `app/(app)/dashboard/herds/[id]/page.tsx` - Parallel price fetching, saleyard price lookup, valuation card with per-head calculation

## Saleyard-Specific Pricing

Valuation engine now follows the iOS price hierarchy: saleyard-specific prices > national prices > hardcoded fallback. Dashboard and herds pages fetch saleyard-specific prices for herds that have a `selected_saleyard` set. New `resolvePriceFromEntries` helper handles weight-range matching for any price source.

**Files changed:**
- `lib/engines/valuation-engine.ts` - Added `resolvePriceFromEntries`, `saleyardPriceMap` parameter, 3-tier price hierarchy, `selected_saleyard` to `HerdForValuation`
- `app/(app)/dashboard/page.tsx` - Fetches `selected_saleyard` field, builds saleyardPriceMap, passes to `calculateHerdValue`
- `app/(app)/dashboard/herds/page.tsx` - Same saleyard price fetching and map building

## Yard Book Field Renames

Renamed `category` → `category_raw` and `recurrence_rule` → `recurrence_rule_raw` in the yard book to match the actual Supabase column names.

**Files changed:**
- `lib/types/database.ts` - Updated Row/Insert/Update types
- `app/(app)/dashboard/tools/yard-book/actions.ts` - Updated create and update actions
- `app/(app)/dashboard/tools/yard-book/[id]/page.tsx` - Updated detail page
- `app/(app)/dashboard/tools/yard-book/[id]/edit/page.tsx` - Updated edit page subtitle
- `components/app/yard-book-form.tsx` - Updated form defaults
- `components/app/yard-book-run-sheet.tsx` - Updated filtering and category config lookups

## Yard Book - Full Implementation

Complete Yard Book feature matching the iOS app. The run sheet groups items by time horizon (Overdue, Today, Next 7 Days, Next 30 Days, Next 90 Days, Later) with countdown badges colour-coded by urgency (red for overdue, green for today, amber for within 7 days, grey for later). Five category types with distinct colours: Livestock (orange/PawPrint), Operations (amber/Wrench), Finance (blue/DollarSign), Family (purple/Home), Me (green/User).

Main page shows 4 stat cards (Upcoming, Overdue, Today, Completed), category filter pills with counts, and a show/hide completed toggle. Each item row shows category icon, title, date, time, linked herd pills (max 2 with overflow count), and countdown badge. Completed items display with strikethrough text and a green checkmark.

Detail page has Overview card (category badge, status with countdown), Event card (date, time, recurrence, property), Reminders card (sorted offset descriptions), Linked Herds card (names with head counts linking to herd detail pages), and Notes card.

Form component supports title, date/time with all-day toggle, category chip selection, reminder offset chips (On the day, 1/3/7/14/21 days before), recurrence toggle with Weekly/Fortnightly/Monthly/Annual, multi-select herd linking chips, property select, and notes. Shared between create and edit pages.

All mutations set `updated_at` for iOS sync compatibility. Soft-delete pattern matches iOS (is_deleted + deleted_at). Array fields (linked_herd_ids, reminder_offsets) serialized as JSON in hidden form inputs, parsed server-side. Data syncs bidirectionally between iOS and web via the shared `yard_book_items` Supabase table.

**Files created/changed:**
- `app/(app)/dashboard/tools/yard-book/actions.ts` - Server actions: createYardBookItem, updateYardBookItem, deleteYardBookItem (soft-delete), toggleYardBookItemComplete
- `app/(app)/dashboard/tools/yard-book/page.tsx` - Main page with stat cards, run sheet, empty state
- `app/(app)/dashboard/tools/yard-book/new/page.tsx` - Create page fetching herds and properties
- `app/(app)/dashboard/tools/yard-book/[id]/page.tsx` - Detail page with linked herd resolution and property lookup
- `app/(app)/dashboard/tools/yard-book/[id]/edit/page.tsx` - Edit page with bound update action
- `app/(app)/dashboard/tools/yard-book/[id]/delete-button.tsx` - Client delete button with confirmation modal
- `app/(app)/dashboard/tools/yard-book/[id]/toggle-complete-button.tsx` - Client mark complete/incomplete button
- `app/(app)/dashboard/tools/yard-book/loading.tsx` - Skeleton loading state
- `components/app/yard-book-form.tsx` - Shared form component (category chips, reminder offsets, herd multi-select)
- `components/app/yard-book-run-sheet.tsx` - Interactive run sheet with horizon grouping, category filtering, show/hide completed
- `lib/types/database.ts` - Added is_deleted and deleted_at fields to yard_book_items Row/Insert/Update types

## Clear All Data

Added a "Data Management" section to settings with a "Clear All Data" button. Calls the `clear-user-data` Supabase Edge Function to permanently delete all user herds, records, and data from the cloud. Double confirmation dialog. Affects both web app and iOS app (shared Supabase backend). Account remains active.

**Files changed:**
- `app/(app)/dashboard/settings/demo-actions.ts` - Added `clearAllUserData` server action calling Edge Function with JWT auth
- `app/(app)/dashboard/settings/demo-buttons.tsx` - Added `ClearAllDataButton` with double confirmation
- `app/(app)/dashboard/settings/page.tsx` - Added "Data Management" section with description and button

---

# Session 4 - 5 Mar 2026

## iOS Sync Fix — herds → herd_groups

The web app was querying a `herds` table that doesn't exist in Supabase. The iOS sync system writes to `herd_groups` (the correct table), so herds created in the iOS app never appeared in the web dashboard. Renamed all Supabase queries from `"herds"` to `"herd_groups"` and added `is_deleted = false` filters so soft-deleted records are excluded. Also updated the `HerdRow` type alias in the herd form component.

**Files changed:**
- `app/(app)/dashboard/herds/page.tsx` - `"herds"` → `"herd_groups"` + `is_deleted` filter
- `app/(app)/dashboard/herds/[id]/page.tsx` - Same
- `app/(app)/dashboard/herds/[id]/edit/page.tsx` - Same
- `app/(app)/dashboard/herds/actions.ts` - `"herds"` → `"herd_groups"` (insert/update/delete)
- `app/(app)/dashboard/page.tsx` - `"herds"` → `"herd_groups"` + `is_deleted` filters on both herds and properties
- `app/(app)/dashboard/properties/page.tsx` - Added `is_deleted` filter
- `app/(app)/dashboard/settings/demo-actions.ts` - `"herds"` → `"herd_groups"`
- `lib/types/database.ts` - Renamed `herds` type to `herd_groups`, added `is_deleted`/`deleted_at`/`last_synced_at` fields to both `herd_groups` and `properties`
- `components/app/herd-form.tsx` - Fixed `HerdRow` type to reference `herd_groups`

## Marketing Header — Log In Link

Added a "Log In" link to the marketing site header so visitors can navigate to the sign-in page.

**Files changed:**
- `components/marketing/header.tsx` - Added Log In navigation link

---

# Session 3 - 4 Mar 2026

## Sign in with Apple

Added Apple OAuth as a login option on both the sign-in and sign-up pages. Rather than using Supabase's built-in OAuth flow (which failed to exchange Apple's authorization code), the implementation redirects directly to Apple's authorization endpoint, receives the ID token back via Apple's form_post response mode, and creates the Supabase session using `signInWithIdToken`. A SHA-256 nonce is generated server-side and carried through Apple's state parameter for token verification.

**Apple Developer setup:** Created a Services ID (`com.leonernst.StockmansWallet.web`) linked to the existing iOS App ID, configured with the Vercel production domain and return URL. Generated an ES256 JWT client secret using the existing Sign in with Apple key.

**Files changed:**
- `app/(auth)/actions.ts` - `signInWithApple` server action redirects directly to Apple
- `app/(auth)/auth/apple-callback/route.ts` - New POST handler receives Apple's form_post, exchanges ID token with Supabase via `signInWithIdToken`, sets session cookies on a 303 redirect
- `app/(auth)/auth/callback/route.ts` - Improved cookie handling for general OAuth callback (sets cookies directly on the NextResponse)
- `app/(auth)/sign-in/page.tsx` - Added "Continue with Apple" button with divider
- `app/(auth)/sign-up/page.tsx` - Same Apple button and divider

## 12-Month Outlook Chart

Replaced the static bar chart placeholder with a live Recharts AreaChart showing projected portfolio value over the next 12 months. Each month's value is calculated from head count, current weight plus accumulated daily weight gain, and a fallback price per kg by category. The chart has a gradient fill under the line and displays formatted dollar values on hover.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Generates 12-month projection data from herd `daily_weight_gain`, passes to chart component, updated card title to "12-Month Outlook"
- `app/(app)/dashboard/portfolio-chart.tsx` - Recharts AreaChart with custom tooltip, gradient fill, and responsive container
- `app/(app)/dashboard/loading.tsx` - Updated skeleton to match new chart layout

## Dashboard Polish

Removed card border strokes across all pages and fixed inconsistent `CardContent` padding. Cards now have a cleaner look matching the iOS app's card style.

**Files changed:**
- Multiple card component usages across dashboard, herds, and tool pages

## Herds Page Fix

Fixed demo herds not appearing on the herds list page. The herds query uses a PostgREST join (`properties(property_name)`) that was silently failing and returning null. Added a fallback query that retries without the join if the first query errors.

**Files changed:**
- `app/(app)/dashboard/herds/page.tsx` - Fallback query when properties join fails
- `app/(app)/dashboard/herds/[id]/page.tsx` - Same fallback for herd detail page

---

# Session 2 - 4 Mar 2026

## Dashboard Redesign

Complete redesign of the dashboard to match the iOS app's polished dark UI. Added a hero section with total portfolio value, total head count, and number of active herds. Added a herd composition breakdown by category with coloured dots. Introduced the portfolio chart card (initially a bar chart, later replaced with Recharts area chart in session 3).

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Hero stats, herd composition, chart card
- `app/(app)/dashboard/herd-composition.tsx` - New component for category breakdown
- `app/(app)/dashboard/portfolio-chart.tsx` - Chart component (Recharts)
- `app/(app)/dashboard/loading.tsx` - Loading skeleton for dashboard

## Demo Data Seeder

Built a demo data system that seeds a full working dataset (Doongara Station property + 20 herds across all categories) when the user has no existing data. Multiple iterations to fix Supabase insert issues: client-side UUID generation, explicit NOT NULL defaults, error surfacing, and a flag-based approach that doesn't wipe real user data.

**Files changed:**
- `app/(app)/dashboard/demo-data.ts` - Demo data definitions and insert logic
- `app/(app)/dashboard/page.tsx` - Triggers demo seeding when user has no herds

## UI Overhaul

Overhauled the entire app's visual design to match the iOS dark theme. Replaced brown-toned backgrounds with neutral darks, updated the sidebar, added the design system's colour tokens, and scaffolded all pages from the iOS feature map (Herds, Properties, Yard Book, Reports, Freight Calculator, Grid IQ, Stockman IQ, Settings).

**Files changed:**
- `tailwind.config.ts` - Design system colour tokens
- `app/(app)/layout.tsx` - Sidebar and shell styling
- `app/(app)/dashboard/` - All dashboard components
- `app/(app)/dashboard/herds/` - Herds list and detail pages
- `app/(app)/dashboard/properties/` - Properties pages
- `app/(app)/dashboard/tools/` - All tool page scaffolds
- `app/(app)/dashboard/settings/` - Settings page
- Multiple other layout and component files

## Loading Skeletons and Region Pinning

Added loading skeleton screens for all major pages. Pinned Vercel serverless functions to the Sydney region (`syd1`) for lower latency with the Supabase database.

**Files changed:**
- `app/(app)/dashboard/loading.tsx` - Dashboard skeleton
- `vercel.json` - Region configuration

---

# Session 1 - 3 Mar 2026

## Supabase Auth and App Shell

Set up the full authentication system with Supabase: sign-in, sign-up, sign-out, email/password auth. Built the app shell with sidebar navigation, middleware for auth-protected routes, and the initial dashboard scaffold.

**Files changed:**
- `app/(auth)/` - Auth pages (sign-in, sign-up) and server actions
- `app/(auth)/auth/callback/route.ts` - OAuth callback handler
- `lib/supabase/` - Server and client Supabase client factories, middleware
- `middleware.ts` - Auth redirect middleware
- `app/(app)/layout.tsx` - App shell with sidebar

## TypeScript Types, Business Logic, and UI Components

Added TypeScript type definitions for all database tables, business logic engines (valuation, freight), and a shared UI component library (Card, Button, Input, etc.) using Tailwind CSS.

**Files changed:**
- `types/` - Database and domain type definitions
- `lib/engines/` - Valuation and freight calculation engines
- `components/ui/` - Shared component library

## Database Tables

Created all Supabase user data tables (herds, properties, sales, health records, muster records, etc.) with row-level security policies. Generated TypeScript database types.

**Files changed:**
- `supabase/migrations/` - SQL migration files
- `types/supabase.ts` - Auto-generated database types

## Properties and Herds CRUD

Built full create/read/update/delete flows for properties and herds with forms, list views, detail pages, and deletion.

**Files changed:**
- `app/(app)/dashboard/properties/` - Properties CRUD pages
- `app/(app)/dashboard/herds/` - Herds CRUD pages (renamed from Portfolio)

## Dashboard with Real Data

Wired the dashboard to display real data from Supabase. Added a basic settings page and freight calculator.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Real data queries
- `app/(app)/dashboard/settings/` - Settings page
- `app/(app)/dashboard/tools/freight/` - Freight calculator

---

# Session 0 - 3 Mar 2026

## Landing Page

Built the marketing landing page with Apple-style design: hero section with iPhone mockup, feature sections with cinematic layout, pricing tiers, and waitlist signup. SF Pro Rounded font. Multiple iterations on layout, mockup images, and styling.

**Files changed:**
- `app/page.tsx` - Landing page
- `public/images/` - iPhone mockup screenshots and app icon
- `app/layout.tsx` - Font and global styles
- `tailwind.config.ts` - Initial theme configuration
