-- Backfill recent iOS and web updates into dev_updates table

-- iOS Build 0.5 (2) - 9 Mar 2026
INSERT INTO dev_updates (platform, date, build_label, title, summary, detail, sort_order) VALUES
('ios', '2026-03-09', 'Build 0.5 (2)', 'Valuation Fix - Breed Premiums on Fallback Prices',
 'Breed premiums were not applied when using national average fallback prices (all herds showed 0% premium)
Root cause: resolveGeneralBasePrice() returned nil for fallback prices, skipping breed premium logic entirely
Fix: fallback prices are now used as the base for breed premium calculation (matches web app)
Example: Angus Yearling Steer went from $4.10/kg (0%) to $4.47/kg (+9%) - now matches web',
 'Fixed a bug where breed premiums were not applied when using national average fallback prices. When no saleyard-specific MLA data existed, the valuation engine''s resolveGeneralBasePrice() returned nil (no "general" cache entry for fallback prices), which caused the breed premium logic to skip entirely. All herds showed "Inc 0% premium" and the base $4.10/kg rate regardless of breed.

The fix: when resolveGeneralBasePrice() returns nil but the raw price came from the hardcoded fallback (not a breed-specific MLA entry), the fallback price is now used as the base for breed premium calculation. This matches the web app''s behaviour.

Before: Angus Yearling Steer at 400kg = $4.10/kg = $1,640 (0% premium)
After: Angus Yearling Steer at 400kg = $4.47/kg = $1,789 (+9% Angus premium) - matches web

Files changed: ValuationEngine+HerdValuation.swift', 0),

('ios', '2026-03-09', 'Build 0.5 (2)', 'Launch Screen Fix - Rectangle Mask Animation',
 'Fixed recurring rectangle mask sweep glitch on app launch
Root cause: OnboardingView still used Group { switch } with .transition(.opacity) (RootView was fixed, OnboardingView was not)
Replaced with individual if blocks matching RootView pattern, removed all 8 transition modifiers',
 'Fixed the recurring visual glitch where a rectangle-shaped mask would sweep across the screen from top-left to bottom-right on app launch. The previous fix (Build 0.4) applied to RootView.swift was never carried through to OnboardingView.swift.

Root cause: OnboardingView used a Group { switch step } pattern with per-case .transition(.opacity) modifiers. SwiftUI''s structural identity system applies default insertion/removal transitions during content swaps inside Group, causing the rectangle mask effect.

Fix: replaced Group { switch } with individual if step == .xxx blocks inside the existing ZStack, matching the pattern already used in RootView.swift. Removed all 8 .transition(.opacity) modifiers.

Files changed: OnboardingView.swift', 1),

('ios', '2026-03-09', 'Build 0.5 (2)', 'Build Fixes',
 'Added missing import Supabase to EdgeFunctionHelper.swift (8 build errors)
Removed orphaned } catch { block from StockmanIQClaudeNarrator.swift (3 build errors)
Extracted NSLock calls in BreedPremiumService.swift into sync helpers (5 Swift 6 warnings)',
 NULL, 2),

('ios', '2026-03-09', 'Build 0.5 (2)', 'API Key Removal - Edge Function Routing',
 'Routed all 6 direct Anthropic/ElevenLabs API calls through 2 new Supabase Edge Functions (claude-proxy, elevenlabs-voices)
Anthropic API key removed from app binary entirely
New shared EdgeFunctionHelper.swift for authenticated Edge Function calls
Files updated: ToolUse, Grid IQ extraction (vision + text), Narrator, Yard Book NLP, Settings voice list
Remaining: ElevenLabs WebSocket STT still uses direct key (Edge Functions can''t proxy WebSockets)',
 'Moved all direct Anthropic and ElevenLabs API calls to server-side Supabase Edge Functions. API keys no longer ship in the app binary (except ElevenLabs WebSocket STT).

New Edge Functions: claude-proxy (general-purpose Anthropic Claude API proxy with JWT auth, model whitelist, purpose-based max_tokens limits) and elevenlabs-voices (voice list proxy with JWT auth).

New iOS helper: EdgeFunctionHelper.swift for calling Edge Functions with JWT authentication.

6 iOS files routed through Edge Functions: ToolUse, Grid IQ extraction (vision + text), Narrator, Yard Book NLP, Settings voice list.

Config.anthropicAPIKey removed entirely. Config.elevenLabsAPIKey retained only for VoiceChatService WebSocket STT.', 3),

('ios', '2026-03-09', 'Build 0.5 (2)', 'Robustness, Security, and Performance Audit',
 'Security: SwiftData database encrypted at rest, JWT tokens removed from logs, signOut revokes all tokens globally, keychain accessibility tightened, emails masked in debug logs
Robustness: Tool-use recursion capped at depth 3, PendingOperationQueue now @MainActor-safe, BreedPremiumService thread-safe with NSLock
Thread safety: ValuationEngine force unwraps replaced with safe access, all priceCache reads wrapped in NSLock
Performance: Eliminated O(n) onChange/task(id:) in Dashboard and Portfolio, removed @MainActor from chart background tasks, converted 8 inline DateFormatters to static lets, added photo thumbnail caching',
 'Systematic audit of all services, models, and views for robustness, security, and performance issues.

Security: SwiftData file protection (NSFileProtectionComplete), JWT removed from logs, global signOut scope, keychain kSecAttrAccessibleWhenUnlockedThisDeviceOnly, email masking in debug logs.

Robustness: Recursion depth limit (max 3) on tool-use, @MainActor on PendingOperationQueue, NSLock thread safety on BreedPremiumService.

Thread safety: ValuationEngine force unwraps replaced with safe dictionary access, cachedPrice(for:) helper with NSLock, TimeZone force unwrap fallback.

Performance: O(n) onChange fix in DashboardView, task(id:) fix in PortfolioView, @MainActor removed from chart history tasks, 8 DateFormatters + 1 NumberFormatter converted to static lets, photo thumbnail caching, cached computed properties in PortfolioView and StockmanIQChatView.', 4),

('ios', '2026-03-09', 'Build 0.5 (2)', 'Full Views Audit - Codebase Quality Sweep',
 'Audited all 273 SwiftUI view files for release readiness
Critical fix: Converted Farmers Market navigation to iOS 26-safe pattern (prevents silent-push freeze)
Em-dash cleanup: Removed all em-dash and en-dash characters from ~300 Swift files
Deprecated APIs: Replaced 9 deprecated autocapitalization calls and 2 deprecated image rendering calls
Bug fixes: Corrected "Cost per km" label, added month index safety checks, fixed force-unwrap URL, improved DateFormatter performance
Dead code removed: Deleted empty AdvisoryToolView stub, legacy UIKit sign-in button wrappers, deprecated BreedersFormSection',
 NULL, 5);

-- iOS Build 0.5 (2) - 8 Mar 2026
INSERT INTO dev_updates (platform, date, build_label, title, summary, detail, sort_order) VALUES
('ios', '2026-03-08', 'Build 0.5 (2)', 'MLA Category Mapping - PTIC and Feeder Cows',
 'Added Cows|PTIC and Cows|Feeder mappings to Breeding Cow in ReferenceData and mla-scraper Edge Function
Previously fell through unmatched with console warning
Edge Function redeployed',
 NULL, 0);

-- Web - 8 Mar 2026
INSERT INTO dev_updates (platform, date, build_label, title, summary, detail, sort_order) VALUES
('web', '2026-03-08', NULL, 'Data Cleanup - Future-Dated MLA Records',
 'Removed 29,178 future-dated records from category_prices (quarterly CSV data uploaded instead of weekly)',
 'Removed 29,178 future-dated records from category_prices table. These were accidentally uploaded from quarterly MLA CSV data instead of weekly, containing entries with data_date forward of today. No code changes required.', 0),

('web', '2026-03-08', NULL, 'Price Inconsistency Fix',
 'Fixed herds showing different valuations on dashboard/herds list vs herd detail page
Root cause: Supabase max_rows was 1,000 (default), silently capping all queries
Increased max_rows to 50,000 via Supabase Management API
Split batch price queries into parallel saleyard + national queries to prevent national prices being crowded out',
 'Fixed valuations showing different prices on batch pages (dashboard, herds list, admin) vs the herd detail page for the same herd. Root cause was twofold:

1. Supabase max_rows was 1,000 (default). All .limit(50000) calls were silently capped at 1,000 rows. Batch pages querying multiple saleyards and categories exceeded 1,000 matching rows, so older saleyard data was truncated.

2. National prices crowded out by saleyard data. Split the single price query into two parallel queries (saleyard + national) on all three batch pages.

Files changed: dashboard/page.tsx, herds/page.tsx, admin/valuation/page.tsx', 1),

('web', '2026-03-08', NULL, 'Weight Bracket Boundary Fix',
 'Fixed non-deterministic bracket selection at boundary weights (e.g. 400kg matching both "330-400" and "400-500")
Now deterministically prefers the upper bracket instead of depending on query result order',
 'Fixed non-deterministic weight bracket selection when a weight sits exactly on a bracket boundary. Now deterministically prefers the upper bracket (where weight matches the lower bound).

Files changed: lib/engines/valuation-engine.ts', 2),

('web', '2026-03-08', NULL, 'Admin Tools - Sidebar Navigation',
 'Moved Valuation Validator and MLA Data Upload from Settings page to dedicated admin section in sidebar
Each tool has unique colour theme (rose/emerald), section only visible to admin emails',
 NULL, 3),

('web', '2026-03-08', NULL, 'Valuation Lab (renamed from Valuation Validator)',
 'Renamed to "Valuation Lab" across sidebar, page header, and metadata
Added icons to all 4 tabs, active tab uses rose/maroon theme
Summary strip: added Per Head, renamed to "Herds Net Value", removed standalone hero cards
Test Calculator: Net Value and Per Head now in reactive orange hero cards within results grid
Results use 3-column grid layout, formula walkthrough rounded to 2dp
Calculation Logic tab shows content directly (no dropdown), amber theme
Herd Breakdown: moved beaker icon to dedicated column at far right of each row',
 NULL, 4),

('web', '2026-03-08', NULL, 'Herd Form - Sex Removed, Breed Premium Added',
 'Removed Sex field from herd create/edit form (now auto-derived from category)
Added Breed Premium Override field with auto-premium placeholder (e.g. "Auto (9%)")
Removed Sex row from herd detail page, added Breed Premium row',
 'Removed the Sex field from the herd create/edit form (sex is now derived from category). Added a Breed Premium Override field to the Weight & Growth section. The placeholder shows the auto-applied premium. Server actions now auto-derive sex from category keywords.

Files changed: herd-form.tsx, herds/actions.ts, herds/[id]/page.tsx', 5),

('web', '2026-03-08', NULL, 'Valuation Engine - Calves at Foot',
 'Added calves-at-foot value calculation matching iOS implementation
Parses additional_info for calf head count, age, and weight
Species-specific daily weight gain (Cattle 0.9 kg/day, Sheep 0.25 kg/day)
Fixed uncontrolled breeding accrual to use created_at instead of joined_date',
 NULL, 6),

('web', '2026-03-08', NULL, 'MLA Category Mapping - PTIC and Feeder Cows',
 'Added Cows|PTIC and Cows|Feeder mappings to Breeding Cow
Previously fell through unmatched in scraper and reference data',
 NULL, 7),

('web', '2026-03-08', NULL, 'Data Cleanup - Quarterly MLA Records Purged',
 'Deleted 293,308 rows of quarterly historical data (2023-12-31 to 2025-12-31, Breeding Cow only)
Deleted remaining stale weekly data (2024-2025)
Table cleared for fresh weekly CSV uploads going back to 2024',
 NULL, 8);

-- Web - 7 Mar 2026
INSERT INTO dev_updates (platform, date, build_label, title, summary, detail, sort_order) VALUES
('web', '2026-03-07', NULL, 'UI Polish - Filter Pills, Icons, Colours, Layout',
 'Unified filter pills across app to rounded-full with no stroke (matching Yard Book)
Tool page icon colours now match iOS: lime (Yard Book), sky (Freight IQ), amber (Reports), teal (Grid IQ)
Replaced PawPrint icons with custom IconCattleTags SVG in Yard Book
Rewrote dashboard skeleton loader to match current two-column layout
Reordered herds table columns: HEAD / NAME / BREED / CATEGORY / $/KG / WEIGHT / VALUE
Added new $/kg column to herds list using valuation engine output
Herd detail page changed from CSS grid to two independent flex columns (matching iOS)',
 NULL, 0),

('web', '2026-03-07', NULL, 'Property Header Always Visible',
 'Property group heading now shows even with a single property (was only shown for 2+)',
 NULL, 1),

('web', '2026-03-07', NULL, 'Valuation Engine - Stale Weight Bracket Fix',
 'Fixed valuations using stale pricing from old MLA data uploads when current data doesn''t have a matching weight bracket
Price resolution now uses only the newest date''s brackets, clamping to nearest when no exact match
Example: Angus Yearling Steer at Charters Towers was showing $4.51/kg (stale), now correctly shows $4.13/kg
Weight bracket matching now uses inclusive bounds with boundary preference for upper bracket
Added data_date to all price queries across dashboard, herds list, herd detail, and Brangus chat
Aligned bracket matching logic between web and iOS',
 NULL, 2);
