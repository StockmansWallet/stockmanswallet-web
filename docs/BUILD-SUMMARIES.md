# Build Summaries

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
