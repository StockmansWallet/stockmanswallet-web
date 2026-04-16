"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Info } from "lucide-react";
import {
  breedsForSpecies,
  cattleBreedPremiums,
  breedPremiumDescription,
  saleyards,
  saleyardToState,
  saleyardCoordinates,
} from "@/lib/data/reference-data";
import {
  categoriesForSpecies,
  validateWeight,
  resolveMLACategory,
  type BreederSubType,
} from "@/lib/data/weight-mapping";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { scrollToFirstError } from "@/lib/validation/scroll-to-first-error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BREEDER_CATEGORIES = new Set(["Breeder"]);

function isBreederCategory(category: string): boolean {
  return BREEDER_CATEGORIES.has(category);
}

const BREEDER_SUB_TYPE_OPTIONS = [
  { value: "Cow", label: "Cow" },
  { value: "Heifer", label: "Heifer" },
];

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
  const [breedPremiumJustification, setBreedPremiumJustification] = useState("");

  // Section 1 - Breeder sub-type and breed premium confirmation
  const [breederSubType, setBreederSubType] = useState<BreederSubType | "">("");
  const [breedPremiumConfirmed, setBreedPremiumConfirmed] = useState(false);

  // Section 2 - Herd Size
  const [headCount, setHeadCount] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [initialWeight, setInitialWeight] = useState("");

  // Section 3 - Growth & Mortality
  const [calvingRate, setCalvingRate] = useState("");
  const [dailyWeightGain, setDailyWeightGain] = useState("");
  const [mortalityRate, setMortalityRate] = useState("");

  // Section 4 - Calves at Foot (breeder only, yes/no gate)
  const [calvesAtFootAnswer, setCalvesAtFootAnswer] = useState<"" | "yes" | "no">("");
  const [calvesHeadCount, setCalvesHeadCount] = useState("");
  const [calvesAgeMonths, setCalvesAgeMonths] = useState("");
  const [calvesWeight, setCalvesWeight] = useState("");

  // Section 5 - Breeding Details (breeder only, yes/no gate)
  const [breedingDetailsAnswer, setBreedingDetailsAnswer] = useState<"" | "yes" | "no">("");
  const [breedingProgram, setBreedingProgram] = useState<BreedingProgram>("");
  const [joiningStart, setJoiningStart] = useState("");
  const [joiningEnd, setJoiningEnd] = useState("");

  // Section 6 - Property (dropdown, default = is_default or first)
  const defaultProperty = properties.find((p) => p.is_default) ?? properties[0];
  const [propertyId, setPropertyId] = useState(defaultProperty?.id ?? "");

  // Section 7 - Saleyard (dropdown)
  const [saleyard, setSaleyard] = useState("");

  // Inline validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sectionAttempted, setSectionAttempted] = useState<Record<string, boolean>>({});

  // Derived
  const isBreeder = isBreederCategory(category);
  const needsBreederSubType = category === "Breeder";

  // Weight validation
  const weightValidation = useMemo(() => {
    const w = Number(initialWeight);
    if (!category || !w) return null;
    return validateWeight(category, w);
  }, [category, initialWeight]);

  // Derived sub-category label (e.g. "Weaner Steer", "Yearling Heifer")
  const derivedSubCategory = useMemo(() => {
    const w = Number(initialWeight);
    if (!category || !w) return null;
    if (category === "Breeder" && !breederSubType) return null;
    const resolution = resolveMLACategory(category, w, breederSubType || undefined);
    return resolution.subCategory;
  }, [category, initialWeight, breederSubType]);

  const breedOptions = useMemo(
    () => breedsForSpecies(species).map((b) => ({ value: b, label: b })),
    [species],
  );
  const categoryOptions = useMemo(
    () => categoriesForSpecies(species).map((c) => ({ value: c, label: c })),
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
  const section1Done = name.trim().length > 0 && species !== "" && breed !== "" && category !== "" && breedPremiumConfirmed && (!needsBreederSubType || breederSubType !== "") && (!breedPremiumOverride || breedPremiumJustification.trim().length > 0);
  const section2Done = Number(headCount) > 0 && ageMonths !== "" && Number(initialWeight) > 0;
  const section3Done = dailyWeightGain !== "" && mortalityRate !== "" && (!isBreeder || calvingRate !== "");
  // Calves at Foot: if yes, detail fields must be filled before advancing
  const calvesDetailsDone = calvesHeadCount !== "" && calvesAgeMonths !== "" && calvesWeight !== "";
  const section4FullyDone = calvesAtFootAnswer === "no" || (calvesAtFootAnswer === "yes" && calvesDetailsDone);

  // Progressive reveal - each section waits for the previous to be confirmed
  const showSection2 = section1Done;
  const showSection3 = showSection2 && section2Done;
  const showSection4 = showSection3 && section3Done && isBreeder; // Calves at Foot question
  const showSection4b = showSection4 && calvesAtFootAnswer === "yes"; // Calves detail fields
  const showSection5 = showSection4 && section4FullyDone; // Breeding question
  const showSection5b = showSection5 && breedingDetailsAnswer === "yes"; // Breeding detail fields
  const showSection6 = isBreeder
    ? showSection5 && (breedingDetailsAnswer === "no" || breedingDetailsAnswer === "yes")
    : showSection3 && section3Done;
  const showSection7 = showSection6;

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  // Validation returns a truthy string per invalid field. We use a single
  // space so the Input/Select error prop triggers the red border without
  // rendering visible per-field text. The section-level message is enough.
  const ERR = " ";

  function validateAddForm(): Record<string, string> {
    const errors: Record<string, string> = {};

    // Section 1
    if (!name.trim()) errors.name = ERR;
    if (!category) errors.category = ERR;
    if (!breed) errors.breed = ERR;
    if (needsBreederSubType && !breederSubType) errors.breederSubType = ERR;
    if (!breedPremiumConfirmed) errors.breedPremiumConfirmed = ERR;
    if (breedPremiumOverride && !breedPremiumJustification.trim()) {
      errors.breedPremiumJustification = ERR;
    }

    // Section 2
    if (!headCount || Number(headCount) < 1) errors.headCount = ERR;
    if (!ageMonths) errors.ageMonths = ERR;
    if (!initialWeight || Number(initialWeight) <= 0) errors.initialWeight = ERR;

    // Section 3
    if (!dailyWeightGain) errors.dailyWeightGain = ERR;
    if (!mortalityRate) errors.mortalityRate = ERR;
    if (isBreeder && !calvingRate) errors.calvingRate = ERR;

    // Section 4 (breeder only)
    if (isBreeder && showSection4 && !calvesAtFootAnswer) errors.calvesAtFootAnswer = ERR;
    if (calvesAtFootAnswer === "yes") {
      if (!calvesHeadCount) errors.calvesHeadCount = ERR;
      if (!calvesAgeMonths) errors.calvesAgeMonths = ERR;
      if (!calvesWeight) errors.calvesWeight = ERR;
    }

    // Section 7
    if (!saleyard) errors.saleyard = ERR;

    return errors;
  }

  // Show error only if the field's section has been attempted
  function showError(section: string, fieldKey: string): string | undefined {
    return sectionAttempted[section] ? fieldErrors[fieldKey] : undefined;
  }

  // Suppress hint (orange glow) when section is attempted (red errors take over)
  function showHint(section: string, isEmpty: boolean): boolean {
    return isEmpty && !sectionAttempted[section];
  }

  // Mark section 1 as attempted when user has started filling but it's incomplete
  const section1Started = !!(name.trim() || breed || category);
  useEffect(() => {
    if (section1Started && !section1Done && !sectionAttempted["1"]) {
      // Small delay so hints show first on initial interaction
      const timer = setTimeout(() => {
        if (!section1Done) {
          setSectionAttempted((prev) => ({ ...prev, "1": true }));
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [section1Started, section1Done, sectionAttempted]);

  // Mark sections 2+ as attempted when they become visible
  useEffect(() => {
    if (showSection2 && !sectionAttempted["2"]) setSectionAttempted((prev) => ({ ...prev, "2": true }));
  }, [showSection2, sectionAttempted]);
  useEffect(() => {
    if (showSection3 && !sectionAttempted["3"]) setSectionAttempted((prev) => ({ ...prev, "3": true }));
  }, [showSection3, sectionAttempted]);
  useEffect(() => {
    if (showSection4 && !sectionAttempted["4"]) setSectionAttempted((prev) => ({ ...prev, "4": true }));
  }, [showSection4, sectionAttempted]);
  useEffect(() => {
    if (showSection4b && !sectionAttempted["4b"]) setSectionAttempted((prev) => ({ ...prev, "4b": true }));
  }, [showSection4b, sectionAttempted]);
  useEffect(() => {
    if (showSection7 && !sectionAttempted["7"]) setSectionAttempted((prev) => ({ ...prev, "7": true }));
  }, [showSection7, sectionAttempted]);

  // Reactively clear errors as the user corrects fields
  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) return;
    const current = validateAddForm();
    setFieldErrors((prev) => {
      const next: Record<string, string> = {};
      for (const key of Object.keys(prev)) {
        if (current[key]) next[key] = current[key];
      }
      // Only update if something actually changed
      if (Object.keys(next).length === Object.keys(prev).length) {
        const same = Object.keys(next).every((k) => next[k] === prev[k]);
        if (same) return prev;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, category, breed, breederSubType, breedPremiumConfirmed, breedPremiumJustification,
      breedPremiumOverride, headCount, ageMonths, initialWeight, dailyWeightGain, mortalityRate,
      calvingRate, calvesAtFootAnswer, calvesHeadCount, calvesAgeMonths, calvesWeight, saleyard]);

  // Handlers
  function handleSpeciesChange(newSpecies: string) {
    setSpecies(newSpecies);
    setBreed(breedsForSpecies(newSpecies)[0] ?? "");
    setCategory("");
    setBreedPremiumOverride("");
    setBreedPremiumConfirmed(false);
  }

  function handleCategoryChange(v: string) {
    setCategory(v);
    setBreederSubType("");
    if (!isBreederCategory(v)) {
      setBreedingProgram("");
      setJoiningStart("");
      setJoiningEnd("");
      setCalvesAtFootAnswer("");
      setCalvesHeadCount("");
      setCalvesAgeMonths("");
      setCalvesWeight("");
      setBreedingDetailsAnswer("");
    }
  }

  async function handleSave() {
    setError(null);

    // Mark all visible sections as attempted
    const attempted: Record<string, boolean> = { "1": true };
    if (showSection2) attempted["2"] = true;
    if (showSection3) attempted["3"] = true;
    if (showSection4) attempted["4"] = true;
    if (showSection4b) attempted["4b"] = true;
    if (showSection7) attempted["7"] = true;
    setSectionAttempted(attempted);

    // Validate
    const errors = validateAddForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      requestAnimationFrame(() => scrollToFirstError());
      return;
    }

    setFieldErrors({});
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
    if (breedPremiumOverride) {
      formData.set("breed_premium_override", breedPremiumOverride);
      if (breedPremiumJustification.trim()) formData.set("breed_premium_justification", breedPremiumJustification.trim());
    }
    if (breederSubType) formData.set("breeder_sub_type", breederSubType);
    if (derivedSubCategory) formData.set("sub_category", derivedSubCategory);

    if (isBreeder) {
      formData.set("is_breeder", "on");
      if (breedingProgram) formData.set("breeding_program_type", breedingProgram);
      formData.set("calving_rate", calvingRate || "50");
      if (joiningStart) formData.set("joining_period_start", joiningStart);
      if (joiningEnd) formData.set("joining_period_end", joiningEnd);

      if (calvesAtFootAnswer === "yes" && (calvesHeadCount || calvesAgeMonths || calvesWeight)) {
        const parts = [];
        if (calvesHeadCount) parts.push(`Calves at Foot: ${calvesHeadCount} head`);
        if (calvesAgeMonths) parts.push(`${calvesAgeMonths} months`);
        if (calvesWeight) parts.push(`${calvesWeight} kg`);
        formData.set("additional_info", parts.join(", "));
        if (calvesWeight && Number(calvesWeight) > 0) {
          formData.set("calf_weight_recorded_date", new Date().toISOString());
        }
      }
    }

    const result = await action(formData);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  const periodStartLabel = breedingProgram === "ai" ? "Insemination Started" : "Put Bulls In";
  const periodEndLabel = breedingProgram === "ai" ? "Insemination Complete" : "Pull Bulls Out";

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
              hint={showHint("1", !name.trim())}
              error={showError("1", "name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Breeders, Steers, Heifers"
              autoFocus
            />
            <Select
              id="category"
              label="Category"
              required
              hint={showHint("1", !category)}
              error={showError("1", "category")}
              options={categoryOptions}
              placeholder="Select category"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            />
          </div>

          {/* Breeder sub-type: Cow or Heifer */}
          {needsBreederSubType && (
            <Select
              id="breeder_sub_type"
              label="Breeder Type"
              required
              hint={showHint("1", !breederSubType)}
              error={showError("1", "breederSubType")}
              options={BREEDER_SUB_TYPE_OPTIONS}
              placeholder="Cow or Heifer?"
              value={breederSubType}
              onChange={(e) => setBreederSubType(e.target.value as BreederSubType)}
            />
          )}

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
              hint={showHint("1", !breed)}
              error={showError("1", "breed")}
              custom
              options={breedOptions}
              placeholder="Select breed"
              value={breed}
              onChange={(e) => { setBreed(e.target.value); setBreedPremiumConfirmed(false); }}
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
              step="1"
              value={breedPremiumOverride}
              onChange={(e) => { setBreedPremiumOverride(e.target.value); setBreedPremiumConfirmed(false); }}
              placeholder={autoPremium !== null ? `Default for ${breed} is ${autoPremium}%` : "No default premium"}
              nudgeDefault={autoPremium ?? 0}
            />
          </div>

          {/* Breed premium justification - only shown when custom premium is set */}
          {breedPremiumOverride && (
            <Textarea
              id="breed_premium_justification"
              label="Custom Breed Premium Justification"
              required
              value={breedPremiumJustification}
              onChange={(e) => setBreedPremiumJustification(e.target.value)}
              error={showError("1", "breedPremiumJustification")}
              placeholder="e.g. High quality Brahman herd with PCAS certification"
              rows={2}
              helperText="Required. Explains why a custom premium is applied."
            />
          )}

          {/* Breed premium footer: divider, info left, confirm right */}
          {breed && (
            <>
              <div className="border-t border-border" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Info text - left side */}
                <div className="flex items-start gap-2 text-xs text-text-muted sm:max-w-[60%]">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {(() => {
                      const desc = breedPremiumDescription(breed);
                      const dotIdx = desc.indexOf(".");
                      if (dotIdx === -1) return desc;
                      const first = desc.slice(0, dotIdx + 1);
                      const rest = desc.slice(dotIdx + 1).trim();
                      return (
                        <>
                          <span className="text-amber-400">{first}</span>
                          {rest && <> {rest}</>}
                        </>
                      );
                    })()}
                    <br />
                    Override the default to reflect your local market,
                    bloodline quality, or program status. Use a positive value
                    for premium or negative for discount.
                  </span>
                </div>

                {/* Confirm checkbox - right side */}
                <div>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={breedPremiumConfirmed}
                    aria-label="Confirm breed premium"
                    onClick={() => setBreedPremiumConfirmed(!breedPremiumConfirmed)}
                    className={`flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-surface-secondary/80 ${
                      breedPremiumConfirmed
                        ? "border-border bg-surface-secondary"
                        : showError("1", "breedPremiumConfirmed")
                          ? "border-red-500/60 ring-1 ring-inset ring-red-500/60 bg-surface-secondary"
                          : "border-brand/40 shadow-[0_0_8px_#FF800040] bg-surface-secondary"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        breedPremiumConfirmed
                          ? "border-brand bg-brand"
                          : "border-text-muted"
                      }`}
                    >
                      {breedPremiumConfirmed && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-text-primary">
                      Confirm{" "}
                      {autoPremium !== null && !breedPremiumOverride && (
                        <span className="text-amber-400">{autoPremium > 0 ? "+" : ""}{autoPremium}%</span>
                      )}
                      {breedPremiumOverride && (
                        <span className="text-amber-400">{Number(breedPremiumOverride) > 0 ? "+" : ""}{breedPremiumOverride}%</span>
                      )}
                      {" "}breed premium
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Section incomplete message */}
          {sectionAttempted["1"] && !section1Done && (
            <p className="mt-2 flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Complete the required fields above to continue.
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
                hint={showHint("2", !headCount)}
                error={showError("2", "headCount")}
                value={headCount}
                onChange={(e) => setHeadCount(e.target.value)}
                placeholder="Number of head"
              />
              <Input
                id="age_months"
                label="Average Age (months)"
                type="number"
                min={0}
                required
                hint={showHint("2", !ageMonths)}
                error={showError("2", "ageMonths")}
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
                hint={showHint("2", !initialWeight)}
                error={showError("2", "initialWeight")}
                value={initialWeight}
                onChange={(e) => setInitialWeight(e.target.value)}
                placeholder="Average weight"
              />
            </div>

            {/* Weight validation feedback */}
            {weightValidation && weightValidation.status === "error" && (
              <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-900/20 px-3 py-2 text-xs text-red-400">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{weightValidation.message}</span>
              </div>
            )}
            {weightValidation && weightValidation.status === "warning" && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-800 bg-amber-900/20 px-3 py-2 text-xs text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{weightValidation.message}</span>
              </div>
            )}

            {/* Derived sub-category label */}
            {derivedSubCategory && weightValidation?.status !== "error" && (
              <p className="flex items-center gap-2 text-xs text-text-muted">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                  MLA category: <span className="font-medium text-text-primary">{derivedSubCategory}</span>
                </span>
              </p>
            )}

            {/* Section incomplete message */}
            {sectionAttempted["2"] && !section2Done && (
              <p className="mt-2 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Complete the required fields above to continue.
              </p>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Section 3: Growth & Mortality                                       */}
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
                  label="Calving Rate (%)"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  required
                  hint={showHint("3", !calvingRate)}
                  error={showError("3", "calvingRate")}
                  value={calvingRate}
                  onChange={(e) => setCalvingRate(e.target.value)}
                  placeholder="%"
                />
              )}
              <Input
                id="daily_weight_gain"
                label="Daily Weight Gain (kg/day)"
                type="number"
                min={0}
                max={3}
                step={0.1}
                required
                hint={showHint("3", !dailyWeightGain)}
                error={showError("3", "dailyWeightGain")}
                value={dailyWeightGain}
                onChange={(e) => setDailyWeightGain(e.target.value)}
                placeholder="Annual average kg/day"
                helperText={!showError("3", "dailyWeightGain") ? "Annual average, not seasonal" : undefined}
              />
              <Input
                id="mortality_rate"
                label="Mortality Rate (%)"
                type="number"
                min={0}
                max={30}
                step={1}
                value={mortalityRate}
                required
                hint={showHint("3", !mortalityRate)}
                error={showError("3", "mortalityRate")}
                onChange={(e) => setMortalityRate(e.target.value)}
                placeholder="%"
              />
            </div>

            {/* Section incomplete message */}
            {sectionAttempted["3"] && !section3Done && (
              <p className="mt-2 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Complete the required fields above to continue.
              </p>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Section 4: Calves at Foot question (breeder only)                  */}
      {/* ----------------------------------------------------------------- */}
      <Section show={showSection4}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calves at Foot</CardTitle>
            <p className="mt-1 text-sm text-text-secondary">
              Does this herd have any calves at foot?
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setCalvesAtFootAnswer(opt);
                    if (opt === "no") {
                      setCalvesHeadCount("");
                      setCalvesAgeMonths("");
                      setCalvesWeight("");
                    }
                  }}
                  className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                    calvesAtFootAnswer === opt
                      ? "bg-brand text-white"
                      : "bg-surface-secondary text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {opt === "yes" ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Section 4b: Calves at Foot detail fields */}
      <Section show={showSection4b}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calf Details</CardTitle>
            <p className="mt-1 text-sm text-text-secondary">
              Record the calves currently with this herd.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                id="calves_head"
                label="Head Count"
                type="number"
                min={0}
                required
                hint={showHint("4b", !calvesHeadCount)}
                error={showError("4b", "calvesHeadCount")}
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
                hint={showHint("4b", !calvesAgeMonths)}
                error={showError("4b", "calvesAgeMonths")}
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
                hint={showHint("4b", !calvesWeight)}
                error={showError("4b", "calvesWeight")}
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

            {/* Section incomplete message */}
            {sectionAttempted["4b"] && !calvesDetailsDone && (
              <p className="mt-2 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Complete the required fields above to continue.
              </p>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Section 5: Breeding Details question (breeder only)                */}
      {/* ----------------------------------------------------------------- */}
      <Section show={showSection5}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breeding Details</CardTitle>
            <p className="mt-1 text-sm text-text-secondary">
              Do you want to add breeding details?
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setBreedingDetailsAnswer(opt);
                    if (opt === "no") {
                      setBreedingProgram("");
                      setJoiningStart("");
                      setJoiningEnd("");
                    }
                  }}
                  className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                    breedingDetailsAnswer === opt
                      ? "bg-brand text-white"
                      : "bg-surface-secondary text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {opt === "yes" ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Section 5b: Breeding detail fields */}
      <Section show={showSection5b}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breeding Program</CardTitle>
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
              {breedingProgram && breedingProgram !== "uncontrolled" && (
                <>
                  <DatePicker
                    id="joining_start"
                    label={periodStartLabel}
                    value={joiningStart}
                    onChange={(v) => setJoiningStart(v)}
                  />
                  <DatePicker
                    id="joining_end"
                    label={periodEndLabel}
                    value={joiningEnd}
                    onChange={(v) => setJoiningEnd(v)}
                    min={joiningStart || undefined}
                  />
                </>
              )}
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
              hint={showHint("7", !saleyard)}
              error={showError("7", "saleyard")}
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
      <div className="sticky bottom-0 z-30 -mx-6 bg-background/80 backdrop-blur-xl lg:-mx-8">
        <div className="flex items-center justify-end px-6 py-3 lg:px-8">
          <Button type="button" size="md" disabled={submitting} onClick={handleSave}>
            {submitting ? "Saving..." : "Save Herd"}
          </Button>
        </div>
      </div>
    </div>
  );
}
