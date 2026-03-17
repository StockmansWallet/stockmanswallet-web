# Build Summaries

## 9 Mar 2026

### Cow Category Mapping Fix
* All cow types (Breeder Cow, Breeder Heifer, Wet Cow, Cull Cow) now map to "Cows" instead of "Breeding Cow"/"Wet Cow"
* Was causing saleyard price lookups to fail silently (no "Breeding Cow" category in MLA data)
* Now matches iOS mapping

### Formula Walkthrough Layout
* Moved data source info (price source, date, category mapping) below NetValue as grouped reference section

---

## 8 Mar 2026

### Data Cleanup - Future-Dated MLA Records
* Removed 29,178 future-dated records from `category_prices` (quarterly CSV data uploaded instead of weekly)

### Price Inconsistency Fix
* Fixed herds showing different valuations on dashboard/herds list vs herd detail page
* Root cause: Supabase `max_rows` was 1,000 (default), silently capping all queries. Batch pages exceeded the limit, losing older saleyard data
* Increased `max_rows` to 50,000 via Supabase Management API
* Split batch price queries into parallel saleyard + national queries to prevent national prices being crowded out

### Weight Bracket Boundary Fix
* Fixed non-deterministic bracket selection at boundary weights (e.g. 400kg matching both "330-400" and "400-500")
* Now deterministically prefers the upper bracket instead of depending on query result order

### Admin Tools - Sidebar Navigation
* Moved Valuation Validator and MLA Data Upload from Settings page to dedicated admin section in sidebar
* Each tool has unique colour theme (rose/emerald), section only visible to admin emails

### Valuation Lab (renamed from Valuation Validator)
* Renamed to "Valuation Lab" across sidebar, page header, and metadata
* Added icons to all 4 tabs, active tab uses rose/maroon theme
* Summary strip: added Per Head, renamed to "Herds Net Value", removed standalone hero cards
* Test Calculator: Net Value and Per Head now in reactive orange hero cards within results grid
* Results use 3-column grid layout, formula walkthrough rounded to 2dp
* Calculation Logic tab shows content directly (no dropdown), amber theme
* Herd Breakdown: moved beaker icon to dedicated column at far right of each row

### Herd Form - Sex Removed, Breed Premium Added
* Removed Sex field from herd create/edit form (now auto-derived from category)
* Added Breed Premium Override field with auto-premium placeholder (e.g. "Auto (9%)")
* Removed Sex row from herd detail page, added Breed Premium row

### Valuation Engine - Calves at Foot
* Added calves-at-foot value calculation matching iOS implementation
* Parses `additional_info` for calf head count, age, and weight
* Species-specific daily weight gain (Cattle 0.9 kg/day, Sheep 0.25 kg/day)
* Fixed uncontrolled breeding accrual to use `created_at` instead of `joined_date`

### Valuation Validator - Formula Walkthrough Enhancements
* Added category mapping info (e.g. "Breeder Cow -> Breeding Cow")
* Rounded all walkthrough values and price cards to 2 decimal places

### MLA Category Mapping - PTIC and Feeder Cows
* Added `Cows|PTIC` and `Cows|Feeder` mappings to Breeding Cow
* Previously fell through unmatched in scraper and reference data

### Data Cleanup - Quarterly MLA Records Purged
* Deleted 293,308 rows of quarterly historical data (2023-12-31 to 2025-12-31, Breeding Cow only)
* Deleted remaining stale weekly data (2024-2025)
* Table cleared for fresh weekly CSV uploads going back to 2024

---

## 7 Mar 2026

### UI Polish - Filter Pills, Icons, Colours, Layout
* Unified filter pills across app to `rounded-full` with no stroke (matching Yard Book)
* Tool page icon colours now match iOS: lime (Yard Book), sky (Freight IQ), amber (Reports), teal (Grid IQ)
* Replaced PawPrint icons with custom IconCattleTags SVG in Yard Book form, run sheet, and detail
* Rewrote dashboard skeleton loader to match current two-column dashboard layout
* Reordered herds table columns: HEAD / NAME / BREED / CATEGORY / $/KG / WEIGHT / VALUE
* Added new $/kg column to herds list using valuation engine output
* Herd detail page changed from CSS grid to two independent flex columns (matching iOS)

### Property Header Always Visible
* Property group heading now shows even with a single property (was only shown for 2+)

---

### Valuation Engine - Stale Weight Bracket Fix
* Fixed valuations using stale pricing from old MLA data uploads when the current data doesn't have a matching weight bracket (e.g. "400+" existed in Dec 2025 but not Mar 2026)
* Price resolution now uses only the newest date's brackets, clamping to nearest when no exact match
* Example: Angus Yearling Steer at Charters Towers was showing $4.51/kg (stale), now correctly shows $4.13/kg
* Weight bracket matching now uses inclusive bounds with boundary preference for upper bracket
* Added `data_date` to all price queries across dashboard, herds list, herd detail, and Brangus chat
* Aligned bracket matching logic between web and iOS (same three-function approach)

---

## 6 Mar 2026

### Valuation Pipeline Fix
* Raised Supabase `category_prices` query limit from 500 to 50,000 across all pricing pages
* Fixed price resolution order: saleyard general, saleyard breed-specific, national, fallback
* Fixed demo data seeder using wrong saleyard name format and only setting saleyards on 2 of 20 herds
* Also raised limit on iOS `SupabaseMarketService` (shared fix)

### MLA Scraper - Historic Data Fix
* Fixed critical bug wiping all uploaded saleyard CSV data on each sequential upload
* Removed broad delete of all transaction rows so historic data accumulates
* Fixed destructuring bug in per-saleyard+date dedup logic
* Added `prices_inserted`/`insert_errors` to CSV response

### Herd Detail Page - iOS Alignment
* Added Key Metrics card (price/kg, average weight, value per head, saleyard)
* Added Current Weight to Weight Tracking, Mortality Rate to Location, Timeline section, Notes section

### Herd Form - Current Weight Field
* Added `current_weight` input to herd create/edit form and server actions

### Brangus Chat Bubbles
* Changed assistant bubble from `bg-white/5` to warm brown `bg-[#4D331F]` matching iOS
* Added `animate-bubble-in` spring entrance animation

### Per-Tool Accent Colours
* Each tool section now uses its own accent colour matching iOS themes
* Grid IQ: teal, Freight IQ: sky blue, Yard Book: lime, Reports: amber, Advisory Hub: purple
* New coloured variants added to Button, EmptyState, and StatCard components

### Consistent Rounded-XL Border Radius
* Standardised all interactive elements from mixed `rounded-full`/`rounded-2xl` to `rounded-xl` (12px)
* Kept circular decorative elements and structural containers as-is

### Button Styling Standardisation
* Core Button component redesigned with fixed heights per size, consistent typography, refined states
* All PageHeader action buttons standardised to `size="sm"`

### Herd Form - Save/Cancel in PageHeader
* Removed bottom Save/Cancel buttons, moved to PageHeader with `form="herd-form"` attribute

### Reports Page Redesign
* Changed from vertical stack to 2-column responsive grid matching Tools page layout

### Freight IQ - Complete Rebuild
* Full rewrite matching iOS 3-step wizard: origin/herd selection, saleyard destination with haversine distance, editable assumptions, hero cost card with GST and breakdown

### Herd Form - iOS Alignment
* Removed Current Weight and Market Category fields (not in iOS)
* Added Mortality Rate (%) field

### Page Caching Fix
* Added `export const revalidate = 0` to Dashboard, Herds list, and Herd detail pages
* Prevents stale cached HTML after MLA CSV uploads

---

## 5 Mar 2026

### Settings Page Redesign
* Full rewrite with card-based layout: Profile (with role picker), Password, Data & Sync, Demo Data, Admin Tools (conditional), Danger Zone (with Delete Account confirmation modal)
* New `sign-out-button.tsx` and `delete-account-button.tsx` client components
* 5 files changed (365 insertions, 100 deletions)

### Valuation - Combined Query + Limit 500 Parity
* Root cause of iOS vs web discrepancy: iOS uses single combined query with `.limit(500)`, web had no limit
* All 3 pricing pages now use one combined query: `.in("saleyard", [...saleyards, "National"])`, category filter, expiry filter, DESC ordering, limit 500

### Price Data Accuracy - PostgREST Row Limit Fix
* Saleyard queries exceeded PostgREST's 1,000-row default limit (silently truncated)
* Added `.in("category", mlaCategories)` filter to narrow results to ~50-100 rows
* Brangus chat service restructured: national prices in parallel batch, saleyard prices sequential with filters

### Price Selection Fix
* `resolvePriceFromEntries()` was taking oldest entry instead of most recent
* Weight-range match: changed to take first entry (most recent, query is DESC)
* Fallback (no weight range): takes highest price

### Standardised Rounding
* Web already used `Math.round()` (standard rounding), matching iOS's updated `.halfUp` rule
* Both platforms now produce identical values

### Red Price Source Indicators
* Value card, herds table, and dashboard badge turn red when using national/fallback pricing
* New `calculateHerdValuation()` returning `priceSource`, `pricePerKg`, `breedPremiumApplied`

### Saleyard Name Resolution
* Added `resolveMLASaleyardName()` to map short app-side names to full MLA names
* Applied in valuation engine and all page-level saleyard queries

### Supabase Column Name Fixes
* `price_per_kg` to `final_price_per_kg`, `premium_percent` to `premium_pct` (using query aliases)
* National filter changed from `.is("saleyard", null)` to `.eq("saleyard", "National")`
* Prices converted from cents to dollars (/ 100)

### Local Breed Premium Fallback
* Premium map seeds with local `cattleBreedPremiums` before applying Supabase overrides

### Admin MLA CSV Upload
* New admin-only page with server-side email whitelist
* CSV format auto-detection, chunked upload with progress indicator
* First upload: 1,158 saleyard-specific prices for Armidale + Bairnsdale

### Brangus AI Chat
* 4 new files: types, tools (4 Anthropic tool definitions), chat service (system prompt, tool loop, sanitisation), React chat component
* Full tool use loop with max 5 rounds, sanitiseResponse strips em-dashes and mob/mobs

### Herd Detail - Value Display
* Parallel fetch of national prices, breed premiums, saleyard prices
* Value card with total value + per-head value

### Clear All Data
* New "Data Management" section in settings
* Calls `clear-user-data` Edge Function with double confirmation
* Affects both web and iOS (shared Supabase backend)

### Valuation Parity with iOS
* Full port of iOS `ValuationEngine+HerdValuation.swift` to TypeScript
* Projected weight, live MLA prices, breed premiums, mortality deduction, pre-birth breeding accrual
* 12-month chart also updated with full formula

### Saleyard-Specific Pricing
* 4-tier price resolution: saleyard general + premium, saleyard breed-specific (no premium), national + premium, fallback + premium
* National queries filtered with `.is("breed", null)`

### Sync Fix - herds to herds
* Web was querying non-existent `herds` table (iOS writes to `herds`)
* Updated 7 files, added `.eq("is_deleted", false)` filters
* Updated TypeScript types with sync metadata fields

### Yard Book - Full Implementation
* Run sheet with time horizon grouping, 5 category types with distinct colours
* Stat cards, category filter pills, show/hide completed toggle
* Detail page, form with all fields, soft-delete pattern matching iOS
* All mutations set `updated_at` for iOS sync

### Yard Book - Column Name Fix
* `category` to `category_raw`, `recurrence_rule` to `recurrence_rule_raw`

### Herd Valuation Engine
* Ported iOS `matchWeightRange()` to TypeScript
* Dashboard and herds page compute live portfolio values

### Premium UI Redesign
* Complete visual refresh: stat cards, pill filters, sortable table, ring borders, chevron animations
* Applied across all pages

### Property Grouping
* Herds grouped by property on herds page with header bars and subtotals

### Lucide-React Icons
* Replaced all inline SVGs with lucide-react components

### Soft-Delete for Deletion
* Hard deletes blocked by RLS, changed to soft-delete with `updated_at`

### Client-Generated UUIDs
* Added `crypto.randomUUID()` to herd and property inserts for sync compatibility

### iOS Sync Fix - updated_at
* Added `updated_at` to all create/update actions so iOS can detect web changes

### Soft-Deleted Properties Filtered
* Added `is_deleted = false` filter to property dropdowns and direct URL access

### Marketing Header
* Added "Log In" link to marketing site header

---

## 4 Mar 2026

### Sign in with Apple
* Apple OAuth on sign-in and sign-up pages
* Direct redirect to Apple, ID token via form_post, `signInWithIdToken` with Supabase
* SHA-256 nonce via Apple's state parameter

### 12-Month Outlook Chart
* Live Recharts AreaChart with projected portfolio value over 12 months
* Uses daily weight gain, head count, and fallback price per kg

### Dashboard Redesign
* Two-column flex layout: portfolio value + chart (left), profile + properties + Yard Book + Growth (right)

### Sidebar Redesign
* Expanded from 7 to 10 nav items, bottom section with Plan indicator, Help, Settings, Log Out
* Full `sw-logo.svg`, sticky positioning, no background

### Icon Updates
* Properties: `MapPinned`, Stockman IQ: `Brain`, cattle tags SVG updated

### Properties Query Fix
* `is_demo_data` corrected to `is_simulated` on dashboard

### Dashboard Polish
* Removed card border strokes, fixed CardContent padding

### Herds Page Fix
* PostgREST join silently failing, added fallback query without join

### Demo Data Seeder
* Doongara Station + 20 herds seeded when user has no data
* Fixed UUID generation, NOT NULL defaults, error handling

### UI Overhaul
* Dark theme matching iOS, colour tokens, sidebar styling, all pages scaffolded

### Loading Skeletons
* Animated skeleton screens for all major pages
* Vercel pinned to Sydney region (`syd1`)

---

## 3 Mar 2026

### Supabase Auth and App Shell
* Email/password auth, protected routes via middleware, OAuth callback handler
* Sidebar navigation, responsive layout

### TypeScript Types and Business Logic
* Database types, valuation engine, freight calculator, UI component library

### Database Tables
* All Supabase tables created with RLS policies, TypeScript types generated

### Properties and Herds CRUD
* Full CRUD with forms, list views, detail pages

### Dashboard with Real Data
* Wired to Supabase queries, settings page, freight calculator

### Landing Page
* Apple-style marketing page: hero with iPhone mockup, features, pricing, waitlist
