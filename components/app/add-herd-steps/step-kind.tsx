"use client";

import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  breedsForSpecies,
  categoriesForSpecies,
  cattleBreedPremiums,
  cattleCategoryGroups,
  breedPremiumDescription,
} from "@/lib/data/reference-data";

const SPECIES_OPTIONS = [
  { value: "Cattle", label: "Cattle" },
  { value: "Sheep", label: "Sheep" },
  { value: "Pig", label: "Pig" },
  { value: "Goat", label: "Goat" },
];

interface StepKindProps {
  species: string;
  breed: string;
  category: string;
  breedPremiumOverride: string;
  onSpeciesChange: (v: string) => void;
  onBreedChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onBreedPremiumChange: (v: string) => void;
}

export function StepKind({
  species, breed, category, breedPremiumOverride,
  onSpeciesChange, onBreedChange, onCategoryChange, onBreedPremiumChange,
}: StepKindProps) {
  const breedOptions = breedsForSpecies(species).map((b) => ({ value: b, label: b }));
  const autoPremium = species === "Cattle" ? cattleBreedPremiums[breed] ?? null : null;

  // Build category options - grouped for cattle, flat for others
  const categoryOptions = species === "Cattle"
    ? cattleCategoryGroups.flatMap((g) => g.options).map((c) => ({ value: c, label: c }))
    : categoriesForSpecies(species).map((c) => ({ value: c, label: c }));

  function handleSpeciesChange(newSpecies: string) {
    onSpeciesChange(newSpecies);
    onBreedChange(breedsForSpecies(newSpecies)[0] ?? "");
    onCategoryChange("");
    onBreedPremiumChange("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Livestock Type</h2>
        <p className="mt-1 text-sm text-text-secondary">Select the species, breed, and category.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          id="species"
          label="Species"
          required
          options={SPECIES_OPTIONS}
          value={species}
          onChange={(e) => handleSpeciesChange(e.target.value)}
        />
        <Select
          id="breed"
          label="Breed"
          required
          options={breedOptions}
          placeholder="Select breed"
          value={breed}
          onChange={(e) => onBreedChange(e.target.value)}
        />
      </div>

      <Select
        id="category"
        label="Category"
        required
        options={categoryOptions}
        placeholder="Select category"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
      />

      {/* Breed Premium */}
      {breed && (
        <div className="rounded-xl bg-surface-lowest p-4 space-y-3">
          <p className="text-sm text-text-secondary">{breedPremiumDescription(breed)}</p>
          <Input
            id="breed_premium_override"
            label="Custom Breed Premium (%)"
            type="number"
            step="0.1"
            value={breedPremiumOverride}
            onChange={(e) => onBreedPremiumChange(e.target.value)}
            placeholder={autoPremium !== null ? `Auto (${autoPremium}%)` : "Auto (none)"}
            helperText="Leave blank to use the automatic breed premium"
          />
        </div>
      )}
    </div>
  );
}
