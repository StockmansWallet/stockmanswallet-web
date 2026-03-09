# Stockman's Wallet Web App - Build Updates

---

## 9 Mar 2026

### Cow Category Mapping Fix

Fixed cow category mapping that caused all cow herds to show fallback prices instead of saleyard data. `mapCategoryToMLACategory` was mapping "Breeder Cow" to "Breeding Cow" and "Cull Cow" to "Wet Cow", but the MLA data only has a single "Cows" category. Updated to map all cow types (Breeder Cow, Breeder Heifer, Wet Cow, Cull Cow) to "Cows", matching the iOS app. Also simplified `mlaCsvCategoryMapping` to use a single `"Cows|*"` wildcard instead of per-prefix entries (Processor, Restocker, Dairy, PTIC, Feeder).

**Files changed:**
- `lib/data/reference-data.ts` - Updated `mapCategoryToMLACategory` and `mlaCsvCategoryMapping`

### Formula Walkthrough Layout

Moved Price Data Source, Latest Data Source Date, and Category Mapping from inline in the calculation steps to a grouped reference section below the NetValue line, separated by a divider.

**Files changed:**
- `app/(app)/dashboard/admin/valuation/test-calculator.tsx` - Reorganised walkthrough layout

---

## 8 Mar 2026

### Data Cleanup - Future-Dated MLA Records Removed

Removed 29,178 future-dated records from `category_prices` table. These were accidentally uploaded from quarterly MLA CSV data instead of weekly, containing entries with `data_date` forward of today. Verified `mla_physical_reports` had zero future-dated records. No code changes required.

### Price Inconsistency Fix - Split Batch Queries

Fixed valuations showing different prices on batch pages (dashboard, herds list, admin) vs the herd detail page for the same herd. Root cause was twofold:

1. **Supabase `max_rows` was 1,000** (default). All `.limit(50000)` calls were silently capped at 1,000 rows. Batch pages querying multiple saleyards and categories exceeded 1,000 matching rows, so older saleyard data (e.g. Charters Towers from 2026-02-15) was truncated. The herd detail page queried a single saleyard and stayed under 1,000. Fixed by increasing `max_rows` to 50,000 via Supabase Management API.

2. **National prices crowded out by saleyard data.** Even with the row limit raised, a single combined query for saleyard + National data risks national entries being pushed out when saleyard datasets are large. Split the single price query into two parallel queries (saleyard prices + national prices) on all three batch pages. National prices now have a dedicated 5,000-row query that cannot be truncated by saleyard data volume.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Split combined price query into parallel saleyard + national queries
- `app/(app)/dashboard/herds/page.tsx` - Same split query pattern
- `app/(app)/dashboard/admin/valuation/page.tsx` - Same split query pattern

### Weight Bracket Boundary Selection Fix

Fixed non-deterministic weight bracket selection when a weight sits exactly on a bracket boundary (e.g. 400kg matching both "330-400" and "400-500"). The previous code used `candidates[0]` as fallback when no open-ended bracket existed, which depended on Supabase query result ordering. Now deterministically prefers the upper bracket (where weight matches the lower bound), consistent with the existing preference for open-ended brackets.

**Files changed:**
- `lib/engines/valuation-engine.ts` - Added upper-bracket preference in `matchWeightRange()` for ranged bracket boundaries

### Supabase Configuration

- Increased PostgREST `max_rows` from 1,000 to 50,000 via Management API. This is a server-side setting, no code change required.

### Admin Tools - Sidebar Navigation

Moved Valuation Validator and MLA Data Upload from the Settings page to their own admin-only section in the sidebar. Each tool has a unique colour theme (rose for Valuation Validator, emerald for MLA Data Upload). The section is only visible to admin emails.

**Files changed:**
- `components/app/sidebar.tsx` - Added admin section with `adminItems` array, gated by `isAdminEmail()`
- `app/(app)/dashboard/settings/page.tsx` - Removed admin tools card (they now live in the sidebar)

### Valuation Validator renamed to Valuation Lab

Renamed the admin tool from "Valuation Validator" to "Valuation Lab" across the sidebar, page header, and metadata title.

Major layout overhaul:
- Added icons to all 4 tabs (Table, Flask, Map Pin, Book). Active tab uses rose/maroon theme matching the sidebar.
- Summary strip now shows Herds, Total Head, Herds Net Value, Per Head, and price source badges. Removed standalone hero cards from top bar.
- Test Calculator results: Net Value and Per Head now appear as orange hero cards in a top row of the results grid, updating reactively as inputs change. Price Source sits alongside them.
- Breakdown cards use a 3-column grid layout.
- Formula walkthrough values rounded to 2 decimal places. Base Price, Price Data Source, and Latest Data Date shown on separate lines.
- Calculation Logic tab shows content directly (removed dropdown toggle), amber/yellow theme.
- Herd Breakdown table: moved beaker (test in calculator) icon from inline with herd name to its own column at the far right of each row for cleaner appearance.

**Files changed:**
- `app/(app)/dashboard/admin/valuation/valuation-validator.tsx` - Renamed, new summary strip, rose tab theme, icons
- `app/(app)/dashboard/admin/valuation/valuation-table.tsx` - Moved beaker icon to dedicated rightmost column
- `app/(app)/dashboard/admin/valuation/test-calculator.tsx` - Hero row for Net Value/Per Head, 3-col grid, 2dp rounding
- `app/(app)/dashboard/admin/valuation/logic-panel.tsx` - Removed dropdown, direct content display
- `app/(app)/dashboard/admin/valuation/page.tsx` - Updated title to "Valuation Lab"
- `components/app/sidebar.tsx` - Renamed sidebar item to "Valuation Lab"

### Herd Form - Removed Sex, Added Breed Premium

Removed the Sex field from the herd create/edit form (sex is now derived from category). Added a Breed Premium Override field to the Weight & Growth section, allowing users to override the automatic breed premium percentage. The placeholder shows the auto-applied premium (e.g. "Auto (9%)") so users can see what's being applied before deciding to override. The server actions now auto-derive sex from category keywords (Bull, Steer, Barrow, Buck, Wether = Male, everything else = Female).

Also removed the Sex info row from the herd detail page and added a Breed Premium row showing the applied premium percentage.

**Files changed:**
- `components/app/herd-form.tsx` - Removed Sex select, added Breed Premium Override input with auto-premium placeholder
- `app/(app)/dashboard/herds/actions.ts` - Added `deriveSexFromCategory()`, added `breed_premium_override` to create/update
- `app/(app)/dashboard/herds/[id]/page.tsx` - Removed Sex row, added Breed Premium row

### Valuation Engine - Calves at Foot

Added calves-at-foot value calculation to the web valuation engine, matching the iOS implementation. Parses the `additional_info` field for "Calves at Foot: X head, Y months, Z kg" data. Calculates calf value using species-specific daily weight gain (Cattle 0.9 kg/day, Sheep 0.25 kg/day) projected from the recording date. Calf value is added to the breeding accrual component.

Also fixed uncontrolled breeding accrual start date to use `created_at` (herd entry date) instead of `joined_date`, matching iOS behaviour.

**Files changed:**
- `lib/engines/valuation-engine.ts` - Added `parseCalvesAtFoot()`, `calculateCalfAtFootValue()`, wired into `calculateHerdValuation()`, fixed uncontrolled breeding start date
- `lib/brangus/types.ts` - Added `additional_info` and `calf_weight_recorded_date` to HerdRow interface
- `app/(app)/dashboard/page.tsx` - Added `additional_info`, `calf_weight_recorded_date`, `updated_at` to select query
- `app/(app)/dashboard/admin/valuation/page.tsx` - Added same fields to select query

### Valuation Validator - Formula Walkthrough Enhancements

Added category mapping info to the formula walkthrough (shows e.g. "Category Mapping: Breeder Cow -> Breeding Cow") so the MLA category lookup can be verified. Rounded all formula walkthrough values to 2 decimal places for readability (was 4dp). Also rounded the Base $/kg and Adj $/kg result cards to 2dp.

**Files changed:**
- `app/(app)/dashboard/admin/valuation/test-calculator.tsx` - Added category mapping line, 2dp rounding throughout walkthrough and price cards

### MLA Category Mapping - PTIC and Feeder Cows

Added `Cows|PTIC` and `Cows|Feeder` to the CSV category map, both mapping to "Breeding Cow". Previously these MLA sale prefixes had no mapping and fell through unmatched. PTIC (Pregnant Tested In Calf) and Feeder cows now group with Breeding Cow pricing.

**Files changed:**
- `lib/data/reference-data.ts` - Added PTIC and Feeder cow mappings to `csvCategoryMap`

### Data Cleanup - Quarterly MLA Records Purged

Deleted all quarterly historical data from the `category_prices` table (293,308 rows across 9 quarterly dates from 2023-12-31 to 2025-12-31). This data was accidentally uploaded from quarterly MLA CSVs and contained only Breeding Cow category, polluting price lookups for saleyards that didn't have more recent weekly data. Also deleted remaining stale weekly data (4,012 rows from 2024-2025). Table cleared entirely in preparation for fresh weekly CSV uploads going back to 2024.

---

## 7 Mar 2026

### UI Polish - Filter Pills, Icons, Colours, Layout

Unified filter pill styling across the app to use `rounded-full` with no stroke, matching the Yard Book reference. Updated tool page icon colours to match iOS (lime for Yard Book, sky for Freight IQ, amber for Reports, teal for Grid IQ). Replaced PawPrint livestock icons with the custom IconCattleTags SVG component across Yard Book form, run sheet, and detail page.

Rewrote the dashboard skeleton loader to match the current dashboard layout (two-column with Portfolio Value, 12-Month Outlook, Herd Composition, Largest Herds on the left and User Profile, Quick Actions, Coming Up, Properties, Growth & Mortality on the right).

Reordered herds list table columns to: HEAD / NAME / BREED / CATEGORY / $/KG / WEIGHT / VALUE. Added a new $/kg column using the valuation engine's `pricePerKg` output. Changed the herd detail page from CSS grid to two independent flex columns that size independently (matching the iOS layout).

**Files changed:**
- `app/(app)/dashboard/herds/herds-table.tsx` - Reordered columns, added $/kg column and `price_per_kg` sort key, changed filter pills to rounded-full
- `app/(app)/dashboard/herds/page.tsx` - Added `herdPricePerKgObj` computation, passes to HerdsTable
- `app/(app)/dashboard/herds/[id]/page.tsx` - Changed from grid to two independent flex columns
- `app/(app)/dashboard/loading.tsx` - Complete rewrite to match current dashboard layout
- `app/(app)/dashboard/tools/page.tsx` - Added per-tool `iconBg` and `iconText` colour properties
- `components/app/yard-book-form.tsx` - Replaced PawPrint with IconCattleTags, rounded-full pills
- `components/app/yard-book-run-sheet.tsx` - Replaced PawPrint with IconCattleTags
- `app/(app)/dashboard/tools/yard-book/[id]/page.tsx` - Replaced PawPrint with IconCattleTags

### Property Header Always Visible

Changed the herds list to show property group headings even when only one property exists. Previously the property header (with icon, name, head count and value) was only shown when the user had multiple properties. Now it shows whenever at least one property exists, giving consistent visual structure.

**Files changed:**
- `app/(app)/dashboard/herds/herds-table.tsx` - Changed `showPropertyHeaders` condition from `propertyGroups.length > 1` to `propertyGroups.length > 0`

---

### Valuation Engine - Stale Weight Bracket Fix

Fixed a critical valuation bug where weights above the highest bracket in the current MLA data (e.g. 400+ kg) would fall back to stale pricing from older data uploads instead of clamping to the nearest available bracket on the current date. This caused incorrect valuations, for example an Angus Yearling Steer at Charters Towers showing $4.51/kg (stale Dec 2025 "400+" data) instead of $4.13/kg (current Mar 2026 "330-400" bracket + 9% Angus breed premium).

Root cause: the previous algorithm walked across all dates looking for a matching weight bracket. When the newest data (Mar 2026) didn't include a "400+" bracket, it fell back to Dec 2025 stale data that did have one. The fix constrains price resolution to only use brackets available on the newest date, clamping to the nearest bracket when no exact match exists.

Also includes the earlier bracket matching fix from the same session: weight ranges now use inclusive bounds (weight >= min AND weight <= max), and boundary weights (e.g. exactly 400kg) prefer the upper bracket ("400+" over "330-400"). Both web and iOS apps now use the same three-function bracket matching approach.

**Files changed:**
- `lib/engines/valuation-engine.ts` - Rewrote `resolvePriceFromEntries()` to use newest-date-only resolution. Added `findCandidateBrackets()`, `clampToNearestBracket()`, and updated `matchWeightRange()` wrapper with inclusive bounds and boundary preference.
- `app/(app)/dashboard/page.tsx` - Added `data_date` to price query select and entry construction
- `app/(app)/dashboard/herds/page.tsx` - Added `data_date` to price query select and entry construction
- `app/(app)/dashboard/herds/[id]/page.tsx` - Added `data_date` to price query select and entry construction
- `lib/brangus/chat-service.ts` - Added `data_date` to both national and saleyard price queries

---

## 6 Mar 2026

### Valuation Pipeline Fix - Query Limit

Raised the Supabase category_prices query limit from 500 to 50,000 across all three pricing pages (dashboard, herds list, herd detail). Some saleyards (e.g. Gracemere) have 9,845+ rows, so the old limit was clipping most of the pricing data and causing valuations to fall back to national averages.

Also fixed the price resolution order in the valuation engine. Previously it checked saleyard general, then national, then saleyard breed-specific. Since most MLA data is breed-specific (breed != null), national always won before breed-specific got checked. Reordered to: saleyard general, saleyard breed-specific, national, hardcoded fallback.

Fixed the demo data seeder using the wrong saleyard name format and only setting saleyards on 2 of 20 herds. All 20 demo herds now get a saleyard.

**Files changed:**
- `lib/engines/valuation-engine.ts` - Fixed price resolution order
- `app/(app)/dashboard/page.tsx` - Raised query limit to 50,000
- `app/(app)/dashboard/herds/page.tsx` - Raised query limit to 50,000
- `app/(app)/dashboard/herds/[id]/page.tsx` - Raised query limit, restructured detail sections
- `app/(app)/dashboard/herds/actions.ts` - Added current_weight to create/update
- `components/app/herd-form.tsx` - Added current_weight input field
- `app/(app)/dashboard/settings/demo-actions.ts` - Fixed saleyard name, applied to all herds

### Herd Detail Page - Aligned with iOS

Restructured the web herd detail page to match the iOS app's sections and fields:
- Added Key Metrics card (price/kg, average weight, value per head, saleyard)
- Added Current Weight to Weight Tracking section
- Added Mortality Rate to Location section
- Added Timeline section (days held, created date, last updated)
- Added Notes section spanning full width

### Herd Form - Added Current Weight Field

Added the missing `current_weight` input to the herd create/edit form and server actions. Previously herds created on the web had null current_weight, showing "---" on the detail page.

### MLA Scraper Edge Function - Historic Data Fix

Fixed a critical bug in the `mla-scraper` Supabase Edge Function that caused all uploaded MLA saleyard CSV data to be wiped on each sequential upload. When uploading 41 CSV files, only the last file's data survived because the transactions handler deleted ALL rows matching "MLA Transactions%" before each file's insert. Additionally, the per-saleyard dedup logic had a destructuring bug that made the date always undefined.

Three fixes applied:
- Removed the broad delete of all transaction rows. Historic data now accumulates across uploads.
- Fixed the combo key destructuring from `const [saleyard, , , dataDate]` to `const [saleyard, dataDate]` so per-saleyard+date dedup works correctly.
- CSV mode handler now captures and returns `prices_inserted` and `insert_errors` in the response for visibility.

This fix affects both the iOS and web apps since they share the same Supabase category_prices table.

**Files changed:**
- `supabase/functions/mla-scraper/index.ts` - Three fixes in storeCategoryPrices and handleTransactionsCsvMode

### Brangus Chat Bubbles - Warm Brown Colour

Updated the Brangus chat assistant message bubbles from `bg-white/5` to warm brown (`bg-[#4D331F]`), matching the iOS app's `Theme.StockmanIQ.chatBubbleAI` colour. Also applied to the typing indicator. Added a spring-like slide-up entrance animation matching the iOS chat bubble transition.

**Files changed:**
- `components/app/brangus-chat.tsx` - Bubble background colour and animate-bubble-in class
- `app/globals.css` - New `@keyframes bubble-in` and `@utility animate-bubble-in`

### Per-Tool Accent Colours

Added tool-specific accent colours throughout the app, matching each tool's iOS theme colour. Each tool now has its own colour identity instead of defaulting to the brand orange.

**Colour mapping (iOS to Tailwind):**
- Grid IQ: teal (#00B4A0 -> `teal-500`)
- Freight IQ: blue (#1399EC -> `sky-500`)
- Yard Book: green (#87B11B -> `lime-500/600`)
- Reports: amber (#D4A053 -> `amber-500`)
- Advisory Hub: purple (#9C6ADE -> `purple-500`)

Applied to sidebar active states, buttons, empty states, stat card icons, section icons, links, and filter pills across all tool pages. The Button, EmptyState, and StatCard components all gained new variant/accent props.

**Files changed:**
- `components/ui/button.tsx` - 5 new coloured variants
- `components/ui/empty-state.tsx` - Variant prop with 6 colour options
- `components/ui/stat-card.tsx` - Accent prop for icon backgrounds
- `components/app/sidebar.tsx` - Per-tool activeClass on tool items
- `components/app/mobile-nav.tsx` - Same activeClass pattern with fallback
- All tool page files updated with tool-specific colours

### Consistent Rounded-XL Border Radius

Standardised all interactive elements to `rounded-xl` (12px). Previously buttons used `rounded-full` (pill) and nav items used `rounded-2xl`. Now everything uses `rounded-xl` for a cohesive, slightly rounded look. Circular icons/avatars and structural containers (cards, modals) kept as-is.

**Files changed:**
- `components/ui/button.tsx` - All size classes
- `components/ui/empty-state.tsx` - Action buttons
- `components/ui/tabs.tsx` - Tab bar and buttons
- `components/app/sidebar.tsx` - All nav items
- `components/app/mobile-nav.tsx` - All nav items
- Multiple page files updated for inline styled links and filter pills

### Button Styling Standardisation

Redesigned the core Button component for Apple-quality styling. All buttons now use `rounded-full` pill shape with fixed heights per size (sm=h-8, md=h-9, lg=h-11), consistent typography, and refined hover/active states. Primary variant has `shadow-sm` and softer `active:scale-[0.97]`. All PageHeader action buttons standardised to `size="sm"`.

**Files changed:**
- `components/ui/button.tsx` - Core button redesign
- Multiple page files - PageHeader button size standardisation

### Herd Form - Save/Cancel Moved to PageHeader

Removed the bottom Save/Cancel buttons from the herd form. Cancel now appears as a styled link in the PageHeader actions alongside the Save button, using the `form="herd-form"` attribute for cross-element form submission.

**Files changed:**
- `components/app/herd-form.tsx` - Removed bottom action buttons
- `app/(app)/dashboard/herds/new/page.tsx` - Added Cancel link + Save button to PageHeader
- `app/(app)/dashboard/herds/[id]/edit/page.tsx` - Same pattern

### Reports Page Layout Redesign

Redesigned the reports page from a vertical stack to a 2-column responsive grid matching the Tools page layout. Larger icon containers (h-10 w-10), `items-start` alignment, `CardContent` wrapper.

**Files changed:**
- `app/(app)/dashboard/tools/reports/page.tsx` - 2-column grid layout

### Freight IQ - Complete Rebuild (iOS Parity)

Rebuilt the Freight IQ calculator to match the iOS app's 3-step wizard flow with real data from Supabase.

**Step 1 (Origin & Herd):** Property selector and herd selector. Selecting a herd auto-fills weight, head count, heads per deck, and sets the origin property. "Custom Job" option for manual entry.

**Step 2 (Sale Destination):** Saleyard picker from reference data with auto-distance calculation using haversine formula with 1.3x road factor.

**Step 3 (Freight Assumptions):** 5-field grid (Avg Weight, Head Count, Distance, Head Per Deck, Rate) matching iOS layout. All pre-filled but editable.

**Results:** Centred hero cost card with +GST, icon-row breakdown card, inline assumptions summary, coloured alert cards for weight warnings.

**Files changed:**
- `app/(app)/dashboard/tools/freight/page.tsx` - Server component fetching herds and properties
- `app/(app)/dashboard/tools/freight/freight-calculator.tsx` - Complete rewrite with 3-step flow

### Herd Form - Aligned with iOS

Updated the web herd edit/create form to match the iOS edit herd screen:
- Removed "Current Weight" field (not in iOS - weight is calculated from initial weight + daily gain)
- Removed "Market Category" field (not in iOS)
- Added "Mortality Rate (%)" field (was missing from web form, stored as decimal in the database)

Also removed "Current Weight" from the herd detail page to match iOS.

**Files changed:**
- `components/app/herd-form.tsx` - Removed Current Weight and Market Category inputs, added Mortality Rate
- `app/(app)/dashboard/herds/actions.ts` - Removed current_weight and market_category, added mortality_rate
- `app/(app)/dashboard/herds/[id]/page.tsx` - Removed Current Weight InfoRow

### Page Caching Fix

Added `export const revalidate = 0` to the Dashboard, Herds list, and Herd detail pages. This ensures the web always fetches fresh data from Supabase instead of serving cached HTML, which was causing stale valuation numbers after uploading new MLA price data.

**Files changed:**
- `app/(app)/dashboard/page.tsx`
- `app/(app)/dashboard/herds/page.tsx`
- `app/(app)/dashboard/herds/[id]/page.tsx`

---

## 5 Mar 2026

### Settings Page Redesign

The web app settings page has been completely redesigned to match the quality and organisation of the iOS settings. Previously it was a basic list of fields. Now it's a polished, card-based layout with clear sections, icons, and descriptions.

What's included:

- **Profile card** with first name, last name, email (read-only), and a new role picker (Farmer/Grazier, Agribusiness Banker, Insurer, Livestock Agent, Accountant, Succession Planner). Role is saved to the user_profiles table, matching iOS.
- **Password card** beside the profile card on desktop (two-column layout).
- **Data & Sync card** with the existing "Clear All Data" button and a description explaining it affects both web and iOS.
- **Demo Data card** with load/clear Doongara Station buttons.
- **Admin Tools card** (only visible to admin team emails) with the MLA CSV Upload link.
- **Danger Zone** at the bottom with a red-tinted border, containing Sign Out and Delete Account buttons. Delete Account opens a confirmation modal that requires typing "DELETE" before proceeding.

**Files changed:**
- `app/(app)/dashboard/settings/page.tsx` - Full rewrite with card-based layout and icon headers
- `app/(app)/dashboard/settings/profile-form.tsx` - Added role Select
- `app/(app)/dashboard/settings/actions.ts` - Added signOut, deleteAccount, updated updateProfile
- `app/(app)/dashboard/settings/sign-out-button.tsx` - New client component
- `app/(app)/dashboard/settings/delete-account-button.tsx` - New client component with confirmation modal

### Valuation Now Matches iOS Exactly (Final Fix)

Resolved the last remaining difference between iOS and web herd valuations. Both platforms now show identical dollar values for the same herd.

The issue was how much price history each platform was looking at. iOS fetches the most recent 500 price entries across all weight ranges, breeds, and sources for a given saleyard. The web was fetching everything with no limit. All three web pages now use the same query pattern as iOS:
- Saleyard and National prices fetched in a single combined query
- Results limited to the most recent 500 entries
- Expired price entries filtered out

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Merged national + saleyard into single query, added limit 500 + expiry filter
- `app/(app)/dashboard/herds/page.tsx` - Same pattern
- `app/(app)/dashboard/herds/[id]/page.tsx` - Same pattern

### Price Data Accuracy Fix

Fixed two issues causing the web app to calculate herd valuations differently from iOS.

1. **Incomplete price data.** The MLA price database has over 345,000 entries. When looking up saleyard-specific prices, the web was requesting all price rows for a saleyard at once (e.g. 7,000+ rows for Armidale). The database silently cuts off results at 1,000 rows. Now the queries are filtered to only fetch prices relevant to your herd's category, bringing the result set down to around 50-100 rows.

2. **Using oldest price instead of newest.** When multiple MLA sale records exist for the same weight range, the web was picking the first (oldest) entry. Changed to match iOS behaviour, using the latest sale data for each weight range.

**Files changed:**
- `lib/engines/valuation-engine.ts` - Updated `resolvePriceFromEntries` for weight-range and fallback matching
- `app/(app)/dashboard/page.tsx` - Added category filter to saleyard query
- `app/(app)/dashboard/herds/page.tsx` - Same category filter
- `app/(app)/dashboard/herds/[id]/page.tsx` - Single-herd category filter
- `lib/brangus/chat-service.ts` - Split into parallel national + sequential saleyard fetch with category filter

### Price Selection Fix (Most Recent vs Oldest)

Fixed a bug where the wrong MLA price entry was being used for valuations. When multiple sale records exist for the same weight range, `resolvePriceFromEntries()` was taking the last entry in the array. Since the query orders by date descending, the last entry is the oldest. Changed to take the first entry (most recent).

**Files changed:**
- `lib/engines/valuation-engine.ts` - `matched[matched.length - 1]` changed to `matched[0]`

### Standardised Rounding

Changed how dollar values are rounded so they always match the iOS app. The web already used `Math.round()` (standard rounding), which matches iOS's updated `.halfUp` rounding rule. Both platforms now produce identical values to the dollar.

### Red Price Indicators (Matching iOS)

When a herd's value is calculated using national average prices instead of saleyard-specific pricing, the value now shows in red text with a warning label.

- **Herd detail page:** Value card turns red with a warning icon and "National Avg" or "Est. Fallback" badge
- **Herds list table:** Value column text turns red for herds without saleyard-specific pricing
- **Dashboard:** Small red badge below the portfolio value shows how many herds are using national averages

**Files changed:**
- `lib/engines/valuation-engine.ts` - New `calculateHerdValuation`, `HerdValuationResult` type, `PriceSource` type
- `app/(app)/dashboard/herds/[id]/page.tsx` - Red AlertTriangle icon, price source badge
- `app/(app)/dashboard/herds/herds-table.tsx` - New `herdSources` prop, red text for fallback
- `app/(app)/dashboard/page.tsx` - Fallback herd count badge

### Admin MLA CSV Upload

New admin-only page for uploading MLA market data CSV files directly from the browser. The page is only visible to admin accounts (Leon, Mil, Luke). Server-side email whitelist gate, CSV format auto-detection, chunked transaction upload with progress indicator.

**Files changed:**
- `app/(app)/dashboard/admin/mla-upload/page.tsx` - Admin gate with email whitelist
- `app/(app)/dashboard/admin/mla-upload/mla-uploader.tsx` - CSV parser, format detection, chunked upload
- `app/(app)/dashboard/settings/page.tsx` - Admin section with link to MLA upload

### Brangus AI Chat Now Live

You can now chat with Brangus on the web app, the same AI livestock advisor from iOS. Text chat only (no voice features on web). Brangus has access to portfolio data lookup, Freight IQ calculations, and Yard Book event creation and management.

**Files changed:**
- `components/app/brangus-chat.tsx` - Interactive chat component with message list, input, suggested prompts
- `lib/brangus/chat-service.ts` - Chat API service layer with system prompt, tool loop, sanitisation
- `lib/brangus/tools.ts` - 4 tool definitions: lookup_portfolio_data, calculate_freight, create_yard_book_event, manage_yard_book_event
- `lib/brangus/types.ts` - Chat message and conversation types
- `app/(app)/dashboard/stockman-iq/chat/page.tsx` - Replaced placeholder with BrangusChat component

### Herd Value Now Shown on Individual Pages

The herd detail page now shows the estimated market value with a per-head value. Fetches national prices, breed premiums, and saleyard-specific prices in parallel, then runs `calculateHerdValue`.

**Files changed:**
- `app/(app)/dashboard/herds/[id]/page.tsx` - Parallel price fetching, valuation card

### Clear All Data

Added a "Data Management" section to settings with a "Clear All Data" button. Calls the `clear-user-data` Supabase Edge Function to permanently delete all user herds, records, and data from the cloud. Double confirmation dialog. Affects both web app and iOS app (shared Supabase backend). Account remains active.

**Files changed:**
- `app/(app)/dashboard/settings/demo-actions.ts` - Added `clearAllUserData` server action
- `app/(app)/dashboard/settings/demo-buttons.tsx` - Added `ClearAllDataButton` with double confirmation
- `app/(app)/dashboard/settings/page.tsx` - Added "Data Management" section

### Valuation Parity - Portfolio Value Now Matches iOS

The web app dashboard was showing a different portfolio value to the iOS app for the same herds. The web was using hardcoded static prices while iOS uses live MLA market prices.

The web app's valuation engine has been updated to match the iOS formula exactly:
- Live MLA prices fetched from Supabase at page load
- Breed premiums applied from the `breed_premiums` table, with per-herd override support
- Weight projected from purchase weight using daily weight gain and actual days held (split DWG supported)
- Annual mortality deduction applied on base market value (5% default)
- Pre-birth breeding accrual for pregnant breeders with a joining date
- Static fallback prices used automatically if Supabase has no data for a category

12-month chart also updated to project forward correctly using the same full formula.

**Files changed:**
- `lib/engines/valuation-engine.ts` - Full port of iOS ValuationEngine formula
- `lib/types/database.ts` - Added `category_prices` and `breed_premiums` table types
- `app/(app)/dashboard/page.tsx` - Live price fetching, portfolio value calculation, chart projection

### Sync Fix - Herds Not Appearing in Web Dashboard

The web app was querying a table called `herds` which does not exist in Supabase. The iOS sync system writes all herd data to `herd_groups`. Updated all queries from `"herds"` to `"herd_groups"` across 7 files. Added `.eq("is_deleted", false)` filter so soft-deleted records never appear.

**Files changed:**
- `app/(app)/dashboard/herds/page.tsx` - Table name + is_deleted filter
- `app/(app)/dashboard/herds/[id]/page.tsx` - Same
- `app/(app)/dashboard/herds/[id]/edit/page.tsx` - Same
- `app/(app)/dashboard/herds/actions.ts` - Table name in insert/update/delete
- `app/(app)/dashboard/page.tsx` - Table name + is_deleted filters
- `app/(app)/dashboard/properties/page.tsx` - is_deleted filter
- `app/(app)/dashboard/settings/demo-actions.ts` - Table name
- `lib/types/database.ts` - Renamed `herds` type to `herd_groups`, added sync metadata fields

### Saleyard-Specific Pricing

Valuation engine now follows the iOS price hierarchy with 4 tiers:
1. Saleyard general (breed=null) + breed premium
2. Saleyard breed-specific (no breed premium - already reflected in price)
3. National (breed=null) + breed premium
4. Hardcoded category fallback + breed premium

National price queries now also filter with `.is("breed", null)` to avoid mixing breed-specific rows.

**Files changed:**
- `lib/engines/valuation-engine.ts` - 4-tier hierarchy, `saleyardBreedPriceMap` parameter, `skipBreedPremium` flag
- `app/(app)/dashboard/page.tsx` - Splits saleyard prices by breed, national breed filter
- `app/(app)/dashboard/herds/page.tsx` - Same
- `app/(app)/dashboard/herds/[id]/page.tsx` - Same
- `lib/brangus/chat-service.ts` - Same 3-map split

### Saleyard Name Resolution

App-side saleyard names (e.g. "Charters Towers") don't always match MLA's full names (e.g. "Charters Towers Dalrymple Saleyards"). Added `resolveMLASaleyardName()` to map short names to full MLA names before querying `category_prices`.

**Files changed:**
- `lib/engines/valuation-engine.ts` - Calls `resolveMLASaleyardName` before building lookup keys
- `app/(app)/dashboard/herds/[id]/page.tsx` - Resolves saleyard name before query
- `app/(app)/dashboard/herds/page.tsx` - Resolves saleyard names before query

### Supabase Column Name Fixes

Fixed column names to match the actual Supabase schema. `price_per_kg` to `final_price_per_kg` (aliased as `price_per_kg` in queries), `premium_percent` to `premium_pct` (aliased as `premium_percent`). National prices filtered with `.eq("saleyard", "National")` instead of `.is("saleyard", null).is("state", null)`. Prices converted from cents to dollars (/ 100) in all price maps.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Column aliases, cents to dollars, national filter
- `app/(app)/dashboard/herds/page.tsx` - Same
- `app/(app)/dashboard/herds/[id]/page.tsx` - Same
- `lib/brangus/chat-service.ts` - Same

### Local Breed Premium Fallback

Premium map now seeds with local `cattleBreedPremiums` from reference data before applying Supabase overrides, matching the iOS `BreedPremiumService` pattern. Ensures valuations work even when the breed_premiums table is empty.

**Files changed:**
- All 4 pricing pages seeded from `cattleBreedPremiums`

### Yard Book Field Renames

Renamed `category` to `category_raw` and `recurrence_rule` to `recurrence_rule_raw` to match the actual Supabase column names.

**Files changed:**
- `lib/types/database.ts` - Updated Row/Insert/Update types
- `app/(app)/dashboard/tools/yard-book/actions.ts` - Updated create and update actions
- `app/(app)/dashboard/tools/yard-book/[id]/page.tsx` - Updated detail page
- `app/(app)/dashboard/tools/yard-book/[id]/edit/page.tsx` - Updated edit page
- `components/app/yard-book-form.tsx` - Updated form defaults
- `components/app/yard-book-run-sheet.tsx` - Updated filtering and category lookups

### Yard Book - Full Implementation

Complete Yard Book feature matching the iOS app. The run sheet groups items by time horizon (Overdue, Today, Next 7 Days, Next 30 Days, Next 90 Days, Later) with colour-coded countdown badges. Five category types with distinct colours: Livestock (orange), Operations (amber), Finance (blue), Family (purple), Me (green).

Main page shows 4 stat cards, category filter pills with counts, and a show/hide completed toggle. Detail page has overview, event, reminders, linked herds, and notes cards. Form supports date/time with all-day toggle, category chips, reminder offsets, recurrence, multi-select herd linking, and property assignment.

All mutations set `updated_at` for iOS sync compatibility. Soft-delete pattern matches iOS.

**Files changed:**
- `app/(app)/dashboard/tools/yard-book/actions.ts` - Server actions
- `app/(app)/dashboard/tools/yard-book/page.tsx` - Main page
- `app/(app)/dashboard/tools/yard-book/new/page.tsx` - Create page
- `app/(app)/dashboard/tools/yard-book/[id]/page.tsx` - Detail page
- `app/(app)/dashboard/tools/yard-book/[id]/edit/page.tsx` - Edit page
- `app/(app)/dashboard/tools/yard-book/[id]/delete-button.tsx` - Delete with confirmation
- `app/(app)/dashboard/tools/yard-book/[id]/toggle-complete-button.tsx` - Mark complete/incomplete
- `components/app/yard-book-form.tsx` - Shared form component
- `components/app/yard-book-run-sheet.tsx` - Run sheet with horizon grouping

### Herd Valuation Engine

Added weight-range bracket matching to the valuation engine, matching the iOS `matchWeightRange()` logic. The herds page and dashboard now compute live portfolio values from MLA category prices and breed premiums.

**Files changed:**
- `lib/engines/valuation-engine.ts` - Added `CategoryPriceEntry` type, `matchWeightRange()`, updated `calculateHerdValue`
- `lib/types/database.ts` - Added `category_prices` and `breed_premiums` table types
- `app/(app)/dashboard/page.tsx` - Fetches prices/premiums, computes portfolio value
- `app/(app)/dashboard/herds/page.tsx` - Fetches prices/premiums, computes per-herd values

### Premium UI Redesign

Complete visual refresh across the entire web app. Stat cards, species pill filters, sortable table, responsive column hiding on herds page. Same premium treatment applied to all other pages: properties, tools, reports, market, settings, Stockman IQ, chat, yard book, Grid IQ, and freight calculator.

**Files changed:**
- `components/ui/card.tsx` - Added ring border
- `app/(app)/dashboard/herds/herds-table.tsx` - Full rewrite with pill filters, sortable columns, search
- Multiple page files across the app

### Property Grouping on Herds Page

Herds are now grouped by property. Each property renders as its own card with a header showing property name, "Primary" badge for the default property, and subtotals for head count and value.

**Files changed:**
- `app/(app)/dashboard/herds/page.tsx` - Property groups, sorted (default first)
- `app/(app)/dashboard/herds/herds-table.tsx` - Groups herds by property_id

### Lucide-React Icons

Replaced all inline SVG icons across the app with lucide-react components to match the iOS app's SF Symbols usage.

**Files changed:**
- Multiple files across dashboard, herds, properties, tools, reports, and settings

### Soft-Delete for Herd and Property Deletion

Hard `.delete()` calls were blocked by Supabase RLS policies. Changed all delete operations to soft-delete using `.update({ is_deleted: true, deleted_at, updated_at })`.

**Files changed:**
- `app/(app)/dashboard/herds/actions.ts` - Soft-delete with updated_at
- `app/(app)/dashboard/properties/actions.ts` - Soft-delete with updated_at
- `app/(app)/dashboard/settings/demo-actions.ts` - Soft-delete for demo data

### Herd Creation Fix - Client-Generated UUIDs

Both `herd_groups` and `properties` tables require client-generated UUIDs for offline-first sync compatibility. Added `id: crypto.randomUUID()` to insert operations.

**Files changed:**
- `app/(app)/dashboard/herds/actions.ts` - UUID on herd insert
- `app/(app)/dashboard/properties/actions.ts` - UUID on property insert

### iOS Sync Fix - updated_at on All Mutations

Herd and property create/update actions were not setting `updated_at`, so the iOS app couldn't detect changes made on the web. Added `updated_at: new Date().toISOString()` to all create and update actions.

**Files changed:**
- `app/(app)/dashboard/herds/actions.ts` - Added updated_at
- `app/(app)/dashboard/properties/actions.ts` - Added updated_at

### Soft-Deleted Properties Filtered from All Queries

Fixed soft-deleted demo properties still appearing in property dropdowns.

**Files changed:**
- `app/(app)/dashboard/herds/new/page.tsx` - Added is_deleted filter
- `app/(app)/dashboard/herds/[id]/edit/page.tsx` - Same
- `app/(app)/dashboard/properties/[id]/page.tsx` - Same

### Marketing Header - Log In Link

Added a "Log In" link to the marketing site header so visitors can navigate to the sign-in page.

**Files changed:**
- `components/marketing/header.tsx` - Added Log In navigation link

---

## 4 Mar 2026

### Sign in with Apple

Added Apple OAuth as a login option on both the sign-in and sign-up pages. The implementation redirects directly to Apple's authorization endpoint, receives the ID token via form_post, and creates the Supabase session using `signInWithIdToken`. A SHA-256 nonce is generated server-side and carried through Apple's state parameter.

**Files changed:**
- `app/(auth)/actions.ts` - `signInWithApple` server action
- `app/(auth)/auth/apple-callback/route.ts` - POST handler for Apple's form_post
- `app/(auth)/auth/callback/route.ts` - Improved cookie handling
- `app/(auth)/sign-in/page.tsx` - Added "Continue with Apple" button
- `app/(auth)/sign-up/page.tsx` - Same

### 12-Month Outlook Chart

Replaced the static bar chart placeholder with a live Recharts AreaChart showing projected portfolio value over the next 12 months. Uses each herd's head count, current weight, daily weight gain, and price per kg.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - 12-month projection data generation
- `app/(app)/dashboard/portfolio-chart.tsx` - Recharts AreaChart with gradient fill

### Dashboard Redesign

Complete redesign from single-column to two-column flex layout. Left column holds the portfolio value card and chart. Right column holds user profile, properties, Coming Up (Yard Book), and Growth & Mortality cards.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Two-column layout, renamed "Total Portfolio Value" to "Total Herd Value"

### Sidebar Redesign

Expanded from 7 to 10 top-level nav items. Added bottom section with Plan indicator, Help Center, Settings, and Log Out. Full logo with orange tally marks. Sticky positioning, no background.

**Files changed:**
- `components/app/sidebar.tsx` - Full redesign
- `components/app/mobile-nav.tsx` - Matching updates
- `app/(app)/layout.tsx` - Adjusted sidebar padding

### Icon Updates

Replaced custom icons with Lucide equivalents. Properties: `MapPinned`. Stockman IQ: `Brain`. Updated cattle tags SVG to filled evenOdd style.

**Files changed:**
- `components/icons/icon-cattle-tags.tsx` - Updated SVG
- `components/app/sidebar.tsx` - Icon swaps
- `components/app/mobile-nav.tsx` - Same

### Properties Query Fix

Fixed dashboard properties query using wrong column name (`is_demo_data` instead of `is_simulated`), which caused Supabase to return null and hide all properties.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Corrected column name to `is_simulated`

### Dashboard Polish

Removed card border strokes across all pages and fixed inconsistent CardContent padding.

### Herds Page Fix

Fixed demo herds not appearing. The herds query uses a PostgREST join that was silently failing. Added a fallback query without the join.

**Files changed:**
- `app/(app)/dashboard/herds/page.tsx` - Fallback query
- `app/(app)/dashboard/herds/[id]/page.tsx` - Same

### Demo Data Seeder

Built a demo data system that seeds Doongara Station property + 20 herds when the user has no data. Fixed Supabase insert issues: UUID generation, NOT NULL defaults, error surfacing, flag-based approach.

**Files changed:**
- `app/(app)/dashboard/demo-data.ts` - Demo data definitions and insert logic
- `app/(app)/dashboard/page.tsx` - Triggers demo seeding

### UI Overhaul

Complete visual overhaul to match iOS dark theme. Neutral dark backgrounds, design system colour tokens, sidebar styling. All pages scaffolded from iOS feature map.

**Files changed:**
- `tailwind.config.ts` - Design system colour tokens
- All layout and page files

### Loading Skeletons and Region Pinning

Added loading skeleton screens for all major pages. Pinned Vercel serverless functions to Sydney region (`syd1`).

**Files changed:**
- `app/(app)/dashboard/loading.tsx` - Dashboard skeleton
- `vercel.json` - Region configuration

---

## 3 Mar 2026

### Supabase Auth and App Shell

Set up authentication with Supabase: sign-in, sign-up, sign-out, email/password auth. Built the app shell with sidebar navigation, middleware for auth-protected routes, and initial dashboard scaffold.

**Files changed:**
- `app/(auth)/` - Auth pages and server actions
- `app/(auth)/auth/callback/route.ts` - OAuth callback handler
- `lib/supabase/` - Server and client Supabase client factories, middleware
- `middleware.ts` - Auth redirect middleware
- `app/(app)/layout.tsx` - App shell with sidebar

### TypeScript Types, Business Logic, and UI Components

Added type definitions for all database tables, business logic engines (valuation, freight), and shared UI component library.

**Files changed:**
- `types/` - Database and domain types
- `lib/engines/` - Valuation and freight calculation engines
- `components/ui/` - Shared component library

### Database Tables

Created all Supabase user data tables with row-level security policies. Generated TypeScript database types.

**Files changed:**
- `supabase/migrations/` - SQL migration files
- `types/supabase.ts` - Auto-generated database types

### Properties and Herds CRUD

Full create/read/update/delete flows for properties and herds.

**Files changed:**
- `app/(app)/dashboard/properties/` - Properties CRUD pages
- `app/(app)/dashboard/herds/` - Herds CRUD pages

### Dashboard with Real Data

Wired the dashboard to display real Supabase data. Added settings page and freight calculator.

**Files changed:**
- `app/(app)/dashboard/page.tsx` - Real data queries
- `app/(app)/dashboard/settings/` - Settings page
- `app/(app)/dashboard/tools/freight/` - Freight calculator

### Landing Page

Marketing landing page with Apple-style design: hero section with iPhone mockup, feature sections, pricing tiers, and waitlist signup.

**Files changed:**
- `app/page.tsx` - Landing page
- `public/images/` - Mockup screenshots and app icon
- `app/layout.tsx` - Font and global styles
- `tailwind.config.ts` - Initial theme configuration
