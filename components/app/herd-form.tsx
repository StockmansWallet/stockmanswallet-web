"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  breedsForSpecies,
  categoriesForSpecies,
  saleyards,
} from "@/lib/data/reference-data";
import type { Database } from "@/lib/types/database";
import { Info, Scale, Heart, MapPin, FileText } from "lucide-react";

type HerdRow = Database["public"]["Tables"]["herd_groups"]["Row"];

const SPECIES_OPTIONS = [
  { value: "Cattle", label: "Cattle" },
  { value: "Sheep", label: "Sheep" },
  { value: "Pig", label: "Pig" },
  { value: "Goat", label: "Goat" },
];

const BREEDING_PROGRAM_OPTIONS = [
  { value: "", label: "None" },
  { value: "ai", label: "AI" },
  { value: "controlled", label: "Controlled" },
  { value: "uncontrolled", label: "Uncontrolled" },
];

const saleyardOptions = saleyards.map((s) => ({ value: s, label: s }));

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
}

export function HerdForm({ herd, properties, action }: HerdFormProps) {
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
              defaultValue={herd?.current_weight ?? herd?.initial_weight ?? 0}
              helperText="Leave same as initial if unknown"
            />
            <Input
              id="daily_weight_gain"
              name="daily_weight_gain"
              label="Daily Weight Gain (kg/day)"
              type="number"
              step="0.01"
              defaultValue={herd?.daily_weight_gain ?? 0}
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
              placeholder="Auto"
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
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all ring-1 ring-inset ring-white/10 focus:ring-brand/60 focus:bg-white/8"
          />
        </CardContent>
      </Card>

    </form>
  );
}
