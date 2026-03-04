# Stockman's Wallet Web App - Build Updates

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
