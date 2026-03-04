"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  breedsForSpecies,
  categoriesForSpecies,
  saleyards,
} from "@/lib/data/reference-data";
import type { Database } from "@/lib/types/database";

type HerdRow = Database["public"]["Tables"]["herd_groups"]["Row"];

const SPECIES_OPTIONS = [
  { value: "Cattle", label: "Cattle" },
  { value: "Sheep", label: "Sheep" },
  { value: "Pig", label: "Pig" },
  { value: "Goat", label: "Goat" },
];

const SEX_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

const BREEDING_PROGRAM_OPTIONS = [
  { value: "", label: "None" },
  { value: "ai", label: "AI" },
  { value: "controlled", label: "Controlled" },
  { value: "uncontrolled", label: "Uncontrolled" },
];

const saleyardOptions = saleyards.map((s) => ({ value: s, label: s }));

interface HerdFormProps {
  herd?: HerdRow;
  properties: { id: string; property_name: string }[];
  action: (formData: FormData) => Promise<{ error: string } | void>;
  submitLabel: string;
}

export function HerdForm({ herd, properties, action, submitLabel }: HerdFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [species, setSpecies] = useState<string>(herd?.species ?? "Cattle");
  const [isBreeder, setIsBreeder] = useState(herd?.is_breeder ?? false);

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
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">
          Basic Info
        </h3>
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
            onChange={(e) => setSpecies(e.target.value)}
          />
          <Select
            id="breed"
            name="breed"
            label="Breed"
            required
            options={breedOptions}
            placeholder="Select breed"
            defaultValue={herd?.breed ?? ""}
          />
          <Select
            id="sex"
            name="sex"
            label="Sex"
            required
            options={SEX_OPTIONS}
            defaultValue={herd?.sex ?? "Female"}
          />
          <Select
            id="category"
            name="category"
            label="Category"
            required
            options={categoryOptions}
            placeholder="Select category"
            defaultValue={herd?.category ?? ""}
          />
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
      </section>

      {/* Weight */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">
          Weight & Growth
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            defaultValue={herd?.current_weight ?? 0}
          />
          <Input
            id="daily_weight_gain"
            name="daily_weight_gain"
            label="Daily Weight Gain (kg)"
            type="number"
            step="0.01"
            defaultValue={herd?.daily_weight_gain ?? 0}
            helperText="DWG in kg/day"
          />
        </div>
      </section>

      {/* Breeding */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">
          Breeding
        </h3>
        <div className="mb-4 flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              name="is_breeder"
              checked={isBreeder}
              onChange={(e) => setIsBreeder(e.target.checked)}
              className="h-4 w-4 rounded border-black/20 text-brand accent-brand"
            />
            Breeder
          </label>
          {isBreeder && (
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                name="is_pregnant"
                defaultChecked={herd?.is_pregnant ?? false}
                className="h-4 w-4 rounded border-black/20 text-brand accent-brand"
              />
              Pregnant
            </label>
          )}
        </div>
        {isBreeder && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="joined_date"
              name="joined_date"
              label="Joined Date"
              type="date"
              defaultValue={herd?.joined_date ?? ""}
            />
            <Input
              id="calving_rate"
              name="calving_rate"
              label="Calving/Lambing Rate (%)"
              type="number"
              step="0.1"
              defaultValue={herd?.calving_rate ?? 85}
            />
            <Input
              id="lactation_status"
              name="lactation_status"
              label="Lactation Status"
              defaultValue={herd?.lactation_status ?? ""}
              placeholder="e.g. Wet, Dry"
            />
            <Select
              id="breeding_program_type"
              name="breeding_program_type"
              label="Breeding Program"
              options={BREEDING_PROGRAM_OPTIONS}
              defaultValue={herd?.breeding_program_type ?? ""}
            />
          </div>
        )}
      </section>

      {/* Location & Market */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">
          Location & Market
        </h3>
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
          <Input
            id="market_category"
            name="market_category"
            label="Market Category"
            defaultValue={herd?.market_category ?? ""}
            placeholder="e.g. Vealer, Trade Steer"
          />
        </div>
      </section>

      {/* Notes */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Notes</h3>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={herd?.notes ?? ""}
          placeholder="Any additional notes about this herd..."
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5"
        />
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
