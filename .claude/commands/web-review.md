# Web App Code Review

Review the specified Next.js component or page for quality, correctness, and best practices.

## Tech Stack Context
- Next.js App Router (app/ directory)
- Supabase (same project as iOS - project ref: skgdpvsxwbtnxpgviteg)
- Tailwind CSS
- shadcn/ui components
- TypeScript

## Review Areas

### Next.js Patterns
- Server components vs client components used correctly ("use client" only when needed)
- Data fetching in server components where possible
- Proper use of loading.tsx, error.tsx, not-found.tsx
- Metadata exports for SEO
- Image optimisation (next/image)

### Supabase Integration
- Using anon key (not service role) in client code
- RLS relied upon for security (not just app-level checks)
- Always filtering .eq("is_deleted", false) on queries
- Table name: herds (NOT herds)
- Auth state handled correctly (onAuthStateChange)

### Tailwind / UI
- Responsive design (mobile-first)
- Consistent with shadcn/ui patterns
- Dark mode support
- Accessible (proper ARIA, keyboard nav, contrast)

### Valuation Alignment
- Formula matches iOS exactly (7-step)
- Rounding uses Math.round (matches iOS .halfUp)
- Breed premiums from same source
- Weight range matching same logic

### TypeScript
- Proper types (no `any` unless justified)
- Supabase types generated and used
- Error handling with proper types
- Null safety

### Performance
- No unnecessary re-renders
- Large lists virtualised
- API calls deduplicated
- Bundle size considered (no massive imports)

## Output
Findings grouped by severity with code fixes where appropriate.
