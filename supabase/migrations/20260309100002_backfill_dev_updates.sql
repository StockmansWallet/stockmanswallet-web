-- Backfill all dev_updates entries (iOS and Web, 1 Mar - 9 Mar 2026)
-- Consolidated from 3 separate backfill migrations. All use ON CONFLICT DO NOTHING.

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

-- ============================================================
-- iOS Build 0.5 (2) - 7 Mar 2026
-- ============================================================
INSERT INTO dev_updates (platform, date, build_label, title, summary, detail, sort_order)
VALUES

('ios', '2026-03-07', 'Build 0.5 (2)', 'Demo Data Independence',
 'Added is_demo_data=false filter to sync pull queries for herd_groups, muster_records, health_records, sales_records, yard_book_items
Added is_simulated=false filter to properties pull query
Prevents web-created demo data from syncing down to iOS (push guards already existed)',
 NULL, 0),

('ios', '2026-03-07', 'Build 0.5 (2)', 'Valuation Engine - Stale Weight Bracket Fix',
 'Fixed valuations using stale pricing from old MLA data when current data doesn''t have a matching weight bracket
weightRangesByKey now only records brackets from the newest data_date per category+saleyard
Persists weightRangesByKey directly to disk instead of rebuilding from cache keys
Cache version bumped to 12 to force fresh fetch
Weight bracket matching uses inclusive bounds, boundary weights prefer upper bracket',
 NULL, 1),

('ios', '2026-03-07', 'Build 0.5 (2)', 'Auth Idle Logout Fix',
 'Root cause: Supabase SDK emits .signedOut on failed background token refresh, app treated it identically to user-initiated sign-out
Added userInitiatedSignOut flag to AuthService
signOut() and deleteAccount() set flag before calling Supabase
Auth listener .signedOut handler now branches: user-initiated clears session, token-refresh failure enters offline mode + starts network reconnection observer',
 NULL, 2),

('ios', '2026-03-07', 'Build 0.5 (2)', 'Yard Book Navigation Warning Fix',
 'Replaced @State var selectedItem with @Binding var toolNavPath passed from ToolsView
Removed navigationDestination(item:) causing misplaced-destination warning
ToolsView now owns navigationDestination(for: YardBookItem.self) handler
Run sheet uses NavigationLink(value: item) for value-based navigation
Deep link uses toolNavPath.append(item) instead of setting optional binding',
 NULL, 3),

('ios', '2026-03-07', 'Build 0.5 (2)', 'Sign-In Page Restructure',
 'Moved email form from inline on landing page to dedicated EmailSignInSheet
Landing page now shows 3 buttons: Continue with Apple, Continue with Google, Sign in with email
Google button shows "Coming Soon" alert placeholder
EmailSignInSheet uses NavigationStack with Cancel toolbar button, header text, solid background
Layout uses flexible Spacers to centre logo and pin buttons to bottom',
 NULL, 4),

('ios', '2026-03-07', 'Build 0.5 (2)', 'Email Form Performance and Polish',
 'Removed 3 broad .animation() modifiers from EmailSignInForm parent VStack (caused layout recalculation on every keystroke)
Replaced OnboardingBackground() RadialGradient with solid Theme.Background.deepBackground in sheet
Submit button uses overlay pattern to prevent layout shift during loading',
 NULL, 5),

('ios', '2026-03-07', 'Build 0.5 (2)', 'Stockman IQ Chat Background',
 'Replaced hardcoded Color.black with Theme.StockmanIQ.background in chat view
Applied to both message area background and input bar background',
 NULL, 6),

-- ============================================================
-- iOS Build 0.5 (1) - 6 Mar 2026
-- ============================================================
('ios', '2026-03-06', 'Build 0.5 (1)', 'Simplified Demo Data (Single Toggle)',
 'Replaced 5 individual toggles with a single "Load Demo Data" toggle in DemoDataView
Toggle on: generates all demo data types. Toggle off: shows confirmation dialog, then removes all
Removed per-type @State vars and onChange handlers
Removed separate "Remove All Demo Data" button (toggle handles it now)
Kept "Reset All Data" destructive button for full wipe',
 NULL, 0),

('ios', '2026-03-06', 'Build 0.5 (1)', 'Removed Advisory Mode Toggle',
 'Removed entire #if DEBUG Section 5 (Beta Testing) block from SettingsView
Removed toggleUserMode() method that toggled userRole between farmerGrazier and accountant
Kept isFarmer computed property (still used for Properties row visibility)
Removed "Explore with sample data" subtitle from Demo Data settings row',
 NULL, 1),

-- ============================================================
-- iOS Build 0.4 (11) - 5 Mar 2026 (all sessions combined)
-- ============================================================
('ios', '2026-03-05', 'Build 0.4 (11)', 'Supabase Sync',
 'All user data now syncs to the cloud - herds, muster records, health records, sales, yard book events, kill sheets, freight estimates, processor grids, Grid IQ analyses, properties, and custom sale locations
Changes push to Supabase immediately when online, queue locally when offline, and flush on reconnect
Realtime subscriptions - changes from other devices appear within seconds
Soft deletes with cascade - deleting a herd also removes its muster and health records from the server
Data & Sync settings screen with live sync status, last sync time, and manual Sync Now button
Existing users'' data automatically pushed to Supabase on first launch after update
Daily cleanup job removes soft-deleted records after 30 days',
 NULL, 0),

('ios', '2026-03-05', 'Build 0.4 (11)', 'Supabase Security and Reliability',
 'MLA data scraper Edge Function now requires admin authentication (email whitelist)
Brangus chat proxy validates AI model against whitelist (prevents cost abuse)
Brangus TTS proxy validates voice ID against whitelist (prevents quota abuse)
Account deletion now verifies no orphaned data remains after cascade
Sync retry logic categorises errors: transient (retry) vs permanent (dead-letter)
Offline queue save errors now logged instead of silently swallowed
Pull save failures no longer advance sync timestamps (prevents data loss)
Database trigger cascades soft-deletes from herds to children automatically
Date-based indexes on muster, health, and sales records
CHECK constraints on species, sex, and pricing_type columns',
 NULL, 1),

('ios', '2026-03-05', 'Build 0.4 (11)', 'Stability and Quality',
 'Fixed a crash when removing demo data (Yard Book items accessed after deletion)
Freight calculator no longer crashes if a transport category is missing
Brangus background tasks (title/summary generation) now stop when chat is closed
Voice audio cache no longer wipes mid-playback when full
Portfolio chart updates correctly on price refresh, smoother scrubbing
Sync error feedback and sign-out safety check added
Dashboard insights carousel tap/scroll conflict resolved
Weather temperature scales with accessibility text size
Code organisation and animation cleanup across multiple files',
 NULL, 2),

('ios', '2026-03-05', 'Build 0.4 (11)', 'Price Entry Selection Fix (Most Recent vs Oldest)',
 'Root cause: price cache loop selected OLDEST entry instead of most recent for weight-range matches
Cache loop iterates DESC results - unconditional overwrite meant last iteration (oldest) overwrote first (most recent)
Fix: first-wins pattern so most recent entry is kept
Example: Toowoomba Angus Yearling Steer 320kg went from $1,159 to $884, matching MLA spreadsheet',
 NULL, 3),

('ios', '2026-03-05', 'Build 0.4 (11)', 'Herd Detail Rounding Fix',
 'TotalValueCard changed .floor to .halfUp rounding rule for herdValue and per-head value display
Matches portfolio-level rounding (already .halfUp) and web (Math.round)',
 NULL, 4),

('ios', '2026-03-05', 'Build 0.4 (11)', 'Standard Rounding',
 'Changed from .ceiling to .halfUp rounding rule in ValuationEngine+HerdValuation
Eliminates $1 discrepancies between platforms
Applies to: portfolio totals, herd values, per-head values, chart projections',
 NULL, 5),

('ios', '2026-03-05', 'Build 0.4 (11)', 'Sync UUID Identity Bug Fix',
 'Root cause: all 10 applyDTO() methods created new SwiftData records with random UUID in init, dto.apply(to:) overwrites all fields EXCEPT id
On next pull/Realtime event, the record''s Supabase UUID doesn''t match any local record, so another copy is created - compounds every sync cycle
Fix: added record.id = dto.id after init but before dto.apply(to:) in all 10 affected methods',
 NULL, 6),

('ios', '2026-03-05', 'Build 0.4 (11)', 'Clear User Data Edge Function + iOS UI',
 'New Edge Function: clear-user-data - authenticates user via JWT, soft-deletes from all 11 synced tables
FK dependency order respected for cascade safety
Audit log entry for user_data_cleared
Does NOT delete auth account or user_profiles
iOS: new "Danger Zone" section in DataSyncSettingsView with two-step confirmation alerts
Stops SyncManager, calls Edge Function, clears local SwiftData, posts .dataCleared notification, restarts SyncManager',
 NULL, 7),

('ios', '2026-03-05', 'Build 0.4 (11)', 'deleteHerd() Lock-up Fix',
 'Added guard herd.modelContext != nil check at top of deleteHerd()
Eagerly faults lazy relationships before iterating for deletion
Added isDeleting state to prevent double-tap (disables delete button while in progress)',
 NULL, 8),

('ios', '2026-03-05', 'Build 0.4 (11)', 'YardBook Navigation Lockup Fix',
 'Root cause: two navigationDestination(isPresented:) bindings in the same NavigationStack - iOS 26 silently drops the push
Fix: full value-based NavigationPath navigation in ToolsView and YardBookLandingView
Added enum ToolRoute: Hashable with yardBookLanding and yardBook cases
Single navigationDestination(for: ToolRoute.self) switch handles both routes
Deep-link onChange updated to toolNavPath.append(ToolRoute.yardBook)',
 NULL, 9),

('ios', '2026-03-05', 'Build 0.4 (11)', 'RealtimeManager Subscription Timeout',
 'Added nonisolated subscribeChannelWithTimeout to RealtimeManager
withThrowingTaskGroup pattern: actual subscribeWithError + 10s Task.sleep timeout
Prevents subscriptions hanging indefinitely on marginal network',
 NULL, 10),

-- ============================================================
-- iOS Build 0.4 (10) - 3 Mar 2026 (all sessions combined)
-- ============================================================
('ios', '2026-03-03', 'Build 0.4 (10)', 'Valuation Engine',
 'Fixed mortality calculation - was over-deducting by including weight gain in the base, now correctly uses starting weight only
Weight range clamping - out-of-range weights now use the nearest MLA price bracket instead of defaulting to the highest
Breed premium safety guard - prevents rare double-application when no general base price is cached
Calves at foot weight gain timer now tracks the actual recording date instead of resetting on any herd edit
Weight gain accrual now available as a separate line item in valuation results',
 NULL, 0),

('ios', '2026-03-03', 'Build 0.4 (10)', 'Stockman IQ (Brangus) - Greeting and Voice',
 'Brangus greeting now carries into the conversation - replying to his opening line works naturally instead of him losing context
Microphone auto-activates after Brangus finishes his welcome greeting for hands-free flow
Faster voice playback between chunked message paragraphs - next chunk pre-loads while current plays',
 NULL, 1),

('ios', '2026-03-03', 'Build 0.4 (10)', 'Portfolio - Herd Card Saleyard Repositioned',
 'Saleyard name moved from main herd card rows to small centred text below Head/Price/Weight
Long names no longer crowd the layout
Handles wrapping naturally for long names',
 NULL, 2),

-- ============================================================
-- iOS Build 0.4 (10) - 2 Mar 2026 (all sessions combined)
-- ============================================================
('ios', '2026-03-02', 'Build 0.4 (10)', 'Valuations - Breed Premiums',
 'Breed premiums corrected to reviewed adjustment values (e.g. Angus 9%, Wagyu 14%, Brahman -2%)
Breed premiums now fetched from server on launch - can be updated without an app release
Offline fallback to built-in values if server is unreachable',
 NULL, 0),

('ios', '2026-03-02', 'Build 0.4 (10)', 'Stockman IQ (Brangus) - Voice Fallback',
 'Voice fallback improved - if ElevenLabs voice is unavailable, the app now only uses a male Australian system voice (not the default female)
If no male voice is installed, Brangus skips speaking and shows a "lost my voice" message instead
Fallback priority: ElevenLabs (primary) > male en-AU system voice (if installed) > no voice + inline notice',
 NULL, 1),

-- ============================================================
-- iOS Build 0.4 (9) - 2 Mar 2026
-- ============================================================
('ios', '2026-03-02', 'Build 0.4 (9)', 'Stockman IQ (Brangus) - Voice and Chat',
 'ElevenLabs natural voice now working - Brangus speaks with his AI voice instead of the Apple system voice
Long responses now split into separate chat bubbles (one per paragraph) for easier reading
Voice responses play paragraph-by-paragraph so you hear the first part almost immediately
Brangus chat bubbles are orange instead of dark grey, user is brown
Simplified settings - voice and personality options hidden, defaults locked in',
 NULL, 2),

-- ============================================================
-- iOS Build 0.4 (8) - 2 Mar 2026
-- ============================================================
('ios', '2026-03-02', 'Build 0.4 (8)', 'Dashboard',
 'Change ticker now shows whole numbers only (easier to read)
Default card order updated (weather now appears after Yard Book)',
 NULL, 3),

('ios', '2026-03-02', 'Build 0.4 (8)', 'Stability',
 'Fixed intermittent visual glitch on app launch (animated rectangle sweep)',
 NULL, 4),

('ios', '2026-03-02', 'Build 0.4 (8)', 'Security',
 'AI and voice API keys moved to secure server-side functions
Login credentials now stored in encrypted Keychain (not plain text)
Search input validation hardened across the app
All debug logging removed from production builds
API keys rotated (old keys deleted, new restricted keys with spending cap)',
 NULL, 5),

('ios', '2026-03-02', 'Build 0.4 (8)', 'App Store Compliance',
 'Real Privacy Policy content (no more placeholder text)
Real Terms of Service content (no more placeholder text)
Account Deletion added to Settings > Security
Removed all "Coming Soon" labels and placeholder features
Production crash safety improvements',
 NULL, 6),

-- ============================================================
-- iOS Build 0.4 (6) - 1 Mar 2026
-- ============================================================
('ios', '2026-03-01', 'Build 0.4 (6)', 'Brangus AI Chat',
 'Chat history and share conversations
Read Aloud from chat bubbles
Dynamic welcome greetings
Manage Yard Book from chat
Brangus can talk about reports
Offline notice
Personality system (V3 Laconic Bushman default)
Croaky voice fallback notice
Messages-style chat animations
Chat screen rebuild',
 NULL, 0),

('ios', '2026-03-01', 'Build 0.4 (6)', 'Brangus Voice',
 'ElevenLabs natural TTS voice
ElevenLabs speech-to-text
ElevenLabs STT fix
Inline voice mode
Livestock term corrections
Voice pronunciation improvements
Mic reliability fixes
Curated voice selection',
 NULL, 1),

('ios', '2026-03-01', 'Build 0.4 (6)', 'Market Data',
 'Live MLA market prices',
 NULL, 2),

('ios', '2026-03-01', 'Build 0.4 (6)', 'Grid IQ',
 'Freight fix and 2-step wizard redesign',
 NULL, 3),

('ios', '2026-03-01', 'Build 0.4 (6)', 'Notifications and Yard Book',
 'Notifications fixed
Yard Book reminders fixed
Yard Book keyboard fix',
 NULL, 4),

('ios', '2026-03-01', 'Build 0.4 (6)', 'Farmers Market',
 'Full redesign
Navigation fix',
 NULL, 5),

('ios', '2026-03-01', 'Build 0.4 (6)', 'Offline and General',
 'Offline authentication
Offline pill fix
WeatherKit graceful degradation
Launch screen and animation fixes
Add Herd smoother transitions
Settings cleanup
Supabase schema improvements',
 NULL, 6),

-- ============================================================
-- Web - 6 Mar 2026
-- ============================================================
('web', '2026-03-06', NULL, 'Valuation Pipeline Fix',
 'Raised Supabase category_prices query limit from 500 to 50,000 across all pricing pages
Fixed price resolution order: saleyard general, saleyard breed-specific, national, fallback
Fixed demo data seeder using wrong saleyard name format and only setting saleyards on 2 of 20 herds
Also raised limit on iOS SupabaseMarketService (shared fix)',
 NULL, 0),

('web', '2026-03-06', NULL, 'MLA Scraper - Historic Data Fix',
 'Fixed critical bug wiping all uploaded saleyard CSV data on each sequential upload
Removed broad delete of all transaction rows so historic data accumulates
Fixed destructuring bug in per-saleyard+date dedup logic
Added prices_inserted/insert_errors to CSV response',
 NULL, 1),

('web', '2026-03-06', NULL, 'Herd Detail Page - iOS Alignment',
 'Added Key Metrics card (price/kg, average weight, value per head, saleyard)
Added Current Weight to Weight Tracking, Mortality Rate to Location, Timeline section, Notes section',
 NULL, 2),

('web', '2026-03-06', NULL, 'Herd Form - Current Weight Field',
 'Added current_weight input to herd create/edit form and server actions',
 NULL, 3),

('web', '2026-03-06', NULL, 'Brangus Chat Bubbles',
 'Changed assistant bubble from bg-white/5 to warm brown bg-[#4D331F] matching iOS
Added animate-bubble-in spring entrance animation',
 NULL, 4),

('web', '2026-03-06', NULL, 'Per-Tool Accent Colours',
 'Each tool section now uses its own accent colour matching iOS themes
Grid IQ: teal, Freight IQ: sky blue, Yard Book: lime, Reports: amber, Advisory Hub: purple
New coloured variants added to Button, EmptyState, and StatCard components',
 NULL, 5),

('web', '2026-03-06', NULL, 'Consistent Rounded-XL Border Radius',
 'Standardised all interactive elements from mixed rounded-full/rounded-2xl to rounded-xl (12px)
Kept circular decorative elements and structural containers as-is',
 NULL, 6),

('web', '2026-03-06', NULL, 'Button Styling Standardisation',
 'Core Button component redesigned with fixed heights per size, consistent typography, refined states
All PageHeader action buttons standardised to size="sm"',
 NULL, 7),

('web', '2026-03-06', NULL, 'Herd Form - Save/Cancel in PageHeader',
 'Removed bottom Save/Cancel buttons, moved to PageHeader with form="herd-form" attribute',
 NULL, 8),

('web', '2026-03-06', NULL, 'Reports Page Redesign',
 'Changed from vertical stack to 2-column responsive grid matching Tools page layout',
 NULL, 9),

('web', '2026-03-06', NULL, 'Freight IQ - Complete Rebuild',
 'Full rewrite matching iOS 3-step wizard: origin/herd selection, saleyard destination with haversine distance, editable assumptions, hero cost card with GST and breakdown',
 NULL, 10),

('web', '2026-03-06', NULL, 'Herd Form - iOS Alignment',
 'Removed Current Weight and Market Category fields (not in iOS)
Added Mortality Rate (%) field',
 NULL, 11),

('web', '2026-03-06', NULL, 'Page Caching Fix',
 'Added export const revalidate = 0 to Dashboard, Herds list, and Herd detail pages
Prevents stale cached HTML after MLA CSV uploads',
 NULL, 12),

-- ============================================================
-- Web - 5 Mar 2026
-- ============================================================
('web', '2026-03-05', NULL, 'Settings Page Redesign',
 'Full rewrite with card-based layout: Profile (with role picker), Password, Data & Sync, Demo Data, Admin Tools (conditional), Danger Zone
New sign-out-button and delete-account-button client components',
 NULL, 0),

('web', '2026-03-05', NULL, 'Valuation - Combined Query + Limit 500 Parity',
 'Root cause of iOS vs web discrepancy: iOS uses single combined query with .limit(500), web had no limit
All 3 pricing pages now use one combined query with category filter, expiry filter, DESC ordering, limit 500',
 NULL, 1),

('web', '2026-03-05', NULL, 'Price Data Accuracy - PostgREST Row Limit Fix',
 'Saleyard queries exceeded PostgREST''s 1,000-row default limit (silently truncated)
Added .in("category", mlaCategories) filter to narrow results to ~50-100 rows
Brangus chat service restructured: national prices in parallel batch, saleyard prices sequential with filters',
 NULL, 2),

('web', '2026-03-05', NULL, 'Price Selection Fix',
 'resolvePriceFromEntries() was taking oldest entry instead of most recent
Weight-range match: changed to take first entry (most recent, query is DESC)
Fallback (no weight range): takes highest price',
 NULL, 3),

('web', '2026-03-05', NULL, 'Standardised Rounding',
 'Web already used Math.round() (standard rounding), matching iOS''s updated .halfUp rule
Both platforms now produce identical values',
 NULL, 4),

('web', '2026-03-05', NULL, 'Red Price Source Indicators',
 'Value card, herds table, and dashboard badge turn red when using national/fallback pricing
New calculateHerdValuation() returning priceSource, pricePerKg, breedPremiumApplied',
 NULL, 5),

('web', '2026-03-05', NULL, 'Saleyard Name Resolution',
 'Added resolveMLASaleyardName() to map short app-side names to full MLA names
Applied in valuation engine and all page-level saleyard queries',
 NULL, 6),

('web', '2026-03-05', NULL, 'Supabase Column Name Fixes',
 'price_per_kg to final_price_per_kg, premium_percent to premium_pct (using query aliases)
National filter changed from .is("saleyard", null) to .eq("saleyard", "National")
Prices converted from cents to dollars (/ 100)',
 NULL, 7),

('web', '2026-03-05', NULL, 'Local Breed Premium Fallback',
 'Premium map seeds with local cattleBreedPremiums before applying Supabase overrides',
 NULL, 8),

('web', '2026-03-05', NULL, 'Admin MLA CSV Upload',
 'New admin-only page with server-side email whitelist
CSV format auto-detection, chunked upload with progress indicator
First upload: 1,158 saleyard-specific prices for Armidale + Bairnsdale',
 NULL, 9),

('web', '2026-03-05', NULL, 'Brangus AI Chat',
 'Full tool use loop with max 5 rounds, sanitiseResponse strips em-dashes and mob/mobs
4 Anthropic tool definitions: lookup_portfolio_data, calculate_freight, create_yard_book_event, manage_yard_book_event',
 NULL, 10),

('web', '2026-03-05', NULL, 'Herd Detail - Value Display',
 'Parallel fetch of national prices, breed premiums, saleyard prices
Value card with total value + per-head value',
 NULL, 11),

('web', '2026-03-05', NULL, 'Clear All Data',
 'New "Data Management" section in settings
Calls clear-user-data Edge Function with double confirmation
Affects both web and iOS (shared Supabase backend)',
 NULL, 12),

('web', '2026-03-05', NULL, 'Valuation Parity with iOS',
 'Full port of iOS ValuationEngine+HerdValuation to TypeScript
Projected weight, live MLA prices, breed premiums, mortality deduction, pre-birth breeding accrual
12-month chart also updated with full formula',
 NULL, 13),

('web', '2026-03-05', NULL, 'Saleyard-Specific Pricing',
 '4-tier price resolution: saleyard general + premium, saleyard breed-specific (no premium), national + premium, fallback + premium
National queries filtered with .is("breed", null)',
 NULL, 14),

('web', '2026-03-05', NULL, 'Sync Fix - herds to herd_groups',
 'Web was querying non-existent herds table (iOS writes to herd_groups)
Updated 7 files, added .eq("is_deleted", false) filters
Updated TypeScript types with sync metadata fields',
 NULL, 15),

('web', '2026-03-05', NULL, 'Yard Book - Full Implementation',
 'Run sheet with time horizon grouping, 5 category types with distinct colours
Stat cards, category filter pills, show/hide completed toggle
Detail page, form with all fields, soft-delete pattern matching iOS
All mutations set updated_at for iOS sync',
 NULL, 16),

('web', '2026-03-05', NULL, 'Yard Book - Column Name Fix',
 'category to category_raw, recurrence_rule to recurrence_rule_raw',
 NULL, 17),

('web', '2026-03-05', NULL, 'Herd Valuation Engine',
 'Ported iOS matchWeightRange() to TypeScript
Dashboard and herds page compute live portfolio values',
 NULL, 18),

('web', '2026-03-05', NULL, 'Premium UI Redesign',
 'Complete visual refresh: stat cards, pill filters, sortable table, ring borders, chevron animations
Applied across all pages',
 NULL, 19),

('web', '2026-03-05', NULL, 'Property Grouping',
 'Herds grouped by property on herds page with header bars and subtotals',
 NULL, 20),

('web', '2026-03-05', NULL, 'Lucide-React Icons',
 'Replaced all inline SVGs with lucide-react components',
 NULL, 21),

('web', '2026-03-05', NULL, 'Soft-Delete for Deletion',
 'Hard deletes blocked by RLS, changed to soft-delete with updated_at',
 NULL, 22),

('web', '2026-03-05', NULL, 'Client-Generated UUIDs',
 'Added crypto.randomUUID() to herd and property inserts for sync compatibility',
 NULL, 23),

('web', '2026-03-05', NULL, 'iOS Sync Fix - updated_at',
 'Added updated_at to all create/update actions so iOS can detect web changes',
 NULL, 24),

('web', '2026-03-05', NULL, 'Soft-Deleted Properties Filtered',
 'Added is_deleted = false filter to property dropdowns and direct URL access',
 NULL, 25),

('web', '2026-03-05', NULL, 'Marketing Header',
 'Added "Log In" link to marketing site header',
 NULL, 26),

-- ============================================================
-- Web - 4 Mar 2026
-- ============================================================
('web', '2026-03-04', NULL, 'Sign in with Apple',
 'Apple OAuth on sign-in and sign-up pages
Direct redirect to Apple, ID token via form_post, signInWithIdToken with Supabase
SHA-256 nonce via Apple''s state parameter',
 NULL, 0),

('web', '2026-03-04', NULL, '12-Month Outlook Chart',
 'Live Recharts AreaChart with projected portfolio value over 12 months
Uses daily weight gain, head count, and fallback price per kg',
 NULL, 1),

('web', '2026-03-04', NULL, 'Dashboard Redesign',
 'Two-column flex layout: portfolio value + chart (left), profile + properties + Yard Book + Growth (right)',
 NULL, 2),

('web', '2026-03-04', NULL, 'Sidebar Redesign',
 'Expanded from 7 to 10 nav items, bottom section with Plan indicator, Help, Settings, Log Out
Full sw-logo.svg, sticky positioning, no background',
 NULL, 3),

('web', '2026-03-04', NULL, 'Icon Updates',
 'Properties: MapPinned, Stockman IQ: Brain, cattle tags SVG updated',
 NULL, 4),

('web', '2026-03-04', NULL, 'Properties Query Fix',
 'is_demo_data corrected to is_simulated on dashboard',
 NULL, 5),

('web', '2026-03-04', NULL, 'Dashboard Polish',
 'Removed card border strokes, fixed CardContent padding',
 NULL, 6),

('web', '2026-03-04', NULL, 'Herds Page Fix',
 'PostgREST join silently failing, added fallback query without join',
 NULL, 7),

('web', '2026-03-04', NULL, 'Demo Data Seeder',
 'Doongara Station + 20 herds seeded when user has no data
Fixed UUID generation, NOT NULL defaults, error handling',
 NULL, 8),

('web', '2026-03-04', NULL, 'UI Overhaul',
 'Dark theme matching iOS, colour tokens, sidebar styling, all pages scaffolded',
 NULL, 9),

('web', '2026-03-04', NULL, 'Loading Skeletons',
 'Animated skeleton screens for all major pages
Vercel pinned to Sydney region (syd1)',
 NULL, 10),

-- ============================================================
-- Web - 3 Mar 2026
-- ============================================================
('web', '2026-03-03', NULL, 'Supabase Auth and App Shell',
 'Email/password auth, protected routes via middleware, OAuth callback handler
Sidebar navigation, responsive layout',
 NULL, 0),

('web', '2026-03-03', NULL, 'TypeScript Types and Business Logic',
 'Database types, valuation engine, freight calculator, UI component library',
 NULL, 1),

('web', '2026-03-03', NULL, 'Database Tables',
 'All Supabase tables created with RLS policies, TypeScript types generated',
 NULL, 2),

('web', '2026-03-03', NULL, 'Properties and Herds CRUD',
 'Full CRUD with forms, list views, detail pages',
 NULL, 3),

('web', '2026-03-03', NULL, 'Dashboard with Real Data',
 'Wired to Supabase queries, settings page, freight calculator',
 NULL, 4),

('web', '2026-03-03', NULL, 'Landing Page',
 'Apple-style marketing page: hero with iPhone mockup, features, pricing, waitlist',
 NULL, 5);

-- ============================================================
-- Web - 9 Mar 2026 (from third backfill)
-- ============================================================
INSERT INTO dev_updates (platform, date, title, summary, detail, sort_order) VALUES
('web', '2026-03-09', 'Cow Category Mapping Fix',
 'All cow types (Breeder Cow, Breeder Heifer, Wet Cow, Cull Cow) now map to "Cows" instead of "Breeding Cow"/"Wet Cow". Was causing saleyard price lookups to fail silently (no "Breeding Cow" category in MLA data). Now matches iOS mapping.',
 'mapCategoryToMLACategory updated to return "Cows" for all cow types. mlaCsvCategoryMapping simplified to single "Cows|*" wildcard instead of per-prefix entries (Processor, Restocker, Dairy, PTIC, Feeder).

Files changed: lib/data/reference-data.ts', 0),

('web', '2026-03-09', 'Formula Walkthrough Layout',
 'Moved data source info (price source, date, category mapping) below NetValue as grouped reference section in the test calculator formula walkthrough.',
 'Price Data Source, Latest Data Source Date, and Category Mapping moved from inline in calculation steps to a grouped section below NetValue, separated by a divider.

Files changed: app/(app)/dashboard/admin/valuation/test-calculator.tsx', 1);
