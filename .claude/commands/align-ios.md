# Align with iOS

Check the specified web component/feature for consistency with the iOS implementation. The iOS app is the reference implementation - web should match its behaviour.

## Key Alignment Points

### Valuation Formula
- 7-step formula identical to iOS
- Weight range matching: inclusive bounds, boundary prefers upper bracket
- Breed premiums: same source (Supabase table, 7-day cache, local fallback)
- Price fallback hierarchy: saleyard+breed > saleyard+general > state+breed > national+breed > national+general > hardcoded
- Rounding: Math.round everywhere (matches iOS .halfUp)
- Mortality: compound decay, floor at 0
- Breeding accrual: 365-day cycle cap

### Data Model
- Supabase table: herds (not "herds")
- Always filter is_deleted = false
- Same field names and types
- Same reference data (breeds, saleyards, categories)

### Category Mapping
- MLA category mappings match ReferenceData.swift
- CSV category map entries identical (including PTIC, Feeder cow)

### Display
- Currency: AUD, dollar sign, commas, no decimals on whole dollars
- Weights: kg
- Dates: dd/MM/yyyy
- Terminology: "herd" never "mob"
- No em-dashes anywhere

### Features to Compare
Read the iOS implementation of the feature being checked, then verify the web version produces identical results for the same inputs.

## Output
For each discrepancy:
1. What differs
2. iOS behaviour (correct)
3. Web behaviour (to fix)
4. Code change needed
