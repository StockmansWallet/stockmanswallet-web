# Valuation Engine Check

Verify the web valuation engine matches the iOS canonical formula and produces identical results.

## The 7 Steps (canonical, must match iOS)

1. **Projected Weight** = initialWeight + (DWG * days elapsed). Dual-phase if DWG change date set.
2. **Market Price** = saleyard general > nearest saleyard (if stale >56 days) > national general > fallback. Cents/kg from DB divided by 100 to dollars.
3. **Breed Premium** = herd override > Supabase breed_premiums > local dictionary. Applied to general base price only (never to breed-specific price).
4. **Physical Value** = headCount * projectedWeight * pricePerKg
5. **Breeding Accrual** = pre-birth accrual (accrued %, 365-day cycle) + calves at foot value (with DWG growth)
6. **Gross Value** = Physical Value + Breeding Accrual
7. **Mortality Deduction** = Gross Value * (daysElapsed/365) * mortalityRate
8. **NRV** = Gross Value - Mortality Deduction

## Key Files
- `lib/engines/valuation-engine.ts` - Main engine
- `lib/data/weight-mapping.ts` - Category resolution
- `lib/data/reference-data.ts` - Breed premiums, saleyard mappings

## Check
1. Read the valuation engine file
2. Trace each step against the spec above
3. Verify cents-to-dollars conversion (price_per_kg / 100) in all price map builders
4. Verify nearest saleyard fallback logic matches iOS
5. Verify breed premium is applied to general base price, not breed-specific
6. Verify Math.round used consistently for dollar display
7. Compare with iOS `ValuationEngine+HerdValuation.swift` for any drift

## Output
Step-by-step comparison: spec vs implementation, with PASS/FAIL for each.
