# Grid IQ - Gap Analysis & Implementation Plan

**Date:** 11 March 2026
**Author:** Leon (CTO) with Claude Code
**For review by:** Luke St. George (CEO), Leon Ernst (CTO)

---

## Context

Luke reviewed Grid IQ and provided a comprehensive design spec covering the full vision for the feature. The web app has a solid foundation (extraction, analysis engine, kill score, CRUD views) but is missing several features from Luke's design. This plan identifies every gap and organises work into prioritised phases.

---

## What's Already Working (Verified)

- Document upload + AI extraction (Excel, PDF, images via Claude Haiku 4.5)
- Grid parsing/storage with gender-aware entries (male/female tabs)
- Kill sheet parsing/storage with line items, category summaries, grade distribution
- Sex-aware kill sheet filtering: each line item's sex is derived from its category at save time; the analysis engine (opportunity, processor fit, kill score) and payment check audit exclude non-matching rows so a steer consignment's metrics aren't blended with heifer/cow rows on a mixed kill sheet. Link-time banner warns when a selected kill sheet is mixed and blocks link when overlap is zero.
- Head count reconciliation (summary total vs extracted line items)
- Analysis engine: headline grid value, realistic outcome, freight comparison, sell window
- Kill score engine: GCR (40%), Grid Compliance (20%), RF (20%), Fat (10%), Dentition (10%) - matches Luke's spec exactly
- Opportunity insight (weight drift, grade downgrades, bruising, condemns)
- Processor fit score (grade 50%, weight 30%, fat 20%)
- Column normalisation (exists in Edge Function via COLUMN_ALIASES map)
- Document type classification (exists in parser, not surfaced to user yet)
- Brangus `lookup_grid_iq_data` tool (5 query types working)
- GCR vs Realisation Factor correctly distinguished in engine

---

## PHASE 0: Foundation Fixes (Do First)

These unblock the extraction pipeline and fix silent failures.

### 0A. Fix Edge Function Token Limits

The `claude-proxy` Edge Function caps `grid-iq-vision` and `grid-iq-text` at 4,096 output tokens. Large kill sheets (50+ head) always truncate silently, producing incomplete data.

- **Change:** Update `PURPOSE_LIMITS` to 16,384 for both purposes
- **Impact:** Negligible cost increase (~$0.012 extra per large extraction)
- **Size:** 5 minutes

### 0B. Web Image Compression

iOS compresses photos to ~3.75 MB before sending to AI. Web has no compression, so large phone photos (8+ MB HEIC) will be expensive and slow.

- Add Canvas API compression (JPEG 0.7 quality, resize if still > 3.75 MB)
- Compress before base64 encoding for AI extraction
- **Size:** Small

### 0C. Surface Document Type Validation

The parser already classifies documents (grid vs kill sheet vs unknown). The extraction service detects mismatches but only logs a warning - the user never sees it.

- Show a warning card in the uploader when the detected type differs from what was selected
- User must confirm or switch type before proceeding
- Prevents incorrect analysis from wrong document type (as per Luke's spec)
- **Size:** Small

### 0D. Truncation Detection

When AI hits the token limit, the response is silently truncated. Users get incomplete data with no warning.

- Detect `stop_reason === 'max_tokens'` from the AI response
- Show warning: "Some data may be incomplete due to document size"
- **Size:** Small

---

## PHASE 1: Engine Completion

### 1A. Payment Check Audit

**From Luke's spec:** Line-by-line comparison of actual kill sheet prices vs what the processor grid promised.

iOS already has this (`GridIQEngine+PaymentCheck.swift`). Needs porting to web. For each kill sheet line item:
- Look up the expected grid price for that grade and weight band
- Compare with actual price paid
- Flag discrepancies with reasons: bruising, fat colour penalty, condemned, split grade, unexplained

**Deliverables:**
- Payment check calculation engine (port from iOS)
- Payment check card component showing discrepancy table on analysis detail page
- Auto-run when kill sheet is present in post-sale analysis
- **Size:** Medium

### 1B. Brangus Commentary Generation

**From Luke's spec:** "Brangus should interpret the analytical outputs and provide clear explanations." Example: "This was a strong kill overall. Your cattle captured 95.8% of the available grid value and most animals were within the preferred weight range."

The database field exists (`brangus_commentary` JSONB on `grid_iq_analyses`) and the detail page already renders it, but no commentary is ever generated.

**Deliverables:**
- Commentary service that calls Claude Haiku with analysis results
- Port the system prompt from iOS
- Generate asynchronously after analysis is saved (show loading state, update when ready)
- **Size:** Medium

---

## PHASE 2: Consignment Model & Sale Recording

**This is the biggest gap in the current implementation.**

**From Luke's spec:** Grid IQ should operate around consignments rather than individual herd groups. A processor booking may contain cattle from several herds. Example:
- 40 steers from one herd group
- 15 steers from another herd group
- 10 bulls from a bull herd
- 18 dry cows from a cull cow herd

After a kill sheet is uploaded, the user allocates animals back to herd groups. Once confirmed, the consignment becomes the official sale record, animals are marked as sold, herd group numbers update automatically, and portfolio totals update.

### 2A. Database Schema

**New table: `processor_consignments`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK) | |
| processor_name | TEXT | |
| plant_location | TEXT | Nullable |
| booking_reference | TEXT | Nullable |
| kill_date | DATE | |
| status | TEXT | 'draft', 'submitted', 'completed' |
| kill_sheet_record_id | UUID (FK) | Nullable - linked after kill sheet uploaded |
| grid_iq_analysis_id | UUID (FK) | Nullable - linked to analysis |
| total_head_count | INTEGER | Auto-calculated from allocations |
| total_revenue | DOUBLE | Nullable - populated from kill sheet |
| freight_cost | DOUBLE | Nullable |
| notes | TEXT | Nullable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| is_deleted | BOOLEAN | Soft delete |

**New table: `consignment_allocations`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| consignment_id | UUID (FK) | Links to processor_consignments |
| herd_id | UUID (FK) | Links to herds |
| head_count | INTEGER | How many head from this herd |
| category | TEXT | e.g. 'Steer', 'Cow', 'Bull' |
| notes | TEXT | Nullable |
| created_at | TIMESTAMPTZ | |

### 2B. Consignment CRUD Pages

**New pages:**
- `/grid-iq/consignments` - List view with status badges (draft/submitted/completed)
- `/grid-iq/consignments/new` - Create form:
  - Processor name, plant location, booking reference, kill date
  - Herd allocation section: select herds, specify head count from each
  - Auto-calculated total head count
- `/grid-iq/consignments/[id]` - Detail view:
  - Allocation breakdown by herd group
  - Status, linked kill sheet/analysis
  - "Link Kill Sheet" action to associate uploaded kill sheet
  - "Complete Sale" action to finalise

**Sidebar update:** Add Consignments link to Grid IQ sidebar navigation.

### 2C. Sale Recording (Complete Sale Action)

When a consignment is completed (single atomic server action):
1. Deduct `head_count` from each allocated `herds` row
2. Create `sales_records` entry per herd group involved:
   - `sale_type` = 'Over-the-Hooks'
   - `sale_location` = processor plant location
   - Values prorated from kill sheet totals by head count allocation
3. Mark herd groups with 0 remaining head as sold (`is_sold = true`)
4. Update consignment status to 'completed'
5. Portfolio totals auto-update on next page load

**From Luke's spec:** The sale record should include: processor, plant location, booking reference, kill date, head count, total revenue. This becomes part of the producer's permanent transaction history.

**Size:** Large (3-4 sessions total for Phase 2)

---

## PHASE 3: Multi-Page Document Handling

**Can run in parallel with Phase 2.**

**From Luke's spec:** Kill sheets frequently span 10-20 pages. The system must treat uploaded documents as complete datasets, not individual pages. Processing steps: detect total page count, split into page chunks, extract tables from each chunk, combine rows into a single dataset, validate totals before analysis.

### 3A. PDF Page Chunking

Current approach sends the entire document to AI in one shot. For large kill sheets this risks truncation even with the 16,384 token limit.

**Implementation:**
- Add `pdf.js` for client-side page counting
- For PDFs with >5 pages, switch to chunked extraction:
  - Pages 1-2: Extract header info (processor, dates, vendor, summary totals)
  - Remaining pages in chunks of 5: Extract line items only (shorter, focused prompt)
  - Final merge: Combine all line items into single dataset
  - Validate: Compare summary head count against total extracted line items
- **Size:** Large

### 3B. Table Header Reuse Across Chunks

**From Luke's spec:** Detect the table header once and apply the same column structure to subsequent pages. This significantly improves extraction reliability and speed.

- First chunk detects column structure (e.g. "Body No, HSCW, Left Wt, Right Wt, Left Grade, Right Grade, P8, Dent, $/kg, Value")
- Subsequent chunks receive the detected header as context in the prompt
- Improves consistency across page chunks
- **Size:** Small (prompt engineering within 3A)

---

## PHASE 4: Intelligence & Performance Features

**From Luke's spec:** As more kill sheets are processed, the platform builds a powerful dataset including processor performance comparisons, herd group performance trends, dressing percentage benchmarks, and grid performance insights. Over time this becomes a valuable livestock intelligence engine.

### 4A. Producer Performance Profile

Aggregate historical kill data into a cumulative producer profile:
- Average dressing %, realisation factor, GCR, kill score
- Grade distribution trends, fat score distribution
- Total head processed
- Confidence tier: baseline (0 kills), provisional (1-2), personalised (3-5), expert (6+)
- **Must be stratified by sex.** Aggregates are computed separately for male (steer/bull) and female (heifer/cow) rows so a steer analysis pulls only steer history and a heifer analysis pulls only heifer history. Mixing sexes produces distorted dressing % and RF benchmarks.

Used by:
- Analysis action for cumulative personalisation (currently only uses individual kill sheets)
- Commentary service for historical context
- Performance dashboard
- **Size:** Medium

### 4B. Performance Dashboard

**New page: `/grid-iq/performance`**

Visual dashboard showing:
- Kill Score trend over time (line chart)
- GCR trend, Dressing % trend
- Grade distribution breakdown (bar chart)
- Fat score distribution (histogram)
- Processor comparison table (avg GCR, avg Kill Score by processor)
- Herd group performance comparison

Add to Grid IQ sidebar navigation.
- **Size:** Medium

### 4C. Processor Performance Comparison

**From Luke's spec:** Compare historical performance across different processors. Which processor consistently gives the best GCR? Which has the fewest condemns?

Query `grid_iq_analyses` grouped by `processor_name`. Display as comparison table on the performance dashboard.
- **Size:** Small (part of 4B)

---

## PHASE 5: Polish & Enhancements

### 5A. Pre-Sale Decision Support UI Polish

The pre-sale analysis works with estimated live weights, dressing % assumptions, and freight from the freight engine. Enhancements:
- Show live weight assumptions more prominently on analysis detail
- Add dressing % "what-if" slider to see how outcomes change
- Clearer freight breakdown comparison (saleyard vs processor side-by-side)
- Link to Freight IQ for detailed estimates

### 5B. Auto-Detect Upload Type

Instead of requiring the user to manually select "Grid" or "Kill Sheet" before uploading, auto-detect from file content using the existing classifier. Show a confirmation badge. User can override if wrong.

### 5C. Excel Multi-Sheet Kill Sheet Handling

Parser already handles multi-sheet grids well (male/female tab detection). Extend to kill sheets - scan all sheets, merge line items from different category tabs that some processors use.

---

## Dependency Graph

```
Phase 0 (Foundation)
    |
    +---> Phase 1 (Engine Completion)
    |         |
    |         +---> Phase 4A (Producer Profile)
    |                   |
    |                   +---> Phase 4B (Performance Dashboard)
    |                   +---> Phase 4C (Processor Comparison)
    |
    +---> Phase 2 (Consignment Model) [independent of Phase 1]
    |         2A (Schema) --> 2B (CRUD) --> 2C (Sale Recording)
    |
    +---> Phase 3 (Multi-Page Docs) [independent of Phase 2]
    |         3A (Chunking) --> 3B (Header Reuse)
    |
    +---> Phase 5 (Polish) [can start anytime after Phase 0]
```

Phases 2 and 3 are independent and can run in parallel.

---

## Verification Plan

| Phase | How to Verify |
|-------|---------------|
| Phase 0 | Upload a large kill sheet PDF (50+ head). Confirm no truncation, compression works, type mismatch detected if wrong type selected. |
| Phase 1 | Run post-sale analysis with kill sheet. Confirm payment check card shows price discrepancies. Confirm Brangus commentary appears after brief loading. |
| Phase 2 | Create consignment from 2 herd groups. Link kill sheet. Complete sale. Verify herd counts deducted, sales records created, portfolio totals updated. |
| Phase 3 | Upload a 15-page kill sheet PDF. Confirm all pages extracted, head count matches summary. |
| Phase 4 | After 3+ kill sheets processed, check performance dashboard shows trends and processor comparison data. |

---

## Summary

| Phase | Priority | Size | Description |
|-------|----------|------|-------------|
| 0 | Critical | Small | Token limits, compression, validation, truncation detection |
| 1 | High | Medium | Payment check audit, Brangus commentary |
| 2 | High | Large | Consignment model, sale recording, herd updates |
| 3 | Medium | Large | Multi-page PDF chunking, header reuse |
| 4 | Medium | Medium | Producer profile, performance dashboard, processor comparison |
| 5 | Low | Small | Pre-sale UI polish, auto-detect type, multi-sheet kill sheets |
