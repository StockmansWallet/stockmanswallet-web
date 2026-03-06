"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { calculateFreightEstimate, DEFAULT_RATE_PER_DECK_PER_KM } from "@/lib/engines/freight-engine";
import { freightCategoryLibrary, headsPerDeckForWeight } from "@/lib/data/freight-categories";
import { saleyards, saleyardLocality, saleyardCoordinates } from "@/lib/data/reference-data";
import type { FreightEstimate, FreightCapacityCategory } from "@/lib/types/models";
import {
  MapPin,
  Truck,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Info,
  Navigation,
} from "lucide-react";

// --- Types ---

interface HerdOption {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  category: string;
  head_count: number;
  current_weight: number;
  is_breeder: boolean;
  property_id: string | null;
}

interface PropertyOption {
  id: string;
  property_name: string;
  latitude: number | null;
  longitude: number | null;
  state: string | null;
  suburb: string | null;
}

interface FreightCalculatorProps {
  herds: HerdOption[];
  properties: PropertyOption[];
}

// --- Constants ---

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

// --- Helpers ---

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Road distance is roughly 1.3x straight-line
  return Math.round(R * c * 1.3);
}

// --- Sub-components ---

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15">
      <Icon className="h-3.5 w-3.5 text-sky-400" />
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

function AlertCard({ type, message }: { type: "warning" | "info" | "success"; message: string }) {
  const styles = {
    warning: { bg: "bg-amber-500/10 ring-amber-500/20", icon: <AlertTriangle className="h-4 w-4 text-amber-400" /> },
    info: { bg: "bg-blue-500/10 ring-blue-500/20", icon: <Info className="h-4 w-4 text-blue-400" /> },
    success: { bg: "bg-emerald-500/10 ring-emerald-500/20", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> },
  };
  const s = styles[type];
  return (
    <div className={`flex items-start gap-3 rounded-xl p-4 ring-1 ring-inset ${s.bg}`}>
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <p className="text-sm leading-relaxed text-text-secondary">{message}</p>
    </div>
  );
}

// --- Main Component ---

export function FreightCalculator({ herds, properties }: FreightCalculatorProps) {
  // Step 1: Origin & Herd
  const [selectedHerdId, setSelectedHerdId] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  // Step 2: Destination
  const [selectedSaleyard, setSelectedSaleyard] = useState("");

  // Step 3: Assumptions (auto-filled from herd, editable)
  const [weight, setWeight] = useState("");
  const [headCount, setHeadCount] = useState("");
  const [distance, setDistance] = useState("");
  const [headPerDeck, setHeadPerDeck] = useState("");
  const [rate, setRate] = useState(DEFAULT_RATE_PER_DECK_PER_KM.toFixed(2));
  const [categoryOverrideId, setCategoryOverrideId] = useState("");

  const [result, setResult] = useState<FreightEstimate | null>(null);

  const selectedHerd = herds.find((h) => h.id === selectedHerdId);

  // Build herd options
  const herdOptions = [
    { value: "", label: "Custom Job" },
    ...herds.map((h) => ({
      value: h.id,
      label: `${h.name} - ${h.head_count} head, ${Math.round(h.current_weight)}kg`,
    })),
  ];

  // Build property options
  const propertyOptions = [
    { value: "", label: "No property selected" },
    ...properties.map((p) => ({
      value: p.id,
      label: p.suburb ? `${p.property_name} (${p.suburb}, ${p.state})` : p.property_name,
    })),
  ];

  // When herd selected, auto-fill weight/headCount and set property
  function handleHerdChange(herdId: string) {
    setSelectedHerdId(herdId);
    setResult(null);
    const herd = herds.find((h) => h.id === herdId);
    if (herd) {
      setWeight(Math.round(herd.current_weight).toString());
      setHeadCount(herd.head_count.toString());
      const hpd = headsPerDeckForWeight(herd.current_weight);
      setHeadPerDeck(hpd.toString());
      if (herd.property_id) {
        setSelectedPropertyId(herd.property_id);
        // Recalculate distance if saleyard already selected
        recalcDistance(herd.property_id, selectedSaleyard);
      }
    } else {
      // Custom job - clear fields
      setWeight("");
      setHeadCount("");
      setHeadPerDeck("");
    }
  }

  // When saleyard selected, auto-calculate distance from property
  function handleSaleyardChange(saleyard: string) {
    setSelectedSaleyard(saleyard);
    setResult(null);
    recalcDistance(selectedPropertyId, saleyard);
  }

  // When property changes, recalculate distance
  function handlePropertyChange(propId: string) {
    setSelectedPropertyId(propId);
    setResult(null);
    recalcDistance(propId, selectedSaleyard);
  }

  function recalcDistance(propId: string, saleyard: string) {
    if (!propId || !saleyard) return;
    const prop = properties.find((p) => p.id === propId);
    const coords = saleyardCoordinates[saleyard];
    if (prop?.latitude && prop?.longitude && coords) {
      const km = haversineKm(prop.latitude, prop.longitude, coords.lat, coords.lon);
      setDistance(km.toString());
    }
  }

  // Live heads-per-deck preview
  const previewHpd = useMemo(() => {
    const w = Number(weight);
    if (!w || w <= 0) return null;
    if (categoryOverrideId) {
      const cat = freightCategoryLibrary.find((c) => c.id === categoryOverrideId);
      return cat?.headsPerDeck ?? null;
    }
    return headsPerDeckForWeight(w);
  }, [weight, categoryOverrideId]);

  // Update headPerDeck when weight changes (if no override)
  function handleWeightChange(val: string) {
    setWeight(val);
    setResult(null);
    const w = Number(val);
    if (w > 0 && !categoryOverrideId) {
      setHeadPerDeck(headsPerDeckForWeight(w).toString());
    }
  }

  function handleCalculate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const override: FreightCapacityCategory | undefined = categoryOverrideId
      ? freightCategoryLibrary.find((c) => c.id === categoryOverrideId)
      : undefined;

    const hpdOverride = Number(headPerDeck) || undefined;

    const estimate = calculateFreightEstimate({
      herdGroupId: selectedHerdId || undefined,
      appCategory: selectedHerd?.category ?? "Grown Steer",
      sex: selectedHerd?.sex ?? "Female",
      averageWeightKg: Number(weight) || 0,
      headCount: Number(headCount) || 0,
      distanceKm: Number(distance) || 0,
      ratePerDeckPerKm: Number(rate) || DEFAULT_RATE_PER_DECK_PER_KM,
      categoryOverride: override,
      headsPerDeckOverride: hpdOverride,
      isCustomJob: !selectedHerdId,
    });

    setResult(estimate);
  }

  function handleReset() {
    setSelectedHerdId("");
    setSelectedPropertyId("");
    setSelectedSaleyard("");
    setWeight("");
    setHeadCount("");
    setDistance("");
    setHeadPerDeck("");
    setRate(DEFAULT_RATE_PER_DECK_PER_KM.toFixed(2));
    setCategoryOverrideId("");
    setResult(null);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Left Column: Setup */}
      <form onSubmit={handleCalculate} className="min-w-0 flex-1 space-y-4">
        {/* Step 1: Origin & Herd */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Navigation} />
              <div>
                <CardTitle>Origin & Herd</CardTitle>
                <p className="mt-0.5 text-xs text-text-muted">
                  Choose one of your herds or set up a custom scenario.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id="property"
                name="property"
                label="Property"
                options={propertyOptions}
                value={selectedPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
              />
              <Select
                id="herd"
                name="herd"
                label="Herd"
                options={herdOptions}
                value={selectedHerdId}
                onChange={(e) => handleHerdChange(e.target.value)}
              />
            </div>
            {selectedHerd && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                <span>{selectedHerd.breed} {selectedHerd.category}</span>
                <span>{selectedHerd.head_count} head</span>
                <span>{Math.round(selectedHerd.current_weight)}kg avg</span>
                <span>{selectedHerd.sex}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Destination */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={MapPin} />
              <div>
                <CardTitle>Sale Destination</CardTitle>
                <p className="mt-0.5 text-xs text-text-muted">
                  Select a saleyard to auto-calculate distance, or enter manually.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id="saleyard"
                name="saleyard"
                label="Saleyard"
                options={saleyardOptions}
                placeholder="Select saleyard"
                value={selectedSaleyard}
                onChange={(e) => handleSaleyardChange(e.target.value)}
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
                helperText={
                  selectedPropertyId && selectedSaleyard && distance
                    ? "Auto-calculated from property to saleyard"
                    : "Enter the one-way road distance"
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Freight Assumptions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Truck} />
              <div>
                <CardTitle>Freight Assumptions</CardTitle>
                <p className="mt-0.5 text-xs text-text-muted">
                  Confirm or adjust the values below before calculating.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Input
                id="weight"
                name="weight"
                label="Avg Weight (kg)"
                type="number"
                step="0.1"
                min={0}
                required
                value={weight}
                onChange={(e) => handleWeightChange(e.target.value)}
                placeholder="450"
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
                placeholder="100"
              />
              <Input
                id="distance_confirm"
                name="distance_confirm"
                label="Distance (km)"
                type="number"
                min={0}
                required
                value={distance}
                onChange={(e) => { setDistance(e.target.value); setResult(null); }}
                placeholder="200"
              />
              <Input
                id="head_per_deck"
                name="head_per_deck"
                label="Head Per Deck"
                type="number"
                min={1}
                value={headPerDeck}
                onChange={(e) => { setHeadPerDeck(e.target.value); setResult(null); }}
                placeholder={previewHpd?.toString() ?? "26"}
                helperText={previewHpd ? `${previewHpd} at this weight` : undefined}
              />
              <Input
                id="rate"
                name="rate"
                label="Rate ($/Deck/km)"
                type="number"
                step="0.01"
                min={0}
                value={rate}
                onChange={(e) => { setRate(e.target.value); setResult(null); }}
              />
            </div>
            <div className="mt-4 max-w-xs">
              <Select
                id="category_override"
                name="category_override"
                label="Freight Category Override"
                options={categoryOverrideOptions}
                value={categoryOverrideId}
                onChange={(e) => {
                  setCategoryOverrideId(e.target.value);
                  setResult(null);
                  const cat = freightCategoryLibrary.find((c) => c.id === e.target.value);
                  if (cat) setHeadPerDeck(cat.headsPerDeck.toString());
                  else if (weight) setHeadPerDeck(headsPerDeckForWeight(Number(weight)).toString());
                }}
              />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-text-muted">
              Default rate and head per deck values are based on national averages.
              Adjust to match your local carrier's requirements.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" variant="sky">
            Calculate Freight
          </Button>
          {(result || selectedHerdId) && (
            <Button type="button" variant="ghost" onClick={handleReset}>
              Reset
            </Button>
          )}
        </div>
      </form>

      {/* Right Column: Results */}
      <div className="w-full lg:sticky lg:top-6 lg:w-[340px] lg:shrink-0">
        {result ? (
          <div className="space-y-4">
            {/* Hero Cost */}
            <Card className="bg-sky-500/5 ring-sky-500/20">
              <CardContent className="p-6 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Freight Estimate
                </p>
                <p className="mt-1 text-4xl font-bold text-sky-400">
                  ${Math.round(result.totalCost).toLocaleString()}
                  <span className="ml-1.5 text-base font-medium text-text-muted">+GST</span>
                </p>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardContent className="divide-y divide-white/[0.06] p-0">
                {[
                  { label: "Freight Cost", icon: <DollarSign className="h-4 w-4" />, value: `$${Math.round(result.totalCost).toLocaleString()}` },
                  { label: "Cost Per Head", icon: <span className="text-xs font-bold">hd</span>, value: `$${Math.round(result.costPerHead).toLocaleString()}` },
                  { label: "Cost Per Deck", icon: <Truck className="h-4 w-4" />, value: `$${Math.round(result.costPerDeck).toLocaleString()}` },
                  { label: "Required Decks", icon: <Truck className="h-4 w-4" />, value: result.decksRequired.toString() },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-text-muted">
                        {row.icon}
                      </div>
                      <span className="text-sm font-medium text-text-primary">{row.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-text-primary">{row.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Assumptions */}
            <div className="px-1">
              <p className="text-xs font-medium text-text-muted">Assumptions</p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                {result.freightCategory.displayName} · {result.headsPerDeck} head/deck · {Math.round(result.averageWeightKg)}kg avg weight · ${result.ratePerDeckPerKm.toFixed(2)}/deck/km · {Math.round(result.distanceKm)} km
              </p>
              {result.capacitySource === "user_override" && (
                <p className="mt-1 text-xs text-sky-400">Category overridden by user</p>
              )}
            </div>

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
        ) : (
          <Card className="hidden lg:block">
            <CardContent className="p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                <Truck className="h-5 w-5 text-text-muted" />
              </div>
              <p className="mt-3 text-sm font-medium text-text-secondary">Freight Estimate</p>
              <p className="mt-1 text-xs text-text-muted">
                Fill in the details and hit calculate to see your freight cost breakdown.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
