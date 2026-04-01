# Stockman's Wallet Web - Claude Code Guide

## Project
Next.js (App Router) web companion to the iOS app. Same Supabase project.
Live URL: `https://stockmanswallet.com.au` (Vercel hosting, custom domain).

- **Stack:** Next.js 15 (App Router) + Supabase + Tailwind + shadcn/ui
- **Language:** Australian English, AUD currency, dd/MM/yyyy dates

## Writing Style
- NEVER use em-dashes in any content, copy, or code comments
- NEVER say "mob/mobs", always "herd/herds"
- Australian English spelling (colour, organisation, etc.)

## Architecture
- Server Components (async page.tsx) fetch Supabase data directly via `@supabase/ssr`
- Server Actions (`actions.ts`) handle mutations
- Tailwind CSS + shadcn/ui components
- Valuation engine (`lib/engines/valuation-engine.ts`) aligned with iOS formula

## Critical: Database
- Herds table: `herds` (renamed from `herd_groups` in Mar 2026)
- All SELECT queries must include `.eq("is_deleted", false)` (iOS uses soft deletes)
- `category_prices.final_price_per_kg` stores CENTS/kg. Divide by 100 when building price maps.
- Queries use PostgREST alias: `price_per_kg:final_price_per_kg`
- National prices: `.eq("saleyard", "National")` (NOT `.is("saleyard", null)`)
- `breed_premiums.premium_pct` aliased as `premium_percent:premium_pct`

## Git
- Git root: `/Volumes/Gonzales/StockmansWallet/StockmansWallet-Web/stockmanswallet-web/`
- Separate repo from iOS. Never commit from parent directory.
- Commit email: `admin@stockmanswallet.com.au`
- No `Co-Authored-By` lines (blocks Vercel Hobby deploys)

## Key Files
| File | Purpose |
|------|---------|
| `app/(app)/dashboard/page.tsx` | Main dashboard, portfolio value + chart |
| `app/(app)/dashboard/herds/` | Herd list, detail, edit, new |
| `lib/engines/valuation-engine.ts` | Valuation calculations (iOS parity) |
| `lib/data/reference-data.ts` | Category mapping, breed premiums, static data |
| `lib/data/weight-mapping.ts` | Weight-first MLA category resolution |
| `lib/brangus/chat-service.ts` | Brangus AI system prompt, API calls, tool loop |
| `lib/navigation/nav-config.tsx` | Role-based sidebar navigation |

## Docs
Detailed docs in `docs/`. Changelog is in Supabase (Muster project), not local files.
