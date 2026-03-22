# Grid IQ - Architecture Document

**Date:** 10 March 2026
**Status:** iOS Production / Web Incomplete
**Authors:** Leon Ernst, Claude Code


## 1. What Grid IQ Does

Grid IQ helps livestock producers decide whether to sell cattle at saleyard or direct to a processor (over-the-hooks). It works by:

1. **Extracting** processor grid pricing and kill sheet data from photos/PDFs using AI
2. **Comparing** the processor's OTH offer against MLA saleyard market value
3. **Factoring in** freight costs, realisation factors, and historical kill performance
4. **Recommending** the better selling channel with a clear dollar advantage


## 2. Current Platform Status

| Capability | iOS | Web |
|---|---|---|
| File upload UI | Yes | Yes (UI only) |
| AI extraction (grids) | Yes | Disabled - placeholder message |
| AI extraction (kill sheets) | Yes | Disabled - placeholder message |
| Grid/kill sheet browsing | Yes | Yes (reads from Supabase) |
| Analysis engine | Yes | Not implemented |
| Brangus commentary | Yes | Not implemented |
| Payment check audit | Yes | Not implemented |
| Save/sync to Supabase | Yes (bidirectional) | Read-only |


## 3. System Architecture Overview

```
                          iOS App                              Web App
                      +------------------+                +------------------+
                      | DocumentUpload   |                | GridIQUploader   |
                      | View             |                | (disabled)       |
                      +--------+---------+                +--------+---------+
                               |                                   |
                    Photo/PDF/CSV/TXT                        Photo/PDF/CSV/TXT
                               |                                   |
                  +------------v-------------+                     |
                  | GridIQExtractionService   |           (NOT IMPLEMENTED)
                  | - detectMediaType()       |
                  | - extractTextFromPDF()    |
                  | - normaliseImageData()    |
                  +------------+-------------+
                               |
              +----------------+----------------+
              |                                 |
     PDF with text                    Images / Scanned PDFs
              |                                 |
   callClaudeText()                  callClaudeVision()
              |                                 |
              +----------------+----------------+
                               |
                  +------------v--------------+
                  | claude-proxy Edge Function |
                  | (Supabase / Deno)          |
                  | - JWT auth verification    |
                  | - Model whitelist          |
                  | - Purpose-based token caps |
                  +------------+--------------+
                               |
                  +------------v--------------+
                  | Anthropic API              |
                  | claude-sonnet-4-6  |
                  +------------+--------------+
                               |
                     Structured JSON
                               |
                  +------------v--------------+
                  | JSON Parsing + Repair     |
                  | - extractJSON()            |
                  | - repairTruncatedJSON()    |
                  +------------+--------------+
                               |
              +----------------+----------------+
              |                                 |
     ProcessorGrid                    KillSheetRecord
     (@Model / SwiftData)             (@Model / SwiftData)
              |                                 |
              +----------------+----------------+
                               |
                  +------------v--------------+
                  | GridIQEngine              |
                  | 7-step analysis pipeline  |
                  +------------+--------------+
                               |
                  +------------v--------------+
                  | GridIQAnalysis            |
                  | (@Model / SwiftData)      |
                  +------------+--------------+
                               |
                  +------------v--------------+
                  | SyncEngine+GridDTOs       |
                  | SwiftData <-> Supabase    |
                  +----------------------------+
                               |
                  +------------v--------------+
                  | Supabase Tables           |
                  | - processor_grids         |
                  | - kill_sheet_records      |  <--- Web reads from here
                  | - grid_iq_analyses        |
                  +----------------------------+
```


## 4. File Upload Pipeline

### 4.1 Accepted Formats

| Format | MIME Type | Notes |
|---|---|---|
| JPEG | image/jpeg | Most common for phone photos |
| PNG | image/png | Screenshots |
| HEIC | image/heic | iPhone native - converted to JPEG on iOS |
| PDF | application/pdf | Grids and kill sheets from processors |
| CSV | text/csv | Manual data / spreadsheet export |
| TXT | text/plain | Plain text grids |

### 4.2 Size Limits

| Limit | Value | Where Enforced |
|---|---|---|
| Max file upload | 50 MB | Client-side (iOS + web) |
| Max base64 payload | ~3.75 MB raw (~5 MB encoded) | iOS `normaliseImageData()` |
| Anthropic API content limit | ~20 MB (estimated) | Server-side by Anthropic |

### 4.3 Image Compression Pipeline (iOS)

When an image exceeds the 3.75 MB raw data limit:

```
Original image data
    |
    v
HEIC/WebP? --> Convert to JPEG via UIImage
    |
    v
> 3.75 MB? --> Compress at quality 0.85
    |
> 3.75 MB? --> Compress at quality 0.70
    |
> 3.75 MB? --> Compress at quality 0.50
    |
> 3.75 MB? --> Compress at quality 0.30
    |
> 3.75 MB? --> Resize image dimensions to fit
    |
    v
Base64 encode --> send to Claude API
```

### 4.4 PDF Processing Decision Tree

```
PDF uploaded
    |
    v
PDFKit: extractTextFromPDF()
    |
    +-- Text found? --> Claude TEXT API (faster, cheaper)
    |                    - System prompt + extracted text
    |                    - No base64 encoding needed
    |                    - No vision model overhead
    |
    +-- No text (scanned/image-only) --> Claude VISION API
                                          - Entire PDF as document type
                                          - anthropic-beta: pdfs-2024-09-25
                                          - Base64 encoded
```


## 5. AI Extraction Layer

### 5.1 Model and Routing

- **Model:** `claude-sonnet-4-6` (only model in whitelist)
- **Routing:** iOS app -> `claude-proxy` Edge Function -> Anthropic API
- **Auth:** Supabase JWT (ES256), verified server-side via `auth.getUser(jwt)`
- **Beta header:** `anthropic-beta: pdfs-2024-09-25` (for PDF document type support)

### 5.2 Token Limits - CRITICAL MISMATCH

The iOS app requests high token limits, but the Edge Function caps them:

| Purpose | iOS Requests | Edge Function Cap | Effective Limit |
|---|---|---|---|
| Grid extraction (vision) | 32,768 | 4,096 | **4,096** |
| Grid extraction (text) | 32,768 | 4,096 | **4,096** |
| Kill sheet extraction | 16,384 | 4,096 | **4,096** |
| Brangus commentary | 4,096 | 4,096 | 4,096 |

**Impact:** The `Math.min()` in the Edge Function means grid and kill sheet extractions are effectively capped at 4,096 output tokens. Large documents (multi-page kill sheets with 50+ line items) will almost certainly truncate, relying on `repairTruncatedJSON()` to recover partial data.

Edge Function code (line 92):
```typescript
const maxTokens = Math.min(body.max_tokens || DEFAULT_MAX_TOKENS, maxAllowed)
```

### 5.3 System Prompts

**Grid extraction** requests:
- Processor name, grid code, contact details, dates, location
- All grade entries (J, YO, M, Q, etc.) with weight band prices
- Fat range, dentition range, shape range per grade
- Notes (payment terms, max weights, residue warnings)
- Output: Compact JSON, no whitespace

**Kill sheet extraction** requests:
- Processor name, kill date, vendor/PIC details
- Total head count, body weight, gross value, condemns
- Category summaries (OX, COW, BULL breakdown)
- Grade distribution
- Per-head line items (body number, NLIS, category, dentition, P8 fat, side weights, grades, prices)
- Output: Compact JSON, no whitespace

**Key prompt instruction:** "Return COMPACT JSON - no extra whitespace or indentation. Minimise output size." - This is critical given the 4,096 token cap.

### 5.4 Timeouts

| Scenario | Timeout | Notes |
|---|---|---|
| Image -> Vision API | 60s | Hard timeout via TaskGroup |
| PDF -> Vision API | 90s | For scanned/image-only PDFs |
| PDF text -> Text API | 90s | Standard PDF with selectable text |
| CSV/TXT -> Text API | Dynamic | 60s base + 10s per 2000 chars, max 180s |
| Brangus commentary | 60s | Fixed |

### 5.5 JSON Extraction and Repair

Claude responses may include markdown fences or explanatory text. The extraction pipeline:

```
Raw Claude response
    |
    v
Strip ```json and ``` fences
    |
    v
Trim whitespace
    |
    v
Extract first { to last } (skip explanatory text)
    |
    v
Validate JSON (JSONSerialization)
    |
    +-- Valid? --> Return JSON string
    |
    +-- Invalid? --> repairTruncatedJSON()
                     1. Find last complete value (number, string, ], })
                     2. Remove trailing incomplete key-value pairs
                     3. Remove trailing commas
                     4. Track unclosed brackets/braces in LIFO stack
                     5. Close openers in reverse order
                     6. Return repaired JSON
```

**Risk:** Repair can close brackets correctly, but truncated line items are lost silently. A 100-head kill sheet might only extract 30 line items if tokens run out.


## 6. Analysis Engine (iOS Only)

### 6.1 Seven-Step Pipeline

```
Step 1: MLA Market Value
  ValuationEngine.shared.calculateHerdValue() -> saleyard reference price

Step 2: Estimate Carcase Weight
  Projected live weight x dressing percentage
  - With kill history: actual dressing % from kill sheets (40-70% sanity check)
  - Without: industry defaults (yearling steer 54%, cow 50%, bull 58%, etc.)

Step 3: Headline Grid Value
  Estimate grade -> lookup grid price for grade + weight band
  price/kg x carcase weight x head count

Step 4: Apply Realisation Factor
  - With kill history: weighted average RF from past kill sheets
  - Without: 0.92 baseline (conservative 8% discount)
  Realistic outcome = headline value x RF

Step 5: Calculate Freight
  FreightEngine for both routes:
  - Herd location -> nearest saleyard
  - Herd location -> processor
  Distance: Haversine x 1.3 road factor

Step 6: Net Comparison
  Net saleyard = MLA value - freight to saleyard
  Net processor = realistic grid outcome - freight to processor
  Grid IQ advantage = net processor - net saleyard
  Decision: > $50 = processor wins, < -$50 = saleyard wins, within $50 = similar

Step 7: Sell Window (optional)
  Compare current weight trajectory against grid weight bands
  - EARLY: below optimal band (shows days to reach target)
  - ON_TARGET: within preferred weight range
  - RISK_OF_OVERWEIGHT: within 5% of grid cap or already over
```

### 6.2 Optional Deep Analysis (requires kill history)

- **Opportunity insight:** Identifies lost value from weight drift, grade downgrades, bruising, condemns
- **Processor fit score:** 0-100 composite (50% grade alignment, 30% weight alignment, 20% fat alignment)
- **Payment check audit:** Line-by-line comparison of kill sheet prices vs grid promises. Status: MATCHED / MINOR_DISCREPANCY / REVIEW_NEEDED


## 7. Data Model

### 7.1 Supabase Tables

**processor_grids**
```
id                  UUID (PK)
user_id             UUID (FK -> auth.users)
processor_name      TEXT
grid_code           TEXT (nullable)
contact_name/phone/email  TEXT (nullable)
grid_date           TIMESTAMPTZ
expiry_date         TIMESTAMPTZ (nullable)
location            TEXT (nullable)
location_lat/lng    DOUBLE PRECISION (nullable)
entries             JSONB []  -- Array of ProcessorGridEntry
notes               TEXT (nullable)
source_image_path   TEXT (nullable)
is_deleted          BOOLEAN (default false)
deleted_at          TIMESTAMPTZ (nullable)
last_synced_at      TIMESTAMPTZ (nullable)
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**kill_sheet_records**
```
id                  UUID (PK)
user_id             UUID (FK -> auth.users)
processor_name      TEXT
grid_code           TEXT (nullable)
kill_date           TIMESTAMPTZ
vendor_code/pic/property_name  TEXT (nullable)
booking_reference/type  TEXT (nullable)
herd_id       UUID (nullable, links to herds)
total_head_count    INTEGER
total_body_weight   DOUBLE PRECISION
total_gross_value   DOUBLE PRECISION
average_body_weight/price_per_kg  DOUBLE PRECISION
condemns            INTEGER
category_summaries  JSONB []
grade_distribution  JSONB []
weight_class_distribution  JSONB []
fat_class_distribution     JSONB []
line_items          JSONB []  -- Per-head detail
realisation_factor  DOUBLE PRECISION (nullable)
payment_check_result JSONB (nullable)
source_file_path    TEXT (nullable)
notes               TEXT (nullable)
is_deleted          BOOLEAN
deleted_at/last_synced_at/created_at/updated_at  TIMESTAMPTZ
```

**grid_iq_analyses**
```
id                  UUID (PK)
user_id             UUID (FK -> auth.users)
herd_id       UUID
processor_grid_id   UUID
kill_sheet_record_id UUID (nullable)
analysis_date       TIMESTAMPTZ
herd_name/processor_name  TEXT (snapshot labels)
mla_market_value    DOUBLE PRECISION
headline_grid_value DOUBLE PRECISION
realisation_factor  DOUBLE PRECISION (default 0.92)
realistic_grid_outcome DOUBLE PRECISION
freight_to_saleyard/processor  DOUBLE PRECISION
net_saleyard_value/net_processor_value  DOUBLE PRECISION
grid_iq_advantage   DOUBLE PRECISION
sell_window_status_raw  TEXT
sell_window_detail  TEXT
days_to_target      INTEGER (nullable)
projected_carcase_weight  DOUBLE PRECISION (nullable)
opportunity_value/driver/detail  (nullable)
processor_fit_score/label_raw  (nullable)
head_count          INTEGER
estimated_carcase_weight  DOUBLE PRECISION
dressing_percentage DOUBLE PRECISION (default 0.54)
is_using_personalised_data  BOOLEAN
brangus_commentary  JSONB (nullable)
is_deleted/deleted_at/last_synced_at/updated_at  TIMESTAMPTZ
```

### 7.2 RLS Policies

All three tables use user-scoped row-level security:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`


## 8. Key File Locations

### iOS (relative to `StockmansWallet-iOS/StockmansWallet/StockmansWallet/`)

| File | Lines | Purpose |
|---|---|---|
| Models/ProcessorGrid.swift | 176 | Grid data model + price lookup |
| Models/KillSheetRecord.swift | 313 | Kill sheet model + nested Codable structs |
| Models/GridIQAnalysis.swift | 326 | Analysis result + defaults + enums |
| Services/GridIQ/GridIQEngine.swift | 322 | Core 7-step analysis orchestrator |
| Services/GridIQ/GridIQEngine+SellWindow.swift | 211 | Sell timing intelligence |
| Services/GridIQ/GridIQEngine+PaymentCheck.swift | 179 | Grid payment audit |
| Services/GridIQ/GridIQEngine+Opportunity.swift | 197 | Hidden value analysis |
| Services/GridIQ/GridIQEngine+ProcessorFit.swift | 135 | Cattle suitability scoring |
| Services/GridIQ/GridIQExtractionService.swift | 220 | Extraction orchestrator |
| Services/GridIQ/GridIQExtractionService+API.swift | 333 | Claude API calls + JSON repair |
| Services/GridIQ/GridIQExtractionService+GridExtraction.swift | 314 | Grid photo/PDF parsing |
| Services/GridIQ/GridIQExtractionService+KillSheetExtraction.swift | 393 | Kill sheet parsing |
| Services/GridIQ/GridIQExtractionService+Commentary.swift | 154 | Brangus AI commentary |
| Services/Sync/SyncEngine+GridDTOs.swift | 256 | Bidirectional sync DTOs |
| Services/Core/EdgeFunctionHelper.swift | 124 | Edge Function HTTP helper |
| Views/GridIQ/ (16 files) | ~4,751 | All Grid IQ views |

### Web (relative to `StockmansWallet-Web/stockmanswallet-web/`)

| File | Purpose |
|---|---|
| app/(app)/dashboard/tools/grid-iq/page.tsx | Landing page - recent analyses, grids, kill sheets |
| app/(app)/dashboard/tools/grid-iq/upload/page.tsx | Upload page wrapper |
| app/(app)/dashboard/tools/grid-iq/upload/grid-iq-uploader.tsx | Upload component (extraction disabled) |
| app/(app)/dashboard/tools/grid-iq/grids/page.tsx | Saved grids listing |
| app/(app)/dashboard/tools/grid-iq/history/page.tsx | Kill sheet history |

### Supabase Edge Function

| File | Purpose |
|---|---|
| supabase/functions/claude-proxy/index.ts | Claude API proxy (140 lines) |


## 9. Web App - Current State

The web uploader component (`grid-iq-uploader.tsx`) has:
- File type selector (grid vs kill sheet)
- Drag-and-drop zone
- File preview (images show thumbnail, PDFs/CSVs show icon)
- Size validation (50 MB cap)
- Type validation (JPG, PNG, HEIC, PDF, CSV, TXT)

**Extraction is disabled.** The `handleExtract()` function simulates a 2-second delay then shows:
> "AI extraction is not yet available on the web. Upload grids via the iOS app for now."

The landing page fetches data from Supabase (grids, kill sheets, analyses) and displays the latest 5 of each.


---


## 10. Recommendations and Solutions

### 10.1 Token Limit Mismatch (CRITICAL - Fix First)

**Problem:** The `claude-proxy` Edge Function caps `grid-iq-vision` and `grid-iq-text` at 4,096 output tokens, while the iOS app requests up to 32,768. Every extraction is silently capped, causing frequent truncation on anything beyond a simple grid.

**Impact:**
- A processor grid with 8 grade rows x 6 weight bands = ~48 price entries. At ~20 tokens per entry, that's ~960 tokens just for prices, plus overhead. 4,096 is often sufficient for grids.
- A kill sheet with 50+ head = ~50 line items x ~15 fields each. Each line item is ~80-100 tokens. A 50-head sheet needs ~5,000-6,000 tokens. **4,096 will always truncate.**
- The JSON repair logic saves partial data but silently drops line items.

**Fix:** Update the Edge Function `PURPOSE_LIMITS` to match what the iOS app actually needs:
```typescript
const PURPOSE_LIMITS: Record<string, number> = {
  'grid-iq-vision': 16384,   // was 4096
  'grid-iq-text': 16384,     // was 4096
  'narrator': 200,
  'yard-book-nlp': 2000,
  'tool-use': 2048,
}
```

Why 16,384 not 32,768: Haiku 4.5's max output is 8,192 tokens by default (16,384 with extended output). 32,768 was never achievable anyway. 16,384 covers the largest kill sheets comfortably.

**Cost impact:** Haiku 4.5 output tokens cost US$1/MTok. Going from 4K to 16K max increases worst-case cost per extraction from ~$0.004 to ~$0.016. Negligible.

### 10.2 Multi-Page PDF Strategy

**Current approach:** Send entire PDF (all pages) to Claude in one shot, either as extracted text or as a document blob.

**Problems with large PDFs:**
- Kill sheets from large lots can be 20-50 pages
- Scanned PDFs (image-only) sent via vision API are expensive in input tokens (~1,600 tokens per page)
- A 30-page scanned PDF = ~48,000 input tokens before Claude even starts generating
- Text-extracted PDFs are cheaper but can be messy (OCR artefacts, table formatting lost)

**Recommendations:**

**Option A - Page chunking (recommended for web):**
1. Split PDF into individual pages server-side
2. Process page 1-2 for header info (processor name, dates, vendor details)
3. Process remaining pages for line items, 5-10 pages at a time
4. Merge results into single KillSheetRecord
5. Validate: total head count from summaries should match line item count

**Option B - Hybrid text+vision:**
1. Always try text extraction first (free, instant)
2. If text extraction yields good structure (detected table rows), use text API
3. If text extraction is garbled (scanned PDF), fall back to vision but process page-by-page
4. Only use full-document vision for short PDFs (< 5 pages)

**Option C - Pre-processing with pdf.js (web-specific):**
1. Use pdf.js to render each page to canvas
2. Run lightweight table detection (find horizontal/vertical lines)
3. Crop to table region only (skip headers, footers, logos)
4. Send cropped regions to Claude - smaller payload, better extraction

### 10.3 File Size Optimisation

**Current:** iOS compresses images to fit 3.75 MB. The web has no compression.

**Web implementation plan:**
1. **Images:** Use browser Canvas API to compress before upload
   - Read file -> draw to canvas -> export as JPEG at 0.7 quality
   - Resize if dimensions > 2048px on longest side
   - Target: < 2 MB after compression
2. **PDFs:** Use pdf.js for text extraction client-side (same as iOS PDFKit approach)
   - Skip the vision API entirely for PDFs with good text layers
   - Only fall back to vision for scanned PDFs
3. **HEIC:** Convert to JPEG client-side using heic2any library

### 10.4 Token Usage Tracking

**Current:** No tracking whatsoever. No way to know how much each extraction costs or how often truncation occurs.

**Recommendation:** Add a `usage` tracking table in Supabase:
```sql
CREATE TABLE ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,           -- 'grid-iq-vision', 'grid-iq-text', etc.
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  stop_reason TEXT,                -- 'end_turn' vs 'max_tokens' (truncated)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Log from the Edge Function using the Anthropic response's `usage` field. This gives you:
- Cost visibility per user, per purpose
- Truncation rate (`stop_reason = 'max_tokens'` frequency)
- Data to justify token limit changes

### 10.5 Web Extraction Implementation Path

To bring Grid IQ extraction to the web, two main approaches:

**Approach A - Edge Function (recommended):**
1. Create a new `grid-iq-extract` Edge Function that accepts file uploads directly
2. The Edge Function handles:
   - PDF text extraction (using a Deno PDF library)
   - Image compression/resizing
   - Calling Claude via the existing proxy pattern
   - Returning structured JSON to the client
3. Advantages: Server-side processing, no API key exposure, consistent with iOS architecture
4. Web client just uploads the file and receives structured data back

**Approach B - Client-side with existing proxy:**
1. Web app does PDF text extraction client-side (pdf.js)
2. Web app compresses images client-side (Canvas API)
3. Web app builds the same request body as iOS
4. Sends to `claude-proxy` Edge Function
5. Parses JSON response client-side
6. Advantages: Less new infrastructure. Disadvantages: More client code, larger payloads over the wire

### 10.6 Rate Limiting

**Current:** No per-user throttling beyond Anthropic's own rate limits.

**Recommendation:** Add simple rate limiting in the Edge Function:
```typescript
// Check last N requests in ai_usage_log for this user
// Deny if > 20 extractions per hour or > 100 per day
```

This prevents accidental loops and protects against cost spikes. 20/hour is generous for normal use - a farmer uploading grids one at a time would never hit it.

### 10.7 Error Recovery and User Feedback

**Current issues:**
- Truncated extractions silently lose data (user doesn't know 20 of 50 line items were dropped)
- No retry mechanism
- No option to manually correct extracted data on web

**Recommendations:**
1. **Truncation detection:** If `stop_reason === 'max_tokens'`, show a warning: "Some data may be incomplete. Consider uploading a clearer image or fewer pages."
2. **Line item count validation:** Compare extracted `totalHeadCount` against actual `lineItems.length`. If mismatch, flag it.
3. **Manual entry fallback:** Allow users to add missing line items manually (web already has the grid manual entry concept, extend to kill sheets).
4. **Re-extraction:** Allow re-uploading the same document with different settings (e.g., "try page-by-page extraction").

### 10.8 Cost Estimates

Based on Claude Haiku 4.5 pricing (US$0.80/MTok input, US$4/MTok output):

| Scenario | Input Tokens | Output Tokens | Est. Cost |
|---|---|---|---|
| Simple grid photo | ~2,000 | ~1,500 | ~$0.008 |
| Complex grid (8 grades x 8 bands) | ~2,500 | ~3,000 | ~$0.014 |
| Kill sheet (20 head, 2 pages) | ~4,000 | ~3,000 | ~$0.015 |
| Kill sheet (50 head, 5 pages) | ~8,000 | ~6,000 | ~$0.030 |
| Kill sheet (100 head, 10 pages, scanned) | ~20,000 | ~12,000 | ~$0.064 |
| Kill sheet (200 head, 20 pages, scanned) | ~40,000 | ~20,000+ | ~$0.112 |
| Brangus commentary | ~1,500 | ~2,000 | ~$0.009 |

At current 4,096 token cap, the 50+ head kill sheets are being truncated. With the recommended 16,384 cap, all scenarios fit comfortably.

### 10.9 Priority Order

1. **Fix token cap mismatch** - 5 min Edge Function change, immediate quality improvement
2. **Add usage logging** - Understand actual costs and truncation rates before optimising further
3. **Implement web extraction** - Use Approach A (dedicated Edge Function)
4. **Add rate limiting** - Protect against cost spikes
5. **Multi-page PDF chunking** - For large kill sheets (> 10 pages)
6. **Truncation detection and user feedback** - Better UX for partial extractions
