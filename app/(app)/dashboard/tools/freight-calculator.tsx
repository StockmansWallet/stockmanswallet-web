"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateFreightEstimate, DEFAULT_RATE_PER_DECK_PER_KM } from "@/lib/engines/freight-engine";
import { categoriesForSpecies } from "@/lib/data/reference-data";
import type { FreightEstimate } from "@/lib/types/models";

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

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}

export function FreightCalculator() {
  const [species, setSpecies] = useState("Cattle");
  const [result, setResult] = useState<FreightEstimate | null>(null);

  const categoryOptions = categoriesForSpecies(species).map((c) => ({
    value: c,
    label: c,
  }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const estimate = calculateFreightEstimate({
      appCategory: fd.get("category") as string,
      sex: fd.get("sex") as string,
      averageWeightKg: Number(fd.get("weight")) || 0,
      headCount: Number(fd.get("head_count")) || 0,
      distanceKm: Number(fd.get("distance")) || 0,
      ratePerDeckPerKm: Number(fd.get("rate")) || DEFAULT_RATE_PER_DECK_PER_KM,
    });

    setResult(estimate);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            id="species"
            name="species"
            label="Species"
            options={SPECIES_OPTIONS}
            value={species}
            onChange={(e) => {
              setSpecies(e.target.value);
              setResult(null);
            }}
          />
          <Select
            id="category"
            name="category"
            label="Category"
            options={categoryOptions}
            placeholder="Select category"
          />
          <Select
            id="sex"
            name="sex"
            label="Sex"
            options={SEX_OPTIONS}
            defaultValue="Female"
          />
          <Input
            id="weight"
            name="weight"
            label="Avg Weight (kg)"
            type="number"
            step="0.1"
            min={0}
            required
            placeholder="e.g. 450"
          />
          <Input
            id="head_count"
            name="head_count"
            label="Head Count"
            type="number"
            min={1}
            required
            placeholder="e.g. 100"
          />
          <Input
            id="distance"
            name="distance"
            label="Distance (km)"
            type="number"
            min={0}
            required
            placeholder="e.g. 200"
          />
          <Input
            id="rate"
            name="rate"
            label="Rate ($/deck/km)"
            type="number"
            step="0.01"
            defaultValue={DEFAULT_RATE_PER_DECK_PER_KM}
          />
        </div>

        <Button type="submit">Calculate</Button>
      </form>

      {result && (
        <div className="mt-6">
          <Card className="border-brand/20 bg-brand/5">
            <CardContent className="p-5">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                Estimated Total
              </p>
              <p className="text-3xl font-bold text-brand">
                ${result.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
            <ResultRow label="Decks Required" value={`${result.decksRequired} deck${result.decksRequired !== 1 ? "s" : ""}`} />
            <ResultRow label="Heads per Deck" value={result.headsPerDeck.toString()} />
            <ResultRow label="Cost per Head" value={`$${result.costPerHead.toFixed(2)}`} />
            <ResultRow label="Cost per Deck" value={`$${result.costPerDeck.toFixed(2)}`} />
            <ResultRow label="Cost per km" value={`$${result.costPerKm.toFixed(2)}`} />
            <ResultRow
              label="Binding Constraint"
              value={result.bindingConstraint === "weight" ? "Weight" : "Head count"}
            />
            {result.hasPartialDeck && (
              <ResultRow
                label="Spare Spots"
                value={`${result.spareSpotsOnLastDeck} on last deck`}
              />
            )}
            {result.categoryWarning && (
              <div className="py-2 text-xs text-amber-600 dark:text-amber-400">
                {result.categoryWarning}
              </div>
            )}
            {result.breederAutoDetectNotice && (
              <div className="py-2 text-xs text-blue-600 dark:text-blue-400">
                {result.breederAutoDetectNotice}
              </div>
            )}
            {result.efficiencyPrompt && (
              <div className="py-2 text-xs text-success dark:text-success">
                {result.efficiencyPrompt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
