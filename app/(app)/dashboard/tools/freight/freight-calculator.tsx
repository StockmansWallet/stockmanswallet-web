"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { calculateFreightEstimate, DEFAULT_RATE_PER_DECK_PER_KM } from "@/lib/engines/freight-engine";
import { freightCategoryLibrary, headsPerDeckForWeight } from "@/lib/data/freight-categories";
import { categoriesForSpecies, saleyards, saleyardLocality } from "@/lib/data/reference-data";
import type { FreightEstimate, FreightCapacityCategory } from "@/lib/types/models";
import {
  MapPin,
  Scale,
  Truck,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";

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

const saleyardOptions = saleyards.map((s) => ({
  value: s,
  label: saleyardLocality[s]
    ? `${saleyardLocality[s].split(",")[0].trim()} - ${s}`
    : s,
}));

const categoryOverrideOptions = [
  { value: "", label: "Auto (recommended)" },
  ...freightCategoryLibrary.map((c) => ({
    value: c.id,
    label: `${c.displayName} (${c.headsPerDeck} hd/deck)`,
  })),
];

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
      <Icon className="h-3.5 w-3.5 text-brand" />
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-inset ring-white/[0.06]">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
    </div>
  );
}

function AlertCard({
  type,
  message,
}: {
  type: "warning" | "info" | "success";
  message: string;
}) {
  const styles = {
    warning: {
      bg: "bg-amber-500/10 ring-amber-500/20",
      icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    },
    info: {
      bg: "bg-blue-500/10 ring-blue-500/20",
      icon: <Info className="h-4 w-4 text-blue-400" />,
    },
    success: {
      bg: "bg-emerald-500/10 ring-emerald-500/20",
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    },
  };

  const s = styles[type];

  return (
    <div className={`flex items-start gap-3 rounded-xl p-4 ring-1 ring-inset ${s.bg}`}>
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <p className="text-sm leading-relaxed text-text-secondary">{message}</p>
    </div>
  );
}

export function FreightCalculator() {
  const [species, setSpecies] = useState("Cattle");
  const [sex, setSex] = useState("Female");
  const [weight, setWeight] = useState("");
  const [headCount, setHeadCount] = useState("");
  const [distance, setDistance] = useState("");
  const [rate, setRate] = useState(DEFAULT_RATE_PER_DECK_PER_KM.toString());
  const [category, setCategory] = useState("Breeder Cow");
  const [categoryOverrideId, setCategoryOverrideId] = useState("");
  const [result, setResult] = useState<FreightEstimate | null>(null);

  const categoryOptions = categoriesForSpecies(species).map((c) => ({
    value: c,
    label: c,
  }));

  // Live heads-per-deck preview based on weight
  const previewHpd = useMemo(() => {
    const w = Number(weight);
    if (!w || w <= 0) return null;
    if (categoryOverrideId) {
      const cat = freightCategoryLibrary.find((c) => c.id === categoryOverrideId);
      return cat?.headsPerDeck ?? null;
    }
    return headsPerDeckForWeight(w);
  }, [weight, categoryOverrideId]);

  function handleCalculate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const override: FreightCapacityCategory | undefined = categoryOverrideId
      ? freightCategoryLibrary.find((c) => c.id === categoryOverrideId)
      : undefined;

    const estimate = calculateFreightEstimate({
      appCategory: category,
      sex,
      averageWeightKg: Number(weight) || 0,
      headCount: Number(headCount) || 0,
      distanceKm: Number(distance) || 0,
      ratePerDeckPerKm: Number(rate) || DEFAULT_RATE_PER_DECK_PER_KM,
      categoryOverride: override,
    });

    setResult(estimate);
  }

  function handleReset() {
    setWeight("");
    setHeadCount("");
    setDistance("");
    setRate(DEFAULT_RATE_PER_DECK_PER_KM.toString());
    setCategoryOverrideId("");
    setResult(null);
  }

  return (
    <div>
      <form onSubmit={handleCalculate} className="space-y-4">
        {/* Herd Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Scale} />
              <CardTitle>Herd Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                id="species"
                name="species"
                label="Species"
                options={SPECIES_OPTIONS}
                value={species}
                onChange={(e) => {
                  setSpecies(e.target.value);
                  setResult(null);
                  const cats = categoriesForSpecies(e.target.value);
                  setCategory(cats[0] ?? "");
                }}
              />
              <Select
                id="category"
                name="category"
                label="Category"
                options={categoryOptions}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <Select
                id="sex"
                name="sex"
                label="Sex"
                options={SEX_OPTIONS}
                value={sex}
                onChange={(e) => setSex(e.target.value)}
              />
              <Input
                id="weight"
                name="weight"
                label="Avg Weight (kg)"
                type="number"
                step="0.1"
                min={0}
                required
                value={weight}
                onChange={(e) => { setWeight(e.target.value); setResult(null); }}
                placeholder="e.g. 450"
                helperText={previewHpd ? `${previewHpd} head/deck at this weight` : undefined}
              />
              <Input
                id="head_count"
                name="head_count"
                label="Head Count"
                type="number"
                min={1}
                required
                value={headCount}
                onChange={(e) => { setHeadCount(e.target.value); setResult(null); }}
                placeholder="e.g. 100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Route */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={MapPin} />
              <CardTitle>Route</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                id="destination"
                name="destination"
                label="Destination Saleyard"
                options={saleyardOptions}
                placeholder="Select saleyard (optional)"
                onChange={() => {}}
              />
              <Input
                id="distance"
                name="distance"
                label="Distance (km)"
                type="number"
                min={0}
                required
                value={distance}
                onChange={(e) => { setDistance(e.target.value); setResult(null); }}
                placeholder="e.g. 200"
                helperText="Enter the one-way road distance"
              />
            </div>
          </CardContent>
        </Card>

        {/* Freight Assumptions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Truck} />
              <CardTitle>Freight Assumptions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                id="rate"
                name="rate"
                label="Rate ($/deck/km)"
                type="number"
                step="0.01"
                min={0}
                value={rate}
                onChange={(e) => { setRate(e.target.value); setResult(null); }}
                helperText="Default $3.00 based on national averages"
              />
              <Select
                id="category_override"
                name="category_override"
                label="Freight Category Override"
                options={categoryOverrideOptions}
                value={categoryOverrideId}
                onChange={(e) => { setCategoryOverrideId(e.target.value); setResult(null); }}
              />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-text-muted">
              Default rate and head per deck values are based on national averages.
              Override the freight category if you know the exact loading specification for your consignment.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit">
            Calculate Freight
          </Button>
          {result && (
            <Button type="button" variant="ghost" onClick={handleReset}>
              Reset
            </Button>
          )}
        </div>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Hero Cost */}
          <Card className="bg-brand/5 ring-brand/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15">
                  <DollarSign className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    Estimated Freight Cost
                  </p>
                  <p className="text-3xl font-bold text-brand">
                    ${result.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="ml-1.5 text-sm font-medium text-text-muted">+GST</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Cost per Head"
              value={`$${result.costPerHead.toFixed(2)}`}
            />
            <StatCard
              label="Cost per Deck"
              value={`$${result.costPerDeck.toFixed(2)}`}
            />
            <StatCard
              label="Cost per km"
              value={`$${result.costPerKm.toFixed(2)}`}
            />
            <StatCard
              label="Decks Required"
              value={result.decksRequired.toString()}
              sub={`${result.headsPerDeck} head/deck`}
            />
          </div>

          {/* Assumptions Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <div className="flex justify-between">
                  <span className="text-text-muted">Category</span>
                  <span className="font-medium text-text-primary">{result.freightCategory.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Head/Deck</span>
                  <span className="font-medium text-text-primary">{result.headsPerDeck}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Weight</span>
                  <span className="font-medium text-text-primary">{Math.round(result.averageWeightKg)}kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Head Count</span>
                  <span className="font-medium text-text-primary">{result.headCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Distance</span>
                  <span className="font-medium text-text-primary">{Math.round(result.distanceKm)}km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Rate</span>
                  <span className="font-medium text-text-primary">${result.ratePerDeckPerKm.toFixed(2)}/dk/km</span>
                </div>
              </div>
              {result.capacitySource === "user_override" && (
                <p className="mt-3 text-xs text-brand">Freight category overridden by user</p>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          {(result.efficiencyPrompt || result.categoryWarning || result.breederAutoDetectNotice) && (
            <div className="space-y-3">
              {result.efficiencyPrompt && (
                <AlertCard type="success" message={result.efficiencyPrompt} />
              )}
              {result.categoryWarning && (
                <AlertCard type="warning" message={result.categoryWarning} />
              )}
              {result.breederAutoDetectNotice && (
                <AlertCard type="info" message={result.breederAutoDetectNotice} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
