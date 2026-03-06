# Stockman's Wallet Web App - Full Scope and Estimates

*Generated: 3 March 2026*

## Context

Assessment of what's involved in building the web app (desktop version of the iOS app), with time estimates based on Claude Code agent-assisted development, and a recommendation on whether to build alongside or after the iOS app.

---

## The Data Blocker

**All user data currently lives only in local SwiftData (SQLite on the iPhone).** Supabase only stores market data (prices, breed premiums, physical reports) and user profiles. The web app cannot show a portfolio, dashboard, or any personal farm data until user data is migrated to Supabase.

### Two approaches to solve this:

| Approach | Pros | Cons |
|----------|------|------|
| **A) Supabase-primary** - iOS writes to Supabase, SwiftData becomes offline cache | Simpler, single source of truth, web gets data for free | Needs reliable internet (poor in rural areas), significant iOS data layer rewrite |
| **B) Sync layer** - SwiftData stays primary, syncs to Supabase in background | Better offline for remote farmers, less disruptive to iOS | More complex (conflict resolution, sync state), eventual consistency |

### New Supabase tables needed (~15 tables):

`herds`, `properties`, `sales`, `muster_records`, `health_records`, `yard_book_items`, `saved_freight_estimates`, `kill_sheet_records`, `processor_grids`, `grid_iq_analyses`, `conversations`, `messages`, `client_connections`, `advisor_lenses`, `advisor_scenarios`, `custom_sale_locations`

All need: `user_id` FK, RLS policies (`auth.uid() = user_id`), proper indexes.

---

## What Needs to Be Built

### 1. Infrastructure and Auth
- Supabase client setup (`@supabase/supabase-js` + `@supabase/ssr`)
- Auth flow (Apple Sign In on web + email/password option)
- `middleware.ts` for route protection
- Environment variables, `next.config.ts`

### 2. Business Logic Ports (Swift to TypeScript)
- **ValuationEngine** - AMV formula, 5-layer price cache, breed premiums, weight gain, pre-birth accrual, calves-at-foot, mortality
- **FreightEngine** - deck density mapping, weight escalation, cost formula, GST
- **ReferenceData** - all breeds (76), categories (48), saleyards (~50), category mappings, breed premiums

### 3. App Pages (mirroring iOS tabs)

**Dashboard** - Portfolio value, performance chart, herd breakdown, market snapshot, weather, insight cards, yard book preview

**Portfolio/Herds** - Herd list (sort/filter/search), add herd wizard, herd detail (valuation breakdown, market pulse, saleyard comparison, breeding details, records), edit herd, sell stock flow, CSV import

**Stockman IQ** - Chat interface (reuse existing Edge Functions), tool call display, conversation history, insight cards feed (9 template types)

**Tools** - Yard Book (CRUD, NLP, recurring events), Freight IQ (calculator + saved estimates), Grid IQ (OCR upload, analysis, sell window), Reports (PDF generation), Market View (live MLA data, physical sales)

**Settings** - Profile, properties, preferences, sale locations, account deletion

**Advisory** (advisory roles only) - Clients, advisor lens, scenarios, simulator, reports

### 4. UI Component Library
Buttons, inputs, modals, cards, tables, tabs, toasts, skeletons, empty states

### 5. Web-Specific Differences
- Weather: need OpenWeatherMap (WeatherKit is Apple-only)
- No TTS/voice (or basic Web Speech API fallback)
- PDF: `@react-pdf/renderer` instead of native iOS rendering
- OCR: file upload instead of camera scanning
- No push notifications (web push or email for Yard Book reminders)

---

## Time Estimates - Claude Code Agent

Claude Code dramatically accelerates certain work. Here's how each area breaks down:

| Work Area | Traditional (solo) | With Claude Code | Why |
|-----------|-------------------|-----------------|-----|
| Supabase tables + RLS + migrations | 2-3 weeks | **3-4 days** | SQL schema is mechanical. Claude reads SwiftData models, writes CREATE TABLE + RLS in one pass. The 15 tables, indexes, and policies are rote work. |
| iOS data sync layer | 2-3 weeks | **1-1.5 weeks** | Harder to accelerate - needs careful SwiftData integration, offline handling, conflict resolution. Human judgment on edge cases. |
| Web auth + infrastructure | 1-2 weeks | **2-3 days** | Well-documented pattern. Supabase + Next.js auth setup is cookie-cutter with `@supabase/ssr`. |
| Business logic ports | 2-3 weeks | **3-5 days** | Biggest Claude Code win. Claude reads the Swift ValuationEngine/FreightEngine/ReferenceData and translates to TypeScript line-by-line. Pure math, well-defined inputs/outputs. |
| UI component library | 1-2 weeks | **2-3 days** | Shadcn/ui or Radix provides primitives. Claude generates themed wrappers matching existing design tokens in `globals.css`. |
| Dashboard + Portfolio (core) | 3-4 weeks | **1-1.5 weeks** | Pages are data-fetch + render. Claude scaffolds fast. Chart integration and polish needs iteration. |
| Tools (Yard Book, Freight, Market, Reports) | 3-4 weeks | **1-1.5 weeks** | CRUD pages are Claude Code's sweet spot. PDF generation needs more iteration. |
| Stockman IQ (chat + cards) | 2-3 weeks | **4-6 days** | Chat UI is standard. Edge Functions already exist. Template engine port is mechanical (9 templates with defined data shapes). |
| Grid IQ | 2 weeks | **3-5 days** | File upload + API call + results display. Extraction logic already lives in Edge Functions. |
| Settings + Profile | 1 week | **2-3 days** | Form-heavy CRUD pages. Fast. |
| Advisory features | 3-4 weeks | **1-1.5 weeks** | Complex but well-defined. Lens calculations are pure math. Client flows are CRUD. |
| Testing + polish + edge cases | 2-3 weeks | **1-1.5 weeks** | Some acceleration but still needs human testing, device checks, UX iteration. |
| **Total** | **~24-32 weeks** | **~8-12 weeks** | ~3x speedup overall |

### Where Claude Code helps most
- **Schema/migrations** (~8x faster) - reads Swift models, generates SQL
- **Business logic ports** (~6x faster) - reads Swift, writes equivalent TypeScript
- **CRUD pages and forms** (~5x faster) - scaffolds complete pages with data fetching
- **Reference data** (~10x faster) - restructures breed/saleyard/category data

### Where it helps less
- **iOS sync layer** (~2x) - SwiftData nuances, offline edge cases, requires human judgment
- **UX polish** (~1.5x) - design iteration is taste-driven
- **Debugging production issues** (~1.5x) - context-dependent

### The 8-12 week estimate assumes:
- Leon working ~full-time on this
- Claude Code doing the heavy coding, Leon reviewing and directing
- Design decisions made quickly (no multi-week design review cycles)
- No major scope changes or feature pivots mid-build

---

## Recommendation: Build Alongside iOS or Finish iOS First?

### Build alongside - but stagger strategically

Neither "finish iOS first" nor "build both in parallel" is the right answer. Here's why, and what to do instead:

### Why not "finish iOS first":
1. The iOS app is a living product with 18 beta testers - it will never be "finished"
2. The **data migration to Supabase benefits the iOS app too** - it solves the iCloud sync/backup backlog item and protects beta testers from data loss on reinstall
3. Web infrastructure work (Supabase tables, business logic ports) is independent of iOS feature development
4. Building the web app surfaces bugs and gaps in the Supabase backend that help the iOS app

### Why not "build both fully in parallel":
1. Context-switching between Swift and TypeScript slows both down
2. The web app depends on the data foundation, which touches the iOS app
3. Feature parity pressure is a trap - the web app doesn't need every iOS feature at launch

### The recommended sequence:

**Now (alongside iOS beta):**
1. Create all Supabase user data tables + RLS (3-4 days with Claude Code)
2. Build the iOS sync layer so user data flows to Supabase (1-1.5 weeks)
3. This immediately benefits iOS: backup/restore, multi-device, data safety for beta testers

**Once data flows to Supabase:**
1. Port business logic to TypeScript (3-5 days)
2. Build web auth + infrastructure (2-3 days)
3. Build web MVP: Dashboard + Portfolio + Settings (1-1.5 weeks)
4. This gives you a functional web app to demo, even if feature-incomplete

**Then iterate web features in priority order:**
1. Market View (read-only, no user data dependency - could even start before sync)
2. Stockman IQ chat (Edge Functions already exist)
3. Freight IQ
4. Yard Book
5. Reports
6. Grid IQ
7. Advisory features (lowest priority unless advisor users are pushing for it)

**Continue iOS in parallel:**
- iOS feature work continues as normal
- When you add a new iOS feature, add the corresponding Supabase table/column at the same time
- Web app catches up to new features in subsequent sprints

### Key insight:
The Supabase data migration is the critical path for BOTH platforms. Do it now. It makes the iOS app more robust (backup, multi-device) AND unblocks the entire web app. Every week you delay this, both platforms are blocked.

---

## What Already Exists (Updated 5 Mar 2026)

- Next.js 16 project deployed on Vercel (Sydney region, GitHub auto-deploy)
- Marketing site fully built (hero, features, pricing, about, contact, waitlist)
- Design tokens matching iOS app (brand colors, typography, spacing in `globals.css`)
- Supabase backend with market data tables, reference tables, and 4 Edge Functions
- Auth system (Supabase Auth with Apple Sign In + email/password)
- Full app shell with sidebar navigation, dark theme, loading skeletons
- Dashboard with hero stats, herd composition, 12-month projected portfolio value chart
- **Herds CRUD** — full create/read/update/delete with property assignment, species/breed/category selection, soft-delete, client-generated UUIDs for iOS sync
- **Properties CRUD** — full create/read/update/delete with soft-delete and UUID generation
- **Herds page** — premium UI with stat cards (total value, head, herds, avg weight), species pill filters, sortable table, search, property grouping with separate cards per property
- **Valuation engine** — TypeScript port of iOS `calculateHerdValue` with MLA category prices, breed premiums, weight-range bracket matching, 4-tier saleyard pricing (general+premium → breed-specific → national+premium → fallback), breed premium double-application guard, price source tracking with `calculateHerdValuation`, local breed premium fallback, saleyard name resolution, and iOS-parity price resolution (last-wins for range, max for fallback)
- **Herd detail page** — shows estimated herd value with per-head breakdown, red price source indicators when using national avg or fallback pricing
- **Yard Book** — full implementation matching iOS: run sheet with horizon grouping (Overdue/Today/Next 7/30/90/Later), 5 colour-coded categories with filter pills, countdown badges, herd linking (multi-select), reminder offsets, recurrence rules, mark complete/incomplete, show/hide completed, stat cards, soft-delete. Data syncs bidirectionally with iOS via shared Supabase table
- **Stockman IQ (Brangus chat)** — interactive AI chat component with message display, input handling, suggested prompts, chat service layer, and tool definitions in `lib/brangus/`
- **Demo data seeder** — Doongara Station with 20 herds, flagged as demo data, safe clear that uses soft-delete
- **Clear All Data** — settings option to permanently delete all user data via Edge Function (double confirmation, affects both web and iOS)
- **iOS sync** — all create/update/delete mutations set `updated_at` for iOS sync detection
- **Admin MLA upload** — admin-only CSV upload page for MLA market data with email whitelist, format auto-detection, chunked upload with progress
- **Freight IQ** - full 3-step calculator matching iOS: property/herd selection with auto-fill, saleyard destination with haversine distance, 5-field assumptions grid, results with GST/per-head/per-deck breakdown
- Tool pages scaffolded: Grid IQ, Reports, Market View, Settings
- **Per-tool accent colors** - Each tool uses its own iOS-matched color: Grid IQ (teal), Freight IQ (sky), Yard Book (lime), Reports (amber), Advisory Hub (purple). Applied to sidebar, buttons, empty states, stat cards, section icons, and links
- **Consistent rounded-xl** - All interactive elements standardised to `rounded-xl` (12px) for a cohesive look
- UI component library: Card, Button (9 variants incl. tool colors), Input, Badge, PageHeader, EmptyState (6 color variants), StatCard (6 accent options), Tabs, etc.
- Lucide-react icons throughout (matching iOS SF Symbols)

---

## Summary

| Question | Answer |
|----------|--------|
| How big is this? | ~8-12 weeks with Claude Code (~24-32 weeks traditional) |
| What's blocking it? | User data isn't in Supabase yet |
| Should we start now? | Yes - start with the Supabase data tables and iOS sync layer |
| What comes first? | Data foundation, then business logic port, then web MVP |
| Full feature parity? | Not needed at launch. Ship Dashboard + Portfolio + Stockman IQ first |
| Cost? | ~$25-45/month (Vercel free/Pro + Supabase Pro) |
