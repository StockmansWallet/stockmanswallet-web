"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Info } from "lucide-react";
import {
  breedsForSpecies,
  categoriesForSpecies,
  cattleBreedPremiums,
  cattleCategoryGroups,
  breedPremiumDescription,
  saleyards,
  saleyardToState,
  saleyardCoordinates,
} from "@/lib/data/reference-data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BREEDER_KEYWORDS = ["breeder", "wet cow"];

function isBreederCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return BREEDER_KEYWORDS.some((kw) => lower.includes(kw));
}

const SPECIES_OPTIONS = [
  { value: "Cattle", label: "Cattle" },
  { value: "Sheep", label: "Sheep (Coming Soon)", disabled: true },
  { value: "Pig", label: "Pig (Coming Soon)", disabled: true },
  { value: "Goat", label: "Goat (Coming Soon)", disabled: true },
];

type BreedingProgram = "ai" | "controlled" | "uncontrolled" | "";

const BREEDING_PROGRAM_OPTIONS = [
  { value: "ai", label: "Artificial Insemination" },
  { value: "controlled", label: "Controlled Breeding" },
  { value: "uncontrolled", label: "Uncontrolled Breeding" },
];

// Haversine distance in km (matches iOS implementation)
function haversineDistance(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Build saleyard options - flat list for fallback + groups for custom dropdown
function buildSaleyardData(
  propLat: number | null,
  propLon: number | null,
  propState: string | null,
): { flat: { value: string; label: string }[]; groups: { header: string; options: { value: string; label: string }[] }[] } {
  let closestNames: string[] = [];

  if (propLat != null && propLon != null) {
    const withDist = saleyards
      .map((s) => {
        const coords = saleyardCoordinates[s];
        const dist = coords
          ? haversineDistance(propLat, propLon, coords.lat, coords.lon)
          : Infinity;
        return { name: s, dist };
      })
      .sort((a, b) => a.dist - b.dist);
    closestNames = withDist.slice(0, 3).map((s) => s.name);
  } else if (propState) {
    closestNames = saleyards
      .filter((s) => saleyardToState[s] === propState)
      .slice(0, 3);
  }

  const closestSet = new Set(closestNames);
  const flat: { value: string; label: string }[] = [];
  const groups: { header: string; options: { value: string; label: string }[] }[] = [];

  // Nearest group
  if (closestNames.length > 0) {
    const nearestOpts = closestNames.map((name) => ({ value: name, label: name }));
    groups.push({ header: "Nearest", options: nearestOpts });
    flat.push(...nearestOpts);
  }

  // Remaining sorted by state then name
  const stateOrder = ["NSW", "QLD", "VIC", "SA", "WA", "TAS", "Other"];
  const remaining = saleyards.filter((s) => !closestSet.has(s));
  remaining.sort((a, b) => {
    const stateA = saleyardToState[a] ?? "Other";
    const stateB = saleyardToState[b] ?? "Other";
    const idxA = stateOrder.indexOf(stateA);
    const idxB = stateOrder.indexOf(stateB);
    if (idxA !== idxB) return idxA - idxB;
    return a.localeCompare(b);
  });

  // Group remaining by state
  const byState = new Map<string, { value: string; label: string }[]>();
  for (const name of remaining) {
    const state = saleyardToState[name] ?? "Other";
    if (!byState.has(state)) byState.set(state, []);
    byState.get(state)!.push({ value: name, label: name });
    flat.push({ value: name, label: `${name} (${state})` });
  }
  for (const state of stateOrder) {
    const opts = byState.get(state);
    if (opts && opts.length > 0) {
      groups.push({ header: state, options: opts });
    }
  }

  return { flat, groups };
}

// ---------------------------------------------------------------------------
// Section wrapper with progressive reveal animation
// ---------------------------------------------------------------------------

function Section({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return <div className="animate-fade-in">{children}</div>;
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export interface Property {
  id: string;
  property_name: string;
  is_default: boolean | null;
  latitude: number | null;
  longitude: number | null;
  state: string | null;
}

interface AddHerdFormProps {
  properties: Property[];
  action: (formData: FormData) => Promise<{ error: string } | void>;
}

export function AddHerdForm({ properties, action }: AddHerdFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Section 1 - Identification
  const [name, setName] = useState("");
  const [paddock, setPaddock] = useState("");
  const [species, setSpecies] = useState("Cattle");
  const [breed, setBreed] = useState("");
  const [category, setCategory] = useState("");
  const [breedPremiumOverride, setBreedPremiumOverride] = useState("");

  // Section 2 - Herd Size
  const [headCount, setHeadCount] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [initialWeight, setInitialWeight] = useState("");

  // Section 3 - Growth & Mortality (now text inputs, all optional)
  const [calvingRate, setCalvingRate] = useState("50");
  const [dailyWeightGain, setDailyWeightGain] = useState("0");
  const [mortalityRate, setMortalityRate] = useState("0");

  // Section 4 - Calves at Foot (breeder only, checkbox gated)
  const [calvesAtFoot, setCalvesAtFoot] = useState(false);
  const [calvesHeadCount, setCalvesHeadCount] = useState("");
  const [calvesAgeMonths, setCalvesAgeMonths] = useState("");
  const [calvesWeight, setCalvesWeight] = useState("");

  // Section 5 - Breeding Details (breeder only)
  const [breedingProgram, setBreedingProgram] = useState<BreedingProgram>("");
  const [joiningStart, setJoiningStart] = useState("");
  const [joiningEnd, setJoiningEnd] = useState("");

  // Section 6 - Property (dropdown, default = is_default or first)
  const defaultProperty = properties.find((p) => p.is_default) ?? properties[0];
  const [propertyId, setPropertyId] = useState(defaultProperty?.id ?? "");

  // Section 7 - Saleyard (dropdown)
  const [saleyard, setSaleyard] = useState("");

  // Derived
  const isBreeder = isBreederCategory(category);

  const breedOptions = useMemo(
    () => breedsForSpecies(species).map((b) => ({ value: b, label: b })),
    [species],
  );
  const categoryOptions = useMemo(
    () =>
      species === "Cattle"
        ? cattleCategoryGroups.flatMap((g) => g.options).map((c) => ({ value: c, label: c }))
        : categoriesForSpecies(species).map((c) => ({ value: c, label: c })),
    [species],
  );
  const categoryGroups = useMemo(
    () =>
      species === "Cattle"
        ? cattleCategoryGroups.map((g) => ({
            header: g.header,
            options: g.options.map((c) => ({ value: c, label: c })),
          }))
        : undefined,
    [species],
  );
  const autoPremium = species === "Cattle" ? cattleBreedPremiums[breed] ?? null : null;

  // Property options for dropdown
  const propertyOptions = useMemo(
    () => properties.map((p) => ({ value: p.id, label: p.property_name })),
    [properties],
  );

  // Saleyard options - closest 3 to selected property at top
  const selectedProperty = properties.find((p) => p.id === propertyId);
  const saleyardData = useMemo(
    () =>
      buildSaleyardData(
        selectedProperty?.latitude ?? null,
        selectedProperty?.longitude ?? null,
        selectedProperty?.state ?? null,
      ),
    [selectedProperty?.latitude, selectedProperty?.longitude, selectedProperty?.state],
  );

  // Section unlock checks
  const section1Done = name.trim().length > 0 && species !== "" && breed !== "" && category !== "";
  const section2Done = Number(headCount) > 0 && Number(initialWeight) > 0;
  const section3Done = true; // all optional
  // Calves at Foot + Breeding are breeder-only; both optional for unlock
  const section4Done = true;
  const section5Done = true;
  const section6Done = true;

  // Progressive reveal
  const showSection2 = section1Done;
  const showSection3 = showSection2 && section2Done;
  const showSection4 = showSection3 && section3Done && isBreeder; // Calves at Foot
  const showSection5 = showSection4 && section4Done && isBreeder; // Breeding Details
  const showSection6 = isBreeder
    ? showSection5 && section5Done
    : showSection3 && section3Done;
  const showSection7 = showSection6 && section6Done;

  // Save enabled - saleyard required, rest validated
  const canSave = section1Done && section2Done && saleyard !== "" && !submitting;

  // Handlers
  function handleSpeciesChange(newSpecies: string) {
    setSpecies(newSpecies);
    setBreed(breedsForSpecies(newSpecies)[0] ?? "");
    setCategory("");
    setBreedPremiumOverride("");
  }

  function handleCategoryChange(v: string) {
    setCategory(v);
    if (!isBreederCategory(v)) {
      setBreedingProgram("");
      setJoiningStart("");
      setJoiningEnd("");
      setCalvesAtFoot(false);
      setCalvesHeadCount("");
      setCalvesAgeMonths("");
      setCalvesWeight("");
    }
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("species", species);
    formData.set("breed", breed);
    formData.set("category", category);
    formData.set("head_count", headCount || "1");
    formData.set("age_months", ageMonths || "0");
    formData.set("initial_weight", initialWeight || "0");
    formData.set("current_weight", initialWeight || "0");
    formData.set("daily_weight_gain", dailyWeightGain || "0");
    formData.set("mortality_rate", mortalityRate || "0");
    formData.set("paddock_name", paddock.trim());
    formData.set("property_id", propertyId);
    formData.set("selected_saleyard", saleyard);
    if (breedPremiumOverride) formData.set("breed_premium_override", breedPremiumOverride);

    if (isBreeder) {
      formData.set("is_breeder", "on");
      if (breedingProgram) formData.set("breeding_program_type", breedingProgram);
      formData.set("calving_rate", calvingRate || "50");
      if (joiningStart) formData.set("joining_period_start", joiningStart);
      if (joiningEnd) formData.set("joining_period_end", joiningEnd);

      if (calvesAtFoot && (calvesHeadCount || calvesAgeMonths || calvesWeight)) {
        const parts = [];
        if (calvesHeadCount) parts.push(`Calves at Foot: ${calvesHeadCount} head`);
        if (calvesAgeMonths) parts.push(`${calvesAgeMonths} months`);
        if (calvesWeight) parts.push(`${calvesWeight} kg`);
        formData.set("additional_info", parts.join(", "));
      }
    }

    const result = await action(formData);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  const periodLabel = breedingProgram === "ai" ? "Insemination" : "Joining";

  return (
    <div className="space-y-4 pb-4">
      {error && (
        <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Section 1: Herd Identification                                     */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Herd Identification</CardTitle>
          <p className="mt-1 text-sm text-text-secondary">
            Give your herd a name and location and select the type.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="name"
              label="Herd Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Breeders, Steers, Heifers"
              autoFocus
            />
            <Select
              id="category"
              label="Category"
              required
              options={categoryOptions}
              groups={categoryGroups}
              placeholder="Select category"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="paddock"
              label="Paddock (optional)"
              value={paddock}
              onChange={(e) => setPaddock(e.target.value)}
              placeholder="e.g. Swamp Paddock"
            />
            <Select
              id="breed"
              label="Breed"
              required
              custom
              options={breedOptions}
              placeholder="Select breed"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              id="species"
              label="Species"
              required
              custom
              options={SPECIES_OPTIONS}
              value={species}
              onChange={(e) => handleSpeciesChange(e.target.value)}
            />
            <Input
              id="breed_premium_override"
              label="Custom Breed Premium (%)"
              type="number"
              step="0.1"
              value={breedPremiumOverride}
              onChange={(e) => setBreedPremiumOverride(e.target.value)}
              placeholder={autoPremium !== null ? `Auto (${autoPremium}%)` : "Auto (none)"}
            />
          </div>

          {/* Breed premium info */}
          {breed && (
            <p className="flex items-start gap-2 text-xs text-text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{breedPremiumDescription(breed)}</span>
            </p>
          )}

          {/* Custom adjustment explanation */}
          {breed && (
            <p className="flex items-start gap-2 text-xs text-text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Override the default breed premium to reflect your local market,
                bloodline quality, or program status (in comparison to market average).
                Use a positive value for premium or negative for discount.
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Section 2: Herd Size                                               */}
      {/* ----------------------------------------------------------------- */}
      <Section show={showSection2}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Herd Size</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                id="head_count"
                label="Head Count"
                type="number"
                min={1}
                required
                value={headCount}
                onChange={(e) => setHeadCount(e.target.value)}
                placeholder="Number of head"
              />
              <Input
                id="age_months"
                label="Average Age (months)"
                type="number"
                min={0}
                value={ageMonths}
                onChange={(e) => setAgeMonths(e.target.value)}
                placeholder="Months"
              />
              <Input
                id="initial_weight"
                label="Average Weight (kg)"
                type="number"
                step="0.1"
                min={0}
                required
                value={initialWeight}
                onChange={(e) => setInitialWeight(e.target.value)}
                placeholder="Average weight"
              />
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Section 3: Growth & Mortality (input fields, all optional)          */}
      {/* ----------------------------------------------------------------- */}
      <Section show={showSection3}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Growth & Mortality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className={`grid grid-cols-1 gap-4 ${isBreeder ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {isBreeder && (
                <Input
                  id="calving_rate"
                  label="Calving Rate (optional)"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={calvingRate}
                  onChange={(e) => setCalvingRate(e.target.value)}
                  placeholder="50%"
                />
              )}
              <Input
                id="daily_weight_gain"
                label="Daily Weight Gain (optional)"
                type="number"
                min={0}
                max={3}
                step={0.1}
                value={dailyWeightGain}
                onChange={(e) => setDailyWeightGain(e.target.value)}
                placeholder="0 kg/day"
              />
              <Input
                id="mortality_rate"
                label="Mortality Rate (optional)"
                type="number"
                min={0}
                max={30}
                step={1}
                value={mortalityRate}
                onChange={(e) => setMortalityRate(e.target.value)}
                placeholder="0%"
              />
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Section 4: Calves at Foot (breeder only, checkbox gated)           */}
      {/* ----------------------------------------------------------------- */}
      <Section show={showSection4}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={calvesAtFoot}
                aria-label="Calves at Foot"
                onClick={() => {
                  setCalvesAtFoot(!calvesAtFoot);
                  if (calvesAtFoot) {
                    setCalvesHeadCount("");
                    setCalvesAgeMonths("");
                    setCalvesWeight("");
                  }
                }}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  calvesAtFoot
                    ? "border-brand bg-brand"
                    : "border-text-muted hover:border-text-secondary"
                }`}
              >
                {calvesAtFoot && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div>
                <CardTitle className="text-base">Calves at Foot</CardTitle>
                <p className="mt-1 text-sm text-text-secondary">
                  Record any calves currently with this herd.
                </p>
              </div>
            </div>
          </CardHeader>

          {calvesAtFoot && (
            <CardContent className="space-y-4 px-5 pb-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  id="calves_head"
                  label="Head Count"
                  type="number"
                  min={0}
                  required
                  value={calvesHeadCount}
                  onChange={(e) => setCalvesHeadCount(e.target.value)}
                  placeholder="Number of calves"
                />
                <Input
                  id="calves_age"
                  label="Avg Age (months)"
                  type="number"
                  min={0}
                  required
                  value={calvesAgeMonths}
                  onChange={(e) => setCalvesAgeMonths(e.target.value)}
                  placeholder="Months"
                />
                <Input
                  id="calves_weight"
                  label="Avg Weight (kg)"
                  type="number"
                  step="0.1"
                  min={0}
                  required
                  value={calvesWeight}
                  onChange={(e) => setCalvesWeight(e.target.value)}
                  placeholder="Weight in kg"
                />
              </div>

              <p className="flex items-start gap-2 text-xs text-text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Calving accrual commences at the midpoint of the joining period,
                  reaching 100% at calving (approximately 9 months).
                </span>
              </p>
            </CardContent>
          )}
        </Card>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Section 5: Breeding Details (breeder only, optional)               */}
      {/* ----------------------------------------------------------------- */}
      <Section show={showSection5}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breeding Details</CardTitle>
            <p className="mt-1 text-sm text-text-secondary">How is this herd bred?</p>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                id="breeding_program"
                label="Breeding Program (optional)"
                custom
                options={BREEDING_PROGRAM_OPTIONS}
                placeholder="Select program"
                value={breedingProgram}
                onChange={(e) => setBreedingProgram(e.target.value as BreedingProgram)}
              />
              <DatePicker
                id="joining_start"
                label={`${periodLabel} Start`}
                value={joiningStart}
                onChange={(v) => setJoiningStart(v)}
              />
              <DatePicker
                id="joining_end"
                label={`${periodLabel} End`}
                value={joiningEnd}
                onChange={(v) => setJoiningEnd(v)}
                min={joiningStart || undefined}
              />
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Section 6: Property (dropdown)                                     */}
      {/* ----------------------------------------------------------------- */}
      <Section show={showSection6}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Property</CardTitle>
            <p className="mt-1 text-sm text-text-secondary">Assign this herd to a property.</p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {properties.length === 0 ? (
              <p className="flex items-start gap-2 text-xs text-text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>No properties found. You can add a property later from the Properties page.</span>
              </p>
            ) : (
              <Select
                id="property"
                custom
                options={propertyOptions}
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              />
            )}
          </CardContent>
        </Card>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Section 7: Saleyard (dropdown, closest 3 at top)                   */}
      {/* ----------------------------------------------------------------- */}
      <Section show={showSection7}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saleyard</CardTitle>
            <p className="mt-1 text-sm text-text-secondary">Select the saleyard used for valuation.</p>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <Select
              id="saleyard"
              required
              custom
              options={saleyardData.flat}
              groups={saleyardData.groups}
              placeholder="Select saleyard"
              value={saleyard}
              onChange={(e) => setSaleyard(e.target.value)}
            />

            <p className="flex items-start gap-2 text-xs text-text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Your herd is valued using the selected saleyard. You can change this anytime.</span>
            </p>
          </CardContent>
        </Card>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Sticky save bar                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="sticky bottom-0 z-30 -mx-6 border-t border-border bg-background/80 backdrop-blur-xl lg:-mx-8">
        <div className="flex items-center justify-end px-6 py-3 lg:px-8">
          <Button type="button" size="md" disabled={!canSave} onClick={handleSave}>
            {submitting ? "Saving..." : "Save Herd"}
          </Button>
        </div>
      </div>
    </div>
  );
}
