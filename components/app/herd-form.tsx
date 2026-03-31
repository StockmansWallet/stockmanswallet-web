"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  breedsForSpecies,
  saleyards,
  cattleBreedPremiums,
} from "@/lib/data/reference-data";
import {
  categoriesForSpecies,
  validateWeight,
  resolveMLACategory,
  type BreederSubType,
} from "@/lib/data/weight-mapping";
import type { Database } from "@/lib/types/database";
import { parseCalvesAtFoot } from "@/lib/engines/valuation-engine";
import { Info, Scale, Heart, MapPin, FileText, AlertTriangle, AlertCircle, Baby } from "lucide-react";

type HerdRow = Database["public"]["Tables"]["herds"]["Row"];

const SPECIES_OPTIONS = [
  { value: "Cattle", label: "Cattle" },
];

const BREEDING_PROGRAM_OPTIONS = [
  { value: "", label: "None" },
  { value: "ai", label: "AI" },
  { value: "controlled", label: "Controlled" },
  { value: "uncontrolled", label: "Uncontrolled" },
];

const BREEDER_SUB_TYPE_OPTIONS = [
  { value: "Cow", label: "Cow" },
  { value: "Heifer", label: "Heifer" },
];

const saleyardOptions = [
  { value: "National", label: "Use National Averages" },
  ...saleyards.map((s) => ({ value: s, label: s })),
];

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
      <Icon className="h-3.5 w-3.5 text-brand" />
    </div>
  );
}

interface HerdFormProps {
  herd?: HerdRow;
  properties: { id: string; property_name: string }[];
  action: (formData: FormData) => Promise<{ error: string } | void>;
  submitLabel?: string;
  cancelHref?: string;
}

export function HerdForm({ herd, properties, action, submitLabel = "Save", cancelHref }: HerdFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [species, setSpecies] = useState<string>(herd?.species ?? "Cattle");
  const [breed, setBreed] = useState<string>(herd?.breed ?? "");
  const [category, setCategory] = useState<string>(herd?.category ?? "");
  const [breederSubType, setBreederSubType] = useState<BreederSubType | "">((herd as Record<string, unknown>)?.breeder_sub_type as BreederSubType ?? "");
  const [isBreeder, setIsBreeder] = useState(herd?.is_breeder ?? false);
  const [breedingProgramType, setBreedingProgramType] = useState(herd?.breeding_program_type ?? "");
  const [joiningStart, setJoiningStart] = useState(herd?.joining_period_start ? herd.joining_period_start.split("T")[0] : "");
  const [joiningEnd, setJoiningEnd] = useState(herd?.joining_period_end ? herd.joining_period_end.split("T")[0] : "");
  const [currentWeight, setCurrentWeight] = useState<string>(String(herd?.current_weight ?? herd?.initial_weight ?? ""));

  // Calves at foot — parse existing data from additional_info
  const parsedCalves = useMemo(() => parseCalvesAtFoot(herd?.additional_info ?? null), [herd?.additional_info]);
  const [calvesHeadCount, setCalvesHeadCount] = useState(parsedCalves?.headCount?.toString() ?? "");
  const [calvesAgeMonths, setCalvesAgeMonths] = useState(parsedCalves?.ageMonths?.toString() ?? "");
  const [calvesWeight, setCalvesWeight] = useState(parsedCalves?.averageWeight?.toString() ?? "");

  const needsBreederSubType = category === "Breeder";

  // Weight validation
  const weightValidation = useMemo(() => {
    const w = Number(currentWeight);
    if (!category || !w) return null;
    return validateWeight(category, w);
  }, [category, currentWeight]);

  // Derived sub-category label
  const derivedSubCategory = useMemo(() => {
    const w = Number(currentWeight);
    if (!category || !w) return null;
    if (category === "Breeder" && !breederSubType) return null;
    const resolution = resolveMLACategory(category, w, breederSubType || undefined);
    return `${resolution.subCategory} ${category}`;
  }, [category, currentWeight, breederSubType]);

  // Serialize calves at foot into additional_info format (matches iOS)
  const serializedAdditionalInfo = useMemo(() => {
    // Preserve non-calves content from existing additional_info
    const existing = herd?.additional_info ?? "";
    const otherParts = existing
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("Calves at Foot:"));

    const count = Number(calvesHeadCount);
    const age = Number(calvesAgeMonths);
    if (count > 0 && age > 0) {
      let calvesInfo = `Calves at Foot: ${count} head, ${age} months`;
      if (calvesWeight && Number(calvesWeight) > 0) {
        calvesInfo += `, ${calvesWeight} kg`;
      }
      otherParts.push(calvesInfo);
    }

    return otherParts.length > 0 ? otherParts.join(" | ") : "";
  }, [calvesHeadCount, calvesAgeMonths, calvesWeight, herd?.additional_info]);

  // Track if calf weight changed (for DWG tracking)
  const calfWeightRecordedDate = useMemo(() => {
    const newWeight = Number(calvesWeight);
    if (!newWeight || newWeight <= 0) return null;
    const originalWeight = parsedCalves?.averageWeight;
    if (originalWeight == null || originalWeight !== newWeight) {
      return new Date().toISOString();
    }
    return (herd as Record<string, unknown>)?.calf_weight_recorded_date as string ?? null;
  }, [calvesWeight, parsedCalves?.averageWeight, herd]);

  const autoPremium = species === "Cattle" ? cattleBreedPremiums[breed] ?? null : null;

  const breedOptions = breedsForSpecies(species).map((b) => ({
    value: b,
    label: b,
  }));

  const categoryOptions = categoriesForSpecies(species).map((c) => ({
    value: c,
    label: c,
  }));

  const propertyOptions = properties.map((p) => ({
    value: p.id,
    label: p.property_name,
  }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await action(formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <form id="herd-form" onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={Info} />
            <CardTitle>Basic Info</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="name"
              name="name"
              label="Herd Name"
              required
              defaultValue={herd?.name ?? ""}
              placeholder="e.g. Springfield Angus Heifers"
            />
            <Input
              id="animal_id_number"
              name="animal_id_number"
              label="Animal ID / Tag"
              defaultValue={herd?.animal_id_number ?? ""}
              placeholder="e.g. NLIS tag number"
            />
            <Select
              id="species"
              name="species"
              label="Species"
              required
              options={SPECIES_OPTIONS}
              value={species}
              onChange={(e) => { setSpecies(e.target.value); setBreed(breedsForSpecies(e.target.value)[0] ?? ""); }}
            />
            <Select
              id="breed"
              name="breed"
              label="Breed"
              required
              options={breedOptions}
              placeholder="Select breed"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
            />
            <Select
              id="category"
              name="category"
              label="Category"
              required
              options={categoryOptions}
              placeholder="Select category"
              value={category}
              onChange={(e) => {
                const v = e.target.value;
                setCategory(v);
                setBreederSubType("");
                setIsBreeder(v === "Breeder" || v === "Dry Cow");
              }}
            />
            {needsBreederSubType && (
              <Select
                id="breeder_sub_type"
                name="breeder_sub_type"
                label="Breeder Type"
                required
                options={BREEDER_SUB_TYPE_OPTIONS}
                placeholder="Cow or Heifer?"
                value={breederSubType}
                onChange={(e) => setBreederSubType(e.target.value as BreederSubType)}
              />
            )}
            <Input
              id="head_count"
              name="head_count"
              label="Head Count"
              type="number"
              min={1}
              required
              defaultValue={herd?.head_count ?? 1}
            />
            <Input
              id="age_months"
              name="age_months"
              label="Age (months)"
              type="number"
              min={0}
              defaultValue={herd?.age_months ?? 0}
            />
          </div>
        </CardContent>
      </Card>

      {/* Physical Attributes - Weight & Growth */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={Scale} />
            <CardTitle>Weight & Growth</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="initial_weight"
              name="initial_weight"
              label="Initial Weight (kg)"
              type="number"
              step="0.1"
              min={0}
              defaultValue={herd?.initial_weight ?? 0}
            />
            <Input
              id="current_weight"
              name="current_weight"
              label="Current Weight (kg)"
              type="number"
              step="0.1"
              min={0}
              value={currentWeight}
              onChange={(e) => setCurrentWeight(e.target.value)}
              helperText="Leave same as initial if unknown"
            />
          </div>

          {/* Weight validation feedback */}
          {weightValidation && weightValidation.status === "error" && (
            <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-900/20 px-3 py-2 text-xs text-red-400 mt-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{weightValidation.message}</span>
            </div>
          )}
          {weightValidation && weightValidation.status === "warning" && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-800 bg-amber-900/20 px-3 py-2 text-xs text-amber-400 mt-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{weightValidation.message}</span>
            </div>
          )}

          {/* Derived sub-category label */}
          {derivedSubCategory && weightValidation?.status !== "error" && (
            <p className="flex items-center gap-2 text-xs text-text-muted mt-2">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>
                MLA category: <span className="font-medium text-text-primary">{derivedSubCategory}</span>
              </span>
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
            <Input
              id="daily_weight_gain"
              name="daily_weight_gain"
              label="Daily Weight Gain (kg/day)"
              type="number"
              step="0.01"
              defaultValue={herd?.daily_weight_gain ?? 0}
              placeholder="Annual average kg/day"
              helperText="Annual average, not seasonal"
            />
            <Input
              id="mortality_rate"
              name="mortality_rate"
              label="Mortality Rate (%)"
              type="number"
              step="0.1"
              min={0}
              max={100}
              defaultValue={herd?.mortality_rate != null ? herd.mortality_rate * 100 : 0}
            />
            <Input
              id="breed_premium_override"
              name="breed_premium_override"
              label="Breed Premium (%)"
              type="number"
              step="0.1"
              defaultValue={herd?.breed_premium_override ?? ""}
              placeholder={autoPremium !== null ? `Auto (${autoPremium}%)` : "Auto (none)"}
              helperText="Leave blank for automatic breed premium"
            />
          </div>
        </CardContent>
      </Card>

      {/* Breeding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={Heart} />
            <CardTitle>Breeding</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {isBreeder && (
            <div className="mb-4 flex items-center gap-6">
              <input type="hidden" name="is_breeder" value="on" />
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  name="is_pregnant"
                  defaultChecked={herd?.is_pregnant ?? false}
                  className="h-4 w-4 rounded border-black/20 text-brand accent-brand"
                />
                Pregnant
              </label>
            </div>
          )}
          {isBreeder && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id="breeding_program_type"
                name="breeding_program_type"
                label="Breeding Program"
                options={BREEDING_PROGRAM_OPTIONS}
                defaultValue={herd?.breeding_program_type ?? ""}
                onChange={(e) => setBreedingProgramType(e.target.value)}
              />
              <Input
                id="calving_rate"
                name="calving_rate"
                label="Calving Rate (%)"
                type="number"
                step="0.1"
                defaultValue={herd?.calving_rate != null ? Math.round(herd.calving_rate > 1 ? herd.calving_rate : herd.calving_rate * 100) : 85}
              />
              {(breedingProgramType === "ai" || breedingProgramType === "controlled") && (
                <>
                  <Input
                    id="joining_period_start"
                    name="joining_period_start"
                    label={breedingProgramType === "ai" ? "Insemination Started" : "Put Bulls In"}
                    type="date"
                    value={joiningStart}
                    onChange={(e) => setJoiningStart(e.target.value)}
                  />
                  <Input
                    id="joining_period_end"
                    name="joining_period_end"
                    label={breedingProgramType === "ai" ? "Insemination Complete" : "Pull Bulls Out"}
                    type="date"
                    value={joiningEnd}
                    onChange={(e) => setJoiningEnd(e.target.value)}
                  />
                  {/* Effective Joining Date: live-computed midpoint of period */}
                  {joiningStart && joiningEnd && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text-muted">Effective Joining Date</label>
                      <p className="rounded-lg border border-white/[0.06] bg-surface-secondary px-3 py-2 text-sm text-text-primary">
                        {new Date((new Date(joiningStart).getTime() + new Date(joiningEnd).getTime()) / 2).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  )}
                </>
              )}
              <Input
                id="lactation_status"
                name="lactation_status"
                label="Lactation Status"
                defaultValue={herd?.lactation_status ?? ""}
                placeholder="e.g. Wet, Dry"
              />
            </div>
          )}
          {isBreeder && (
            <>
              <div className="border-t border-white/[0.04] mt-4 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Baby className="h-4 w-4 text-brand" />
                  <span className="text-sm font-medium text-text-primary">Calves at Foot</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Input
                    id="calves_head_count"
                    label="Head Count"
                    type="number"
                    min={0}
                    value={calvesHeadCount}
                    onChange={(e) => setCalvesHeadCount(e.target.value)}
                    placeholder="Number of calves"
                  />
                  <Input
                    id="calves_age_months"
                    label="Avg Age (months)"
                    type="number"
                    min={0}
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
                    value={calvesWeight}
                    onChange={(e) => setCalvesWeight(e.target.value)}
                    placeholder="Weight in kg"
                  />
                </div>
                <p className="flex items-start gap-2 text-xs text-text-muted mt-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Record the calves currently with this breeder herd for accurate valuation.</span>
                </p>
              </div>
              {/* Hidden inputs for serialized calves at foot data */}
              <input type="hidden" name="additional_info" value={serializedAdditionalInfo} />
              {calfWeightRecordedDate && (
                <input type="hidden" name="calf_weight_recorded_date" value={calfWeightRecordedDate} />
              )}
            </>
          )}
          {/* Hidden input for derived sub_category */}
          {derivedSubCategory && <input type="hidden" name="sub_category" value={derivedSubCategory} />}
          {!isBreeder && (
            <p className="text-xs text-text-muted">
              Select Breeder or Dry Cow as the category to enable breeding fields.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Location & Market */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={MapPin} />
            <CardTitle>Location & Market</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {propertyOptions.length > 0 && (
              <Select
                id="property_id"
                name="property_id"
                label="Property"
                options={propertyOptions}
                placeholder="Select property"
                defaultValue={herd?.property_id ?? ""}
              />
            )}
            <Input
              id="paddock_name"
              name="paddock_name"
              label="Paddock"
              defaultValue={herd?.paddock_name ?? ""}
              placeholder="e.g. River Paddock"
            />
            <Select
              id="selected_saleyard"
              name="selected_saleyard"
              label="Saleyard"
              options={saleyardOptions}
              placeholder="Select saleyard"
              defaultValue={herd?.selected_saleyard ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={FileText} />
            <CardTitle>Notes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={herd?.notes ?? ""}
            placeholder="Any additional notes about this herd..."
            className="w-full rounded-xl bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all ring-1 ring-inset ring-ring-subtle focus:ring-brand/60 focus:bg-surface-raised"
          />
        </CardContent>
      </Card>

      {/* Sticky bottom action bar */}
      {(submitLabel || cancelHref) && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-6 py-3 lg:px-8">
            {cancelHref && (
              <Link href={cancelHref}>
                <Button type="button" variant="ghost" size="md">
                  Cancel
                </Button>
              </Link>
            )}
            <Button type="submit" form="herd-form" size="md" disabled={submitting}>
              {submitting ? "Saving..." : submitLabel}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
