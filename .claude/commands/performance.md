# Performance Review

Audit the web app for performance issues, focusing on server-side rendering, data fetching, and bundle size.

## Check Areas

### Data Fetching
- Server Components fetch data directly (no client-side fetching for initial load)
- Parallel Supabase queries where possible (Promise.all)
- PostgREST query efficiency: proper filters, .limit(), .in() to avoid 1000-row cap
- No N+1 query patterns

### Rendering
- Server Components used by default (no unnecessary 'use client')
- Client Components pushed as far down the tree as possible
- Proper loading.tsx skeletons for each route
- No layout shift from async data

### Bundle
- No large client-side imports (e.g. date-fns, lodash) that could be server-only
- shadcn/ui components tree-shaken correctly
- Images optimised via next/image

### Caching
- Static pages where possible
- Revalidation strategy for dynamic data
- Supabase query deduplication

## Output
Prioritised list of issues with severity (critical/moderate/minor) and fix suggestions.
