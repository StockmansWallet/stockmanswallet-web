# Grid IQ - Product Flow Specification

> **Purpose:** Define the complete Grid IQ user flow for review before implementation.
> The current web app has strong extraction, analysis, and scoring engines but the user-facing flow doesn't match the intended product design. This spec defines the correct flow and identifies what needs to change.

---

## Core Flow (One Line)

**Upload grids to library -> upload kill sheets to library -> build consignment -> run pre-sale analysis -> save/edit pending consignment -> upload actual kill sheet -> run post-kill analysis -> confirm sale**

---

## Foundation: Libraries (Always Available)

### Grid Library
- User uploads processor grids (PDF, Excel, CSV, image) into a persistent library
- Grids are extracted via AI/parser and saved to `processor_grids` table
- User can browse, view, and delete grids at any time
- **Status: EXISTS and working** (upload, list, detail, delete all functional)

### Kill Sheet Library
- User uploads historical kill sheets / feedback sheets into a persistent library
- Kill sheets are extracted via AI/parser and saved to `kill_sheet_records` table
- These historical kill sheets improve the accuracy of future pre-sale analysis
- User can browse, view, and delete kill sheets at any time
- **Status: EXISTS and working** (upload, list, detail, delete all functional)

### Key UX Note
> "The more kill sheets you upload, the more accurate your processor analysis will become."
>
> This note should be prominently displayed during the analysis setup flow.
> If no historical kill sheets are available, Grid IQ still works using industry averages.

---

## STAGE 1: Pre-Sale Analysis Flow

**Goal:** Help the producer decide whether to sell through a processor or through saleyards, BEFORE any cattle are sent.

### Step 1: User Clicks "New Analysis"
- Entry point from Grid IQ landing page or sidebar
- Opens a guided flow (not just a form)

### Step 2: Select Grid and Historical Kill Sheets

**2a. Select Processor Grid**
- User picks ONE grid from their grid library
- OR uploads a new grid on the spot (gets added to library automatically)
- Only one grid is used per analysis

**2b. Select Historical Kill Sheets (Optional)**
- User selects zero, one, or MULTIPLE historical kill sheets from their library
- Can also upload new historical kill sheets on the spot (added to library)
- These are used to build the producer's historical performance profile:
  - Average realisation factor, dressing %, GCR, grade distribution
  - More kill sheets = more accurate predictions
- If none selected/available: analysis uses industry averages (baseline RF 0.92, default dressing %)

**UX Note displayed:** "The more kill sheets you upload, the more accurate your processor analysis will become."

### Step 3: Build Consignment

The user creates a consignment by selecting cattle from one or more herd groups in their portfolio.

**Example:**
| Source Herd | Head Count | Category |
|-------------|-----------|----------|
| Herd Group A | 40 | Steers |
| Herd Group B | 15 | Steers |
| Bull Herd | 10 | Bulls |
| Cull Cow Herd | 18 | Dry Cows |
| **Total** | **83** | |

- The system combines these into one proposed processor consignment
- Cattle are NOT sold yet - they remain in their herds

### Step 4: Generate Processor vs Saleyard Comparison

User clicks **"Generate"** button.

Grid IQ estimates the processor result using:
- The selected processor grid (price lookup by estimated grade + weight band)
- Freight cost from Freight IQ (property to processor, property to saleyard)
- Historical kill sheets if selected (personalised RF, dressing %, grade predictions)
- Industry averages if no kill sheets available (baseline RF, default dressing %)

The system then compares:
- **Estimated processor return** (net of freight)
- **Estimated saleyard return** (MLA market value net of freight)

This comparison is the Grid IQ Advantage - the dollar difference between the two channels.

**Results displayed per category:**
Each category in the consignment gets its own comparison row:
| Category | Head | Est. Processor (net) | Est. Saleyard (net) | Advantage |
|----------|------|---------------------|--------------------| ----------|
| Steers | 55 | $82,500 | $78,100 | +$4,400 processor |
| Bulls | 10 | $14,200 | $15,800 | +$1,600 saleyard |
| Dry Cows | 18 | $16,900 | $15,200 | +$1,700 processor |
| **Total** | **83** | **$113,600** | **$109,100** | **+$4,500 processor** |

**Additional metrics displayed:**
- Sell window assessment per category (EARLY / ON_TARGET / RISK_OF_OVERWEIGHT)
- Dressing % used (personalised vs industry default)
- Realisation factor used (personalised vs baseline)
- Confidence tier (baseline / provisional / personalised / expert)
- Brangus AI commentary with pre-sale decision guidance

### Step 5: Save or Cancel

**"Save" button:**
- Saves the analysis result
- Saves the consignment as a **pending** processor consignment
- Records: which cattle were selected, which herds they came from, which grid was used, the pre-sale analysis result
- Cattle remain in their herds (not sold)
- The consignment must remain **editable** after saving - the user can adjust cattle counts, add/remove herds, change the consignment before the actual processor booking

**"Cancel" button:**
- Discards the analysis and consignment
- Returns to Grid IQ landing page

### Important: Editable Pending Consignment
After saving, the user must be able to edit the consignment at any time before the sale is confirmed. This is critical because the planned consignment and the final cattle sent to the processor may not always match exactly.

If the user edits a pending consignment (changes head counts or herds), they must click **"Re-generate Analysis"** before they can proceed. This keeps the user in control while ensuring the analysis stays current.

---

## STAGE 2: Post-Kill Analysis Flow

**Goal:** After cattle are processed, understand how the consignment actually performed by comparing the actual kill sheet against the grid and saleyard valuation, then confirm the sale.

### Step 1: Upload Actual Kill Sheet

- After cattle are processed, the user receives a kill sheet / feedback sheet from the processor
- User uploads the **actual** (current) kill sheet for this consignment
- Grid IQ extracts: line items, head count, grades, weights, prices, totals
- Head count reconciliation: checks extracted data against consignment head count
- This kill sheet is also added to the kill sheet library for future historical use

### Step 2: Run Post-Kill Analysis

Grid IQ compares the actual kill sheet outcome against the processor grid.

**Analysis produces:**
- **Actual processor revenue** (from kill sheet totals)
- **Grid Capture Ratio (GCR)** - actual revenue / maximum possible grid revenue
- **Realisation Factor (RF)** - actual revenue / predicted revenue
- **Kill Score** (composite 0-100): GCR 40%, Grid Compliance 20%, RF 20%, Fat 10%, Dentition 10%
- **Grid compliance** - % of carcases hitting grid specs
- **Payment check audit** - line-by-line comparison of kill sheet prices vs grid pricing
- **Opportunity insight** - where value was lost (weight drift, grade downgrades, bruising, condemns)
- **Processor fit score** - how well this herd suits this processor's grid
- **Brangus AI commentary** - post-sale interpretation and improvement advice

**Comparison displayed:**
- Actual processor result vs estimated saleyard alternative
- **Prediction accuracy:** Pre-sale estimate vs actual outcome (how accurate was the prediction?)

### Step 3: Confirm Herd Group Allocation and Sale

Because the consignment may contain cattle from multiple herds, the user confirms which herds the sold cattle came from.

**Example confirmation screen:**
| Source Herd | Head Sold | Category |
|-------------|----------|----------|
| Herd Group A | 40 | Steers |
| Herd Group B | 15 | Steers |
| Bull Herd | 10 | Bulls |
| Cull Cow Herd | 18 | Dry Cows |

- The user can make final adjustments if the actual sale differs from the original planned consignment
- Example: planned 40 steers from Herd A but actually sent 38

**Once confirmed:**
- Animals are marked as sold
- Herd group head counts are reduced
- Overall portfolio numbers update
- Sales records are created per herd group (sale_type = "Over-the-Hooks")
- The consignment status changes to "completed"
- The consignment becomes the final sale record

---

## Navigation Structure

### Sidebar
**Create:**
- New Analysis (opens Stage 1 pre-sale flow)
- Upload Grid (add to library)
- Upload Kill Sheet (add to library)

**View:**
- Analyses (saved pre-sale comparisons + post-kill results)
- Grids (grid library)
- Kill Sheets (kill sheet library)
- Consignments (pending + completed, with status filters)
- Performance (aggregated dashboard)

### Grid IQ Landing Page
- Recent analyses (pre-sale + post-sale, with status badges)
- Recent grids (with expiry warnings)
- Recent kill sheets
- Pending consignments (action needed)
- Quick stats from performance profile

---

## Design Decisions (Confirmed)

1. **Per-category breakdown WITH combined total.**
   A consignment with 40 steers + 18 dry cows gets separate processor vs saleyard comparisons per category (steers analysed against steer grid entries, cows against cow entries), PLUS a combined total at the bottom showing the overall consignment outcome.

2. **Manual re-generate, but mandatory.**
   If the user edits a pending consignment (changes head counts or herds), they must click "Re-generate Analysis" before they can proceed. The button is required - they can't skip it. This keeps the user in control while ensuring the analysis stays current.

3. **Prediction accuracy comparison - YES.**
   After post-kill analysis, Grid IQ shows a "prediction accuracy" view comparing the pre-sale estimate to the actual result. This builds trust in the tool over time and helps users understand how their data improves predictions.

---

## Additional Design Decisions (Confirmed)

4. **Kill sheet to consignment auto-matching - YES.**
   When uploading the actual kill sheet in Stage 2, Grid IQ will auto-suggest which pending consignment it belongs to by matching processor name, approximate head count, and date. The user can override the suggestion if needed.

5. **Multiple kill sheets per consignment - YES (optional support).**
   While uncommon, a consignment can receive multiple kill sheets (e.g. processor sends feedback in batches). The system will support linking additional kill sheets to an existing consignment. Post-kill analysis will merge/aggregate across all linked kill sheets.
