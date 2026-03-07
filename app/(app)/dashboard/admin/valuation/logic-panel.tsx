"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";

export function LogicPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-amber-500/[0.04]"
      >
        <BookOpen className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-medium text-amber-300">Calculation Logic</span>
        {open ? (
          <ChevronDown className="ml-auto h-4 w-4 text-amber-400/60" />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-amber-400/60" />
        )}
      </button>

      {open && (
        <div className="border-t border-amber-500/10 px-4 py-4">
          <pre className="overflow-x-auto text-[11px] leading-relaxed font-mono text-amber-200/80">
{`PROJECTED WEIGHT
  Standard:   ProjectedWeight = InitialWeight + (DWG x DaysElapsed)
  Split DWG:  ProjectedWeight = InitialWeight + (OldDWG x DaysPhase1) + (NewDWG x DaysPhase2)
              DaysPhase1 = days from createdAt to dwgChangeDate
              DaysPhase2 = days from dwgChangeDate to now

PHYSICAL VALUE
  PhysicalValue = HeadCount x ProjectedWeight x AdjustedPrice

BASE MARKET VALUE (used for mortality only)
  BaseMarketValue = HeadCount x InitialWeight x AdjustedPrice

WEIGHT GAIN ACCRUAL
  WeightGainAccrual = PhysicalValue - BaseMarketValue

PRICE RESOLUTION (hierarchy)
  1. Saleyard general (breed=null) price   -> apply breed premium
  2. Saleyard breed-specific price         -> NO breed premium (already baked in)
  3. National general (breed=null) price   -> apply breed premium
  4. Hardcoded category fallback           -> apply breed premium

BREED PREMIUM
  AdjustedPrice = BasePrice x (1 + BreedPremium% / 100)
  Source priority: herd override > Supabase breed_premiums > ReferenceData fallback
  Skipped entirely when using breed-specific saleyard price (step 2 above)

PRE-BIRTH ACCRUAL (breeders only, pregnant with joined date)
  ExpectedProgeny  = HeadCount x CalvingRate
  CalfBirthWeight  = InitialWeight x 0.07 (cattle) / 0.08 (sheep)
  AccruedPct       = min(1.0, DaysElapsed / 365)
  PreBirthAccrual  = ExpectedProgeny x AccruedPct x CalfBirthWeight x AdjustedPrice
  Accrual start:
    - Uncontrolled:     joinedDate
    - AI / Controlled:  midpoint of joiningPeriodStart and joiningPeriodEnd

CALVES AT FOOT (iOS only, not yet in web engine)
  CurrentCalfWeight   = RecordedWeight + (0.9 kg/day x DaysSinceRecorded)  [cattle]
                      = RecordedWeight + (0.25 kg/day x DaysSinceRecorded) [sheep]
  CalvesAtFootValue   = CalfHeadCount x CurrentCalfWeight x AdjustedPrice

MORTALITY DEDUCTION
  MortalityDeduction = BaseMarketValue x (DaysHeld / 365) x AnnualMortalityRate
  Applied to base market value only (initial weight, not projected)

GROSS VALUE
  GrossValue = PhysicalValue + BreedingAccrual

NET VALUE
  NetValue = PhysicalValue - MortalityDeduction + BreedingAccrual`}
          </pre>
        </div>
      )}
    </div>
  );
}
