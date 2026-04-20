# Stockman's Wallet Web - Claude Code Guide

## Project
Next.js (App Router) web companion to the iOS app. Same Supabase project.
Live URL: `https://stockmanswallet.com.au` (Vercel hosting, custom domain).

- **Stack:** Next.js 15 (App Router) + Supabase + Tailwind + shadcn/ui
- **Language:** Australian English, AUD currency, dd/MM/yyyy dates

## Commands
```bash
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
npx prettier --write <file>   # Format (also runs automatically via PostToolUse hook on edits)
```

## Feature flags
- `ADVISOR_ENABLED` (in `lib/feature-flags.ts`) is `false` for MVP. Advisor routes, nav items, and marketing sections are gated behind it. Don't add advisor-only features without flipping the flag.

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

## UI Consistency Patterns
These are the established patterns. All new pages and changes MUST follow them.

| Element | Pattern | Reference |
|---------|---------|-----------|
| Back navigation | `ChevronLeft` in a rounded container (`bg-surface-lowest rounded-lg px-2.5 py-1.5`) | Advisor detail, Client detail |
| Stat cards | Separate `Card` components in a `grid grid-cols-N gap-3` row | Dashboard, Client overview |
| Page header | Avatar (circle, `rounded-full`) + name + badges inline | Advisor detail, Client detail |
| On/off controls | `Switch` component (green), not toggle buttons | Advisor sharing, Shared Data |
| Destructive actions | `Button variant="destructive"`, positioned below main content | Advisor detail, Client detail |
| Tab component | `Tabs` with sliding pill indicator, `rounded-xl` inner buttons | All tabbed pages |
| Directory lists | Rows inside a `Card` with `divide-y divide-white/[0.06]` | Advisor directory, Producer directory |
| Settings rows | `NavItem` style with icon + label + chevron, `divide-y` dividers | Settings page |
| Detail page avatars | Fetch from auth metadata via service client (`svc.auth.admin.getUserById`) | Advisor detail, Client detail |

## Docs
Detailed docs in `docs/`. Changelog is in Supabase (Muster project), not local files.
