"use client";

import { useState, useMemo } from "react";
import { Calculator } from "lucide-react";
import type { SerializedPriceMaps } from "./page";
import {
  calculateHerdValuation,
  type HerdForValuation,
  type CategoryPriceEntry,
  type HerdValuationResult,
} from "@/lib/engines/valuation-engine";

interface Props {
  priceMaps: SerializedPriceMaps;
}

const speciesOptions = ["Cattle", "Sheep", "Pig", "Goat"] as const;
const breedingPrograms = ["uncontrolled", "controlled", "ai"] as const;

function fmtDollar(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtCents(n: number): string {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
}

export function TestCalculator({ priceMaps }: Props) {
  // Form state
  const [species, setSpecies] = useState<string>("Cattle");
  const [breed, setBreed] = useState("Angus");
  const [category, setCategory] = useState("Yearling Steer");
  const [headCount, setHeadCount] = useState(100);
  const [initialWeight, setInitialWeight] = useState(350);
  const [dwg, setDwg] = useState(0.8);
  const [mortalityRate, setMortalityRate] = useState(1);
  const [daysAgo, setDaysAgo] = useState(90);
  const [saleyard, setSaleyard] = useState("");
  const [breedPremiumOverride, setBreedPremiumOverride] = useState("");
  const [isBreeder, setIsBreeder] = useState(false);
  const [isPregnant, setIsPregnant] = useState(false);
  const [breedingProgram, setBreedingProgram] = useState<string>("uncontrolled");
  const [calvingRate, setCalvingRate] = useState(85);
  const [joinedDaysAgo, setJoinedDaysAgo] = useState(120);

  // Reconstruct Maps from serialized data
  const maps = useMemo(() => ({
    national: new Map<string, CategoryPriceEntry[]>(Object.entries(priceMaps.national)),
    saleyard: new Map<string, CategoryPriceEntry[]>(Object.entries(priceMaps.saleyard)),
    saleyardBreed: new Map<string, CategoryPriceEntry[]>(Object.entries(priceMaps.saleyardBreed)),
    premium: new Map<string, number>(Object.entries(priceMaps.premium)),
  }), [priceMaps]);

  // Calculate on every render (pure function, fast)
  const result: HerdValuationResult | null = useMemo(() => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - daysAgo * 86400000);
    const joinedDate = isBreeder && isPregnant ? new Date(now.getTime() - joinedDaysAgo * 86400000) : null;

    const herd: HerdForValuation = {
      head_count: headCount,
      initial_weight: initialWeight,
      current_weight: initialWeight,
      daily_weight_gain: dwg,
      dwg_change_date: null,
      previous_dwg: null,
      created_at: createdAt.toISOString(),
      species: species as HerdForValuation["species"],
      category,
      breed,
      breed_premium_override: breedPremiumOverride !== "" ? parseFloat(breedPremiumOverride) : null,
      mortality_rate: mortalityRate / 100,
      is_breeder: isBreeder,
      is_pregnant: isPregnant,
      joined_date: joinedDate?.toISOString() ?? null,
      calving_rate: calvingRate / 100,
      breeding_program_type: isBreeder ? breedingProgram as HerdForValuation["breeding_program_type"] : null,
      joining_period_start: null,
      joining_period_end: null,
      selected_saleyard: saleyard || null,
    };

    return calculateHerdValuation(
      herd, maps.national, maps.premium, undefined, maps.saleyard, maps.saleyardBreed,
    );
  }, [species, breed, category, headCount, initialWeight, dwg, mortalityRate, daysAgo, saleyard, breedPremiumOverride, isBreeder, isPregnant, breedingProgram, calvingRate, joinedDaysAgo, maps]);

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      {/* Input form */}
      <div className="rounded-xl border border-white/[0.06] bg-surface-secondary p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-semibold text-text-primary">Test Herd Inputs</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Species">
            <select value={species} onChange={(e) => setSpecies(e.target.value)} className="input-field">
              {speciesOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Breed">
            <input value={breed} onChange={(e) => setBreed(e.target.value)} className="input-field" />
          </Field>
          <Field label="Category">
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="input-field" />
          </Field>
          <Field label="Saleyard">
            <input value={saleyard} onChange={(e) => setSaleyard(e.target.value)} className="input-field" placeholder="Optional" />
          </Field>
          <Field label="Head Count">
            <input type="number" value={headCount} onChange={(e) => setHeadCount(+e.target.value)} className="input-field" />
          </Field>
          <Field label="Initial Weight (kg)">
            <input type="number" value={initialWeight} onChange={(e) => setInitialWeight(+e.target.value)} className="input-field" />
          </Field>
          <Field label="DWG (kg/day)">
            <input type="number" step="0.1" value={dwg} onChange={(e) => setDwg(+e.target.value)} className="input-field" />
          </Field>
          <Field label="Days Held">
            <input type="number" value={daysAgo} onChange={(e) => setDaysAgo(+e.target.value)} className="input-field" />
          </Field>
          <Field label="Mortality Rate (%)">
            <input type="number" step="0.1" value={mortalityRate} onChange={(e) => setMortalityRate(+e.target.value)} className="input-field" />
          </Field>
          <Field label="Breed Premium Override (%)">
            <input value={breedPremiumOverride} onChange={(e) => setBreedPremiumOverride(e.target.value)} className="input-field" placeholder="Auto" />
          </Field>
        </div>

        {/* Breeding section */}
        <div className="border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-4 mb-3">
            <label className="flex items-center gap-1.5 text-xs text-text-muted">
              <input type="checkbox" checked={isBreeder} onChange={(e) => setIsBreeder(e.target.checked)} className="accent-brand" />
              Breeder
            </label>
            {isBreeder && (
              <label className="flex items-center gap-1.5 text-xs text-text-muted">
                <input type="checkbox" checked={isPregnant} onChange={(e) => setIsPregnant(e.target.checked)} className="accent-brand" />
                Pregnant
              </label>
            )}
          </div>
          {isBreeder && isPregnant && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Breeding Program">
                <select value={breedingProgram} onChange={(e) => setBreedingProgram(e.target.value)} className="input-field">
                  {breedingPrograms.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Calving Rate (%)">
                <input type="number" value={calvingRate} onChange={(e) => setCalvingRate(+e.target.value)} className="input-field" />
              </Field>
              <Field label="Joined (days ago)">
                <input type="number" value={joinedDaysAgo} onChange={(e) => setJoinedDaysAgo(+e.target.value)} className="input-field" />
              </Field>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Net value hero */}
          <div className="rounded-xl border border-brand/20 bg-brand/[0.04] px-5 py-4">
            <p className="text-xs text-text-muted mb-1">Net Value</p>
            <p className="text-3xl font-bold tabular-nums text-brand">{fmtDollar(result.netValue)}</p>
            <p className="text-xs text-text-muted mt-1">
              {fmtDollar(result.netValue / headCount)} per head
            </p>
          </div>

          {/* Breakdown cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniCard label="Physical Value" value={fmtDollar(result.physicalValue)} />
            <MiniCard label="Base MV" value={fmtDollar(result.baseMarketValue)} />
            <MiniCard label="WG Accrual" value={fmtDollar(result.weightGainAccrual)} color="emerald" />
            <MiniCard label="Mortality" value={result.mortalityDeduction > 0 ? `-${fmtDollar(result.mortalityDeduction)}` : "-"} color="red" />
            <MiniCard label="Breeding Accrual" value={result.breedingAccrual > 0 ? fmtDollar(result.breedingAccrual) : "-"} color="sky" />
            <MiniCard label="Gross Value" value={fmtDollar(result.grossValue)} />
            <MiniCard label="Proj. Weight" value={`${result.projectedWeight.toFixed(1)} kg`} />
            <MiniCard label="Price Source" value={result.priceSource} badge />
          </div>

          {/* Formula walkthrough */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70 mb-2">
              Formula Walkthrough
            </p>
            <div className="space-y-1.5 font-mono text-[11px] text-amber-200/80">
              <p>ProjectedWeight = {initialWeight} + ({dwg} x {result.daysHeld}) = <strong>{result.projectedWeight.toFixed(1)} kg</strong></p>
              <p>BasePrice = {fmtCents(result.basePrice)} /kg ({result.priceSource}{result.matchedWeightRange ? `, ${result.matchedWeightRange} bracket` : ""})</p>
              {result.breedPremiumApplied !== 0 && (
                <p>BreedPremium = {fmtCents(result.basePrice)} x (1 + {result.breedPremiumApplied}%) = <strong>{fmtCents(result.pricePerKg)} /kg</strong></p>
              )}
              <p>PhysicalValue = {headCount} x {result.projectedWeight.toFixed(1)} x {fmtCents(result.pricePerKg)} = <strong>{fmtDollar(result.physicalValue)}</strong></p>
              <p>BaseMarketValue = {headCount} x {initialWeight} x {fmtCents(result.pricePerKg)} = <strong>{fmtDollar(result.baseMarketValue)}</strong></p>
              <p>WeightGainAccrual = {fmtDollar(result.physicalValue)} - {fmtDollar(result.baseMarketValue)} = <strong>{fmtDollar(result.weightGainAccrual)}</strong></p>
              {result.mortalityDeduction > 0 && (
                <p>Mortality = {fmtDollar(result.baseMarketValue)} x ({result.daysHeld}/365) x {mortalityRate}% = <strong>-{fmtDollar(result.mortalityDeduction)}</strong></p>
              )}
              {result.breedingAccrual > 0 && (
                <p>BreedingAccrual = <strong>{fmtDollar(result.breedingAccrual)}</strong></p>
              )}
              <p className="pt-1 border-t border-amber-500/10">
                NetValue = {fmtDollar(result.physicalValue)} - {fmtDollar(result.mortalityDeduction)} + {fmtDollar(result.breedingAccrual)} = <strong className="text-amber-300">{fmtDollar(result.netValue)}</strong>
              </p>
              <p className="text-amber-200/50 text-[10px]">MLA Category: {result.mlaCategory}</p>
            </div>
          </div>
        </div>
      )}

      {/* Inline styles for form inputs */}
      <style jsx>{`
        .input-field {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.03);
          padding: 0.375rem 0.5rem;
          font-size: 0.75rem;
          color: var(--text-primary, #e5e7eb);
          outline: none;
        }
        .input-field:focus {
          border-color: rgba(var(--brand-rgb, 234, 124, 47), 0.4);
        }
        .input-field::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-text-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

function MiniCard({ label, value, color, badge }: { label: string; value: string; color?: string; badge?: boolean }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400",
    red: "text-red-400",
    sky: "text-sky-400",
  };
  const sourceColors: Record<string, string> = {
    saleyard: "bg-emerald-500/15 text-emerald-400",
    national: "bg-amber-500/15 text-amber-400",
    fallback: "bg-red-500/15 text-red-400",
  };

  return (
    <div className="rounded-lg border border-white/[0.06] bg-surface-secondary px-3 py-2">
      <p className="text-[10px] text-text-muted mb-0.5">{label}</p>
      {badge ? (
        <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${sourceColors[value] ?? "text-text-primary"}`}>
          {value}
        </span>
      ) : (
        <p className={`text-sm font-semibold tabular-nums ${color ? colorMap[color] : "text-text-primary"}`}>
          {value}
        </p>
      )}
    </div>
  );
}
