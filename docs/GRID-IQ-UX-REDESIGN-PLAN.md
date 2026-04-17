# Grid IQ: UX Redesign Plan

**Author:** Leon (CTO) + Claude
**Date:** 2026-04-17
**Status:** Delivered 2026-04-17 (all four phases). Legacy routes and redirects removed since the app is pre-release.
**Scope:** Web app only (iOS untouched)

---

## 1. What Grid IQ does (in one sentence)

Grid IQ answers a single commercial question for the producer: **"Should I sell these cattle over the hooks to a processor, or through a saleyard?"**

Everything else (grid library, kill sheet library, consignments, performance page) is supporting infrastructure for that one decision, plus post-sale accountability ("did the processor actually pay me what they said they would?").

Once we hold the product to that single question, most of the UX problems become visible.

---

## 2. Core diagnosis

Grid IQ has been designed as a **library** with a **workflow** bolted on. It should be the opposite: a **workflow** (decide, sell, reconcile) with a **library** you only visit when you need to.

The current app presents seven ways to browse past things and one buried way to make a decision. We should flip that ratio.

---

## 3. Audit findings

### 3.1 Navigation is shouting, not deferring

The sidebar has four sections: "New Analysis", "Processor Records", "Saved Analysis", "Historic Results". Three of them are different names for looking at past things. A user has no way to know which to click. Apple HIG: navigation labels should describe what the user will find, not what the database calls it.

### 3.2 Information architecture is duplicated

The same data is reachable through two or three routes:

| Concept | Reachable via |
|---|---|
| Past analyses | `/saved`, `/analyses`, home cards |
| Kill sheets | `/records?tab=killsheets`, `/history`, consignment detail |
| Grids | `/records?tab=grids`, home cards, within analysis flow |
| Upload | `/upload` (own route), tab inside `/records` |

Each data type should have one home, not three.

### 3.3 Grouping by storage instead of user intent

"Processor Records" bundles grids and kill sheets because they're both "records from a processor." But they live in entirely different phases of the producer's mental model:

- A **grid** is a price list. It lives before the sale. It answers "what will they pay?"
- A **kill sheet** is a receipt. It lives after the sale. It answers "what did they pay?"

A farmer never thinks "let me browse my processor records." They think "I need to check this week's grid" or "did last month's kill balance out?" The grouping is an engineer's filing system, not a user's mental model.

### 3.4 Landing page has no hierarchy

Home shows five equal-weight cards giving the same visual priority to inputs (grids) and outputs (analyses). If everything is important, nothing is. There should be one obvious primary action on the Grid IQ landing, and that action is "start a new analysis."

### 3.5 Dead-end detail pages

From a grid detail page, you cannot navigate to the analyses that used it. From a kill sheet, you cannot jump to its parent consignment. From Performance, you cannot drill into a trend point to see which kill produced it. Every detail view is a leaf. HIG's depth principle requires bi-directional traversal.

### 3.6 Inconsistent affordances

`/records` uses tabs. `/saved` uses tabs. `/consignments` does not. Some upload entry points open inline, others route to `/upload`. Components should behave the same way everywhere.

### 3.7 Internal naming leaking to users

"Processor Records", "Saved Analysis", "Historic Results" are all database descriptions, not user concepts. To a farmer, the analyses are just *there*; they never think "saved" vs "unsaved".

---

## 4. Recommendations (in priority order)

### Recommendation 1 (highest leverage): three-section sidebar

Reduce the sidebar to three sections named by user intent:

```
Grid IQ
  Decide          (was: New Analysis)
  Consignments    (unchanged)
  Library         (was: Processor Records + Saved Analysis + Historic Results)
```

A producer uses Grid IQ in three modes. They want to make a decision, they're managing an active sale, or they're reviewing history. Three modes, three doors.

### Recommendation 2 (highest leverage): kill route duplication

Consolidate overlapping routes into one Library page with tabs:

| Before | After |
|---|---|
| `/records` | `/library` |
| `/history` | `/library?tab=kill-sheets` |
| `/saved` | `/library?tab=analyses` |
| `/analyses` | `/library?tab=analyses` (duplicate removed) |
| `/performance` | `/library?tab=performance` |
| `/upload` | inline drawer on Grids and Kill Sheets tabs |

All old URLs continue to work via redirects so nobody's bookmarks break.

### Recommendation 3: detail pages become hubs

A grid detail page should show the analyses that used that grid. A kill sheet detail should link to its parent consignment. Every detail view should connect to related entities, not dead-end.

### Recommendation 4: condense pre-sale flow from 5 steps to 3

Currently: grid selection, kill sheet selection, consignment build, results, save (five steps).

Producers think in three steps:

1. **What am I selling?** (cattle + category + consignment name)
2. **Who's buying?** (grid selection, plus optional refinement: "use my past kills to improve accuracy")
3. **Comparison** (results + save)

Zero backend changes. Pure grouping change.

### Recommendation 5: post-sale inline on consignment detail

Currently a consignment detail links out to `/consignments/[id]/post-sale`. This is a route hop for what is conceptually the second half of the same object's lifecycle. Post-sale should be a section that expands inline on the consignment detail page once the consignment is confirmed. The whole lifecycle (plan, sell, reconcile) lives on one URL.

### Recommendations on the backlog (not in this pass)

- Landing page redesign with hero CTA and single primary action.
- Database cleanup: `grid_name`, `record_name`, `consignment_name` all consolidated to `name`.
- Performance page folded into Library as a summary panel at the top.

---

## 5. Implementation plan

Four phases. Each phase is independently shippable and reviewable. Estimated total effort: 7 focused hours of engineering.

### Phase 1: sidebar + route consolidation

**Changes**
- New sidebar with three pills: Decide, Consignments, Library.
- New `/tools/grid-iq/library/page.tsx` with four sub-tabs: Analyses, Grids, Kill Sheets, Performance.
- All old routes redirect to new locations.
- Upload UI lifted out of its own route and triggered inline.

**Preserved**
- Every page's internal content and components stay unchanged.
- Every existing URL continues to work via redirects.

**Files touched:** 8 to 10. **Effort:** 2 to 3 hours.

### Phase 2: detail pages become hubs

**Changes**
- Grid detail shows "Analyses using this grid".
- Kill sheet detail shows "Part of consignment" and "Analyses using this kill sheet".
- Analysis detail adds an explicit link to consignment if one exists.

**Preserved**
- All existing detail content unchanged. Only additions.

**Files touched:** 3 pages. **Effort:** 1.5 hours.

### Phase 3: pre-sale flow condensed

**Changes**
- `PreSaleFlow` component grouped into three steps instead of five.
- Historical kill sheet selection moves inside "Who's buying?" as an optional refinement, defaulted on when data exists.

**Preserved**
- All engine logic, validation, and data passed to `createPreSaleAnalysis`. Only step grouping changes. Zero backend.

**Files touched:** 1 main component. **Effort:** 2 hours.

### Phase 4: post-sale inline

**Changes**
- Consignment detail page shows an inline "Post-kill analysis" section when `status === "confirmed"` and no post-sale analysis exists yet.
- Content is the existing `PostSaleFlow` component, unchanged.
- Old `/consignments/[id]/post-sale` route redirects to `/consignments/[id]#post-sale`.

**Preserved**
- All post-sale logic unchanged.

**Files touched:** 2 pages. **Effort:** 1.5 hours.

---

## 6. What stays the same (to reassure Luke)

- No database schema changes.
- No valuation engine changes. No grid IQ engine changes.
- No kill score, GCR, RF, or payment check logic changes.
- iOS app is not touched.
- Every existing analysis, grid, kill sheet, and consignment continues to work.
- Every old URL continues to work via redirects for at least one release cycle.
- Brangus AI integration unchanged.
- Subscription gating unchanged.

This is purely information architecture. Nothing functional changes.

---

## 7. Open questions for Luke

1. **Scope:** sign off all four phases together, or Phase 1 first and then reassess?
2. **Sidebar labels:** three options for the primary pill. Which feels best to you?
   - **Decide** (bold, verb-driven, confident)
   - **Analyse** (more conventional)
   - **New** (shortest, least descriptive)
3. **Route rename:** should `/history/[id]` rename to `/kill-sheets/[id]`? More honest, but any existing bookmarks will redirect (no real risk).
4. **Timing:** is there an upcoming milestone we should avoid touching IA near (demo, release, new user onboarding)?

---

## 8. Summary

Grid IQ today: seven ways to browse past things, one buried way to make a decision.

Grid IQ after this pass: three clear doors (Decide, Consignments, Library), condensed decision flow, detail pages that connect to related records instead of dead-ending. Same engine, same data, same iOS app. Roughly one day of engineering work split into four reviewable phases.
