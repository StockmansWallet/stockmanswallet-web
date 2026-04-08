"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Calculator, Loader2 } from "lucide-react";
import type { SerializedPriceMaps, SaleyardCoverage, HerdWithValuation } from "./page";
import {
  calculateHerdValuation,
  parseCalvesAtFoot,
  type HerdForValuation,
  type CategoryPriceEntry,
  type HerdValuationResult,
} from "@/lib/engines/valuation-engine";
import {
  cattleBreeds, sheepBreeds, pigBreeds, goatBreeds,
  saleyards, cattleBreedPremiums,
} from "@/lib/data/reference-data";
import { cattleMasterCategories } from "@/lib/data/weight-mapping";
import { categoryFallback } from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";

interface Props {
  priceMaps: SerializedPriceMaps;
  saleyardCoverage: SaleyardCoverage[];
  herds: HerdWithValuation[];
  prefillHerdId?: string | null;
  onClearPrefill?: () => void;
}

const speciesOptions = ["Cattle", "Sheep", "Pig", "Goat"] as const;
const breedingPrograms = ["uncontrolled", "controlled", "ai"] as const;

const breedsBySpecies: Record<string, readonly string[]> = {
  Cattle: cattleBreeds,
  Sheep: sheepBreeds,
  Pig: pigBreeds,
  Goat: goatBreeds,
};

const categoriesBySpecies: Record<string, readonly string[]> = {
  Cattle: cattleMasterCategories,
  Sheep: [],
  Pig: [],
  Goat: [],
};

function fmtDollar(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtCents(n: number, decimals = 4): string {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function TestCalculator({ priceMaps, saleyardCoverage, herds, prefillHerdId, onClearPrefill }: Props) {
  // Form state
  const [species, setSpecies] = useState<string>("Cattle");
  const [breed, setBreed] = useState("Angus");
  const [category, setCategory] = useState("Yearling Steer");
  const [headCount, setHeadCount] = useState(1);
  const [initialWeight, setInitialWeight] = useState(350);
  const [dwg, setDwg] = useState(1);
  const [mortalityRate, setMortalityRate] = useState(1);
  const [daysAgo, setDaysAgo] = useState(100);
  const [saleyard, setSaleyard] = useState("");
  const [breedPremiumOverride, setBreedPremiumOverride] = useState("");
  const [isBreeder, setIsBreeder] = useState(false);
  const [isPregnant, setIsPregnant] = useState(false);
  const [breedingProgram, setBreedingProgram] = useState<string>("uncontrolled");
  const [calvingRate, setCalvingRate] = useState(85);
  const [joinedDaysAgo, setJoinedDaysAgo] = useState(120);
  const [prefillName, setPrefillName] = useState<string | null>(null);
  // Exact timestamps from pre-filled herd (for precise fractional-day calculation matching the live engine)
  const [exactCreatedAt, setExactCreatedAt] = useState<string | null>(null);
  const [exactJoinedDate, setExactJoinedDate] = useState<string | null>(null);
  // Calves at foot
  const [calvesHeadCount, setCalvesHeadCount] = useState(0);
  const [calvesAgeMonths, setCalvesAgeMonths] = useState(0);
  const [calvesWeight, setCalvesWeight] = useState<string>("");
  const [calvesWeightRecordedDate, setCalvesWeightRecordedDate] = useState<string | null>(null);

  // Helper to apply a herd's values to the form
  const applyHerd = useCallback((h: HerdWithValuation) => {
    setSpecies(h.species);
    setBreed(h.breed);
    setCategory(h.category);
    setHeadCount(h.head_count);
    setInitialWeight(h.initial_weight);
    setDwg(h.daily_weight_gain);
    setMortalityRate((h.mortality_rate ?? 0.01) * 100);
    const days = Math.max(0, Math.floor((Date.now() - new Date(h.created_at).getTime()) / 86400000));
    setDaysAgo(days);
    setSaleyard(h.selected_saleyard ?? "");
    setBreedPremiumOverride(h.breed_premium_override != null ? String(h.breed_premium_override) : "");
    setIsBreeder(h.is_breeder);
    setIsPregnant(h.is_pregnant);
    if (h.breeding_program_type) setBreedingProgram(h.breeding_program_type);
    setCalvingRate((h.calving_rate ?? 0.85) * 100);
    if (h.joined_date) {
      const jDays = Math.max(0, Math.floor((Date.now() - new Date(h.joined_date).getTime()) / 86400000));
      setJoinedDaysAgo(jDays);
    }
    // Store exact timestamps so the calculation uses fractional days (matching the live engine)
    setExactCreatedAt(h.created_at);
    setExactJoinedDate(h.joined_date);
    // Calves at foot
    const calvesData = parseCalvesAtFoot(h.additional_info);
    if (calvesData) {
      setCalvesHeadCount(calvesData.headCount);
      setCalvesAgeMonths(calvesData.ageMonths);
      setCalvesWeight(calvesData.averageWeight != null ? String(calvesData.averageWeight) : "");
      setCalvesWeightRecordedDate(h.calf_weight_recorded_date);
    } else {
      setCalvesHeadCount(0);
      setCalvesAgeMonths(0);
      setCalvesWeight("");
      setCalvesWeightRecordedDate(null);
    }
    setPrefillName(h.name);
  }, []);

  // Pre-fill from herd when navigated from the breakdown table
  useEffect(() => {
    if (!prefillHerdId) return;
    const h = herds.find((x) => x.id === prefillHerdId);
    if (!h) return;
    applyHerd(h);
    onClearPrefill?.();
  }, [prefillHerdId, herds, onClearPrefill, applyHerd]);

  // Premium map from server (always available)
  const premiumMap = useMemo(
    () => new Map<string, number>(Object.entries(priceMaps.premium)),
    [priceMaps.premium],
  );

  // On-demand price fetching for selected saleyard
  const [fetchedPrices, setFetchedPrices] = useState<{
    saleyard: string;
    national: Map<string, CategoryPriceEntry[]>;
    sy: Map<string, CategoryPriceEntry[]>;
    syBreed: Map<string, CategoryPriceEntry[]>;
  } | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const fetchPrices = useCallback((sy: string) => {
    if (!sy) { setFetchedPrices(null); return; }
    setPriceLoading(true);
    fetch(`/api/admin/saleyard-prices?saleyard=${encodeURIComponent(sy)}`)
      .then((res) => res.json())
      .then((rows: { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string }[]) => {
        const national = new Map<string, CategoryPriceEntry[]>();
        const syMap = new Map<string, CategoryPriceEntry[]>();
        const syBreed = new Map<string, CategoryPriceEntry[]>();
        for (const p of rows) {
          const entry: CategoryPriceEntry = { price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range, data_date: p.data_date };
          if (p.saleyard === "National" && !p.breed) {
            const arr = national.get(p.category) ?? [];
            arr.push(entry);
            national.set(p.category, arr);
          } else if (p.saleyard !== "National") {
            if (!p.breed) {
              const key = `${p.category}|${p.saleyard}`;
              const arr = syMap.get(key) ?? [];
              arr.push(entry);
              syMap.set(key, arr);
            } else {
              const key = `${p.category}|${p.breed}|${p.saleyard}`;
              const arr = syBreed.get(key) ?? [];
              arr.push(entry);
              syBreed.set(key, arr);
            }
          }
        }
        setFetchedPrices({ saleyard: sy, national, sy: syMap, syBreed });
      })
      .finally(() => setPriceLoading(false));
  }, []);

  useEffect(() => {
    fetchPrices(saleyard);
  }, [saleyard, fetchPrices]);

  // Active price maps: use fetched data for selected saleyard, or server-provided for user's herds
  const maps = useMemo(() => {
    if (fetchedPrices && fetchedPrices.saleyard === saleyard) {
      return {
        national: fetchedPrices.national,
        saleyard: fetchedPrices.sy,
        saleyardBreed: fetchedPrices.syBreed,
        premium: premiumMap,
      };
    }
    return {
      national: new Map<string, CategoryPriceEntry[]>(Object.entries(priceMaps.national)),
      saleyard: new Map<string, CategoryPriceEntry[]>(Object.entries(priceMaps.saleyard)),
      saleyardBreed: new Map<string, CategoryPriceEntry[]>(Object.entries(priceMaps.saleyardBreed)),
      premium: premiumMap,
    };
  }, [fetchedPrices, saleyard, priceMaps, premiumMap]);

  // Resolve current breed premium from maps (Supabase override > local fallback)
  const currentBreedPremium = useMemo(() => {
    const fromMap = premiumMap.get(breed);
    if (fromMap !== undefined) return fromMap;
    return cattleBreedPremiums[breed] ?? null;
  }, [breed, premiumMap]);

  // MLA category + saleyard coverage check (uses full DB coverage, not just user's herds)
  const mlaCategory = useMemo(() => resolveMLACategory(category, initialWeight).primaryMLACategory, [category, initialWeight]);

  const saleyardHasData = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const sy of saleyards) {
      const coverage = saleyardCoverage.find((c) => c.saleyard === sy);
      if (!coverage) { result[sy] = false; continue; }
      const fallbackCat = categoryFallback(mlaCategory);
      result[sy] = coverage.categories.includes(mlaCategory) || (fallbackCat !== null && coverage.categories.includes(fallbackCat));
    }
    return result;
  }, [mlaCategory, saleyardCoverage]);

  const sortedSaleyards = useMemo(() => {
    const withData = saleyards.filter((s) => saleyardHasData[s]);
    const without = saleyards.filter((s) => !saleyardHasData[s]);
    return [...withData, ...without];
  }, [saleyardHasData]);

  // Clear exact timestamps when the user manually edits Days Held
  const handleDaysAgoChange = (value: number) => {
    setDaysAgo(value);
    setExactCreatedAt(null);
  };
  const handleJoinedDaysAgoChange = (value: number) => {
    setJoinedDaysAgo(value);
    setExactJoinedDate(null);
  };

  // Calculate on every render (pure function, fast)
  // When loaded from a herd, uses the exact created_at timestamp for fractional-day precision
  // (matching the live valuation engine). Manual input uses whole days.
  const result: HerdValuationResult | null = useMemo(() => {
    const now = new Date();
    const createdAt = exactCreatedAt
      ? new Date(exactCreatedAt)
      : new Date(now.getTime() - daysAgo * 86400000);
    const joinedDate = isBreeder && isPregnant
      ? (exactJoinedDate ? new Date(exactJoinedDate) : new Date(now.getTime() - joinedDaysAgo * 86400000))
      : null;

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
      additional_info: calvesHeadCount > 0 && calvesAgeMonths > 0
        ? `Calves at Foot: ${calvesHeadCount} head, ${calvesAgeMonths} months${calvesWeight ? `, ${calvesWeight} kg` : ""}`
        : null,
      calf_weight_recorded_date: calvesHeadCount > 0 ? calvesWeightRecordedDate : null,
      updated_at: new Date().toISOString(),
    };

    return calculateHerdValuation(
      herd, maps.national, maps.premium, undefined, maps.saleyard, maps.saleyardBreed,
    );
  }, [species, breed, category, headCount, initialWeight, dwg, mortalityRate, daysAgo, saleyard, breedPremiumOverride, isBreeder, isPregnant, breedingProgram, calvingRate, joinedDaysAgo, maps, exactCreatedAt, exactJoinedDate, calvesHeadCount, calvesAgeMonths, calvesWeight, calvesWeightRecordedDate]);

  return (
    <div className="grid gap-4 lg:grid-cols-[480px_1fr]">
      {/* Input form */}
      <div className="rounded-xl border border-white/[0.06] bg-surface-secondary p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-semibold text-text-primary">Test Herd Inputs</h3>
          {prefillName && (
            <span className="ml-auto text-[10px] text-brand font-medium" title="Uses exact creation timestamp for precise fractional-day calculation, matching the live valuation.">
              Loaded: {prefillName} (exact match)
            </span>
          )}
        </div>
        {herds.length > 0 && (
          <div>
            <label className="block text-[10px] font-medium text-text-muted mb-1">Load from herd</label>
            <select
              value=""
              onChange={(e) => {
                const h = herds.find((x) => x.id === e.target.value);
                if (!h) return;
                applyHerd(h);
              }}
              className="input-field"
            >
              <option value="">Select a herd...</option>
              {herds.map((h) => (
                <option key={h.id} value={h.id}>{h.name} ({h.breed}, {h.category})</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Species">
            <select value={species} onChange={(e) => {
              const s = e.target.value;
              setSpecies(s);
              setBreed((breedsBySpecies[s] ?? [])[0] ?? "");
              setCategory((categoriesBySpecies[s] ?? [])[0] ?? "");
            }} className="input-field">
              {speciesOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Breed">
            <select value={breed} onChange={(e) => setBreed(e.target.value)} className="input-field">
              {(breedsBySpecies[species] ?? []).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
              {(categoriesBySpecies[species] ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label={priceLoading ? "Saleyard (loading prices...)" : "Saleyard"}>
            <select value={saleyard} onChange={(e) => setSaleyard(e.target.value)} className="input-field">
              <option value="">None (national price)</option>
              {sortedSaleyards.map((s) => (
                <option key={s} value={s}>
                  {saleyardHasData[s] ? `✓ ${s}` : `✗ ${s} (no data)`}
                </option>
              ))}
            </select>
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
          <Field label={exactCreatedAt ? "Days Held (using exact time)" : "Days Held"}>
            <input type="number" value={daysAgo} onChange={(e) => handleDaysAgoChange(+e.target.value)} className="input-field" />
            {exactCreatedAt && (
              <span className="text-[9px] text-text-muted mt-0.5 block">
                Exact: {((Date.now() - new Date(exactCreatedAt).getTime()) / 86400000).toFixed(2)}d - editing clears exact mode
              </span>
            )}
          </Field>
          <Field label="Mortality Rate (%)">
            <input type="number" step="0.1" value={mortalityRate} onChange={(e) => setMortalityRate(+e.target.value)} className="input-field" />
          </Field>
          <Field label="Breed Premium Override (%)">
            <input value={breedPremiumOverride} onChange={(e) => setBreedPremiumOverride(e.target.value)} className="input-field" placeholder={currentBreedPremium !== null ? `Auto (${currentBreedPremium}%)` : "Auto (none)"} />
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
                <input type="number" value={joinedDaysAgo} onChange={(e) => handleJoinedDaysAgoChange(+e.target.value)} className="input-field" />
              </Field>
            </div>
          )}
          {isBreeder && (
            <div className="mt-3">
              <p className="text-[10px] font-medium text-text-muted mb-2">Calves at Foot</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Calf Head Count">
                  <input type="number" min={0} value={calvesHeadCount} onChange={(e) => setCalvesHeadCount(+e.target.value)} className="input-field" />
                </Field>
                <Field label="Calf Age (months)">
                  <input type="number" min={0} value={calvesAgeMonths} onChange={(e) => setCalvesAgeMonths(+e.target.value)} className="input-field" />
                </Field>
                <Field label="Avg Calf Weight (kg)">
                  <input type="number" step="0.1" value={calvesWeight} onChange={(e) => setCalvesWeight(e.target.value)} placeholder="Auto from age" className="input-field" />
                </Field>
                <Field label="Weight Recorded Date">
                  <input type="date" value={calvesWeightRecordedDate?.split("T")[0] ?? ""} onChange={(e) => setCalvesWeightRecordedDate(e.target.value ? new Date(e.target.value).toISOString() : null)} className="input-field" />
                </Field>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-2">
          {/* Hero row - Net Value, Per Head, Price Source */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-brand/20 bg-brand/[0.06] px-3 py-2">
              <p className="text-[10px] text-text-muted mb-0.5">Net Value</p>
              <p className="text-lg font-bold tabular-nums text-brand">{fmtDollar(result.netValue)}</p>
            </div>
            <div className="rounded-lg border border-brand/20 bg-brand/[0.06] px-3 py-2">
              <p className="text-[10px] text-text-muted mb-0.5">Per Head</p>
              <p className="text-lg font-bold tabular-nums text-brand">{fmtDollar(result.netValue / headCount)}</p>
            </div>
            <MiniCard label="Price Source" value={result.priceSource} badge />
          </div>

          {/* Breakdown cards - 3 column grid */}
          <div className="grid grid-cols-3 gap-2">
            <MiniCard label="Base Market Value" value={fmtDollar(result.baseMarketValue)} />
            <MiniCard label="Physical Value" value={fmtDollar(result.physicalValue)} />
            <MiniCard label="Gross Value" value={fmtDollar(result.grossValue)} />
            <MiniCard label="Proj. Weight" value={`${result.projectedWeight.toFixed(1)} kg`} />
            <MiniCard label="Base $/kg" value={fmtCents(result.basePrice, 2)} />
            <MiniCard label="Adj $/kg" value={fmtCents(result.pricePerKg, 2)} />
            <MiniCard label="WG Accrual" value={fmtDollar(result.weightGainAccrual)} color="emerald" />
            <MiniCard label="Mortality" value={result.mortalityDeduction > 0 ? `-${fmtDollar(result.mortalityDeduction)}` : "-"} color="red" />
            <MiniCard label="Breeding Accrual" value={result.breedingAccrual > 0 ? fmtDollar(result.breedingAccrual) : "-"} color="sky" />
            {result.preBirthAccrual > 0 && (
              <MiniCard label="└ Pre-Birth" value={fmtDollar(result.preBirthAccrual)} color="sky" />
            )}
            {result.calvesAtFootValue > 0 && (
              <MiniCard label="└ Calves at Foot" value={fmtDollar(result.calvesAtFootValue)} color="sky" />
            )}
          </div>

          {/* Formula walkthrough */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70 mb-2">
              Formula Walkthrough
            </p>
            <div className="space-y-1.5 font-mono text-[11px] text-amber-200/80">
              <p>ProjectedWeight = {initialWeight} + ({dwg} x {result.daysHeld}) = <strong>{result.projectedWeight.toFixed(1)} kg</strong></p>
              <p>BasePrice = {fmtCents(result.basePrice, 2)} /kg</p>
              {result.breedPremiumApplied !== 0 && (
                <p>BreedPremium = {fmtCents(result.basePrice, 2)} x (1 + {result.breedPremiumApplied}%) = <strong>{fmtCents(result.pricePerKg, 2)} /kg</strong></p>
              )}
              <p>PhysicalValue = {headCount} x {result.projectedWeight.toFixed(1)} x {fmtCents(result.pricePerKg, 2)} = <strong>{fmtDollar(result.physicalValue)}</strong></p>
              <p>BaseMarketValue = {headCount} x {initialWeight} x {fmtCents(result.pricePerKg, 2)} = <strong>{fmtDollar(result.baseMarketValue)}</strong></p>
              <p>WeightGainAccrual = {fmtDollar(result.physicalValue)} - {fmtDollar(result.baseMarketValue)} = <strong>{fmtDollar(result.weightGainAccrual)}</strong></p>
              {result.mortalityDeduction > 0 && (
                <p>Mortality = {fmtDollar(result.physicalValue)} x ({result.daysHeld}/365) x {mortalityRate}% = <strong>-{fmtDollar(result.mortalityDeduction)}</strong></p>
              )}
              {result.preBirthAccrual > 0 && (
                <p>PreBirthAccrual = {headCount} x {calvingRate}% x ({result.daysHeld}/365) x {(initialWeight * (species === "Sheep" ? 0.08 : 0.07)).toFixed(1)}kg x {fmtCents(result.pricePerKg, 2)} = <strong>{fmtDollar(result.preBirthAccrual)}</strong></p>
              )}
              {result.calvesAtFootValue > 0 && (
                <p>CalvesAtFootValue = <strong>{fmtDollar(result.calvesAtFootValue)}</strong></p>
              )}
              {result.preBirthAccrual > 0 && result.calvesAtFootValue > 0 && (
                <p>BreedingAccrual = {fmtDollar(result.preBirthAccrual)} + {fmtDollar(result.calvesAtFootValue)} = <strong>{fmtDollar(result.breedingAccrual)}</strong></p>
              )}
              <p className="pt-1 border-t border-amber-500/10">
                NetValue = {fmtDollar(result.physicalValue)} - {fmtDollar(result.mortalityDeduction)} + {fmtDollar(result.breedingAccrual)} = <strong className="text-amber-300">{fmtDollar(result.netValue)}</strong>
              </p>
              <div className="pt-1.5 mt-1 border-t border-amber-500/10 space-y-0.5 text-amber-200/50 text-[10px]">
                <p>Price Data Source = ({result.priceSource === "saleyard" ? "Saleyard" : result.priceSource === "national" ? "National" : "Fallback"}){result.matchedWeightRange ? `, ${result.matchedWeightRange} bracket` : ""}</p>
                <p>Latest Data Source Date = {result.dataDate ?? "fallback"}</p>
                <p>Category Mapping: {category} → {result.mlaCategory}</p>
              </div>
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
