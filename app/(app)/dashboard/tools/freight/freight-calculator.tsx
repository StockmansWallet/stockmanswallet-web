"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { calculateFreightEstimate, DEFAULT_RATE_PER_DECK_PER_KM } from "@/lib/engines/freight-engine";
import { headsPerDeckForWeight, freightCategoryLibrary } from "@/lib/data/freight-categories";
import { resolveFreightCategory } from "@/lib/engines/freight-engine";
import { saleyards, saleyardLocality, saleyardCoordinates } from "@/lib/data/reference-data";
import type { FreightEstimate } from "@/lib/types/models";
import {
  MapPin,
  Truck,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Info,
  Navigation,
  ChevronDown,
} from "lucide-react";
import { getRoadDistanceKm } from "@/lib/services/distance-service";
import AddressAutocomplete, { type AddressResult } from "@/components/app/address-autocomplete";

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


// --- Helpers ---

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
  const [isCustomJob, setIsCustomJob] = useState(false);

  // Step 2: Destination
  const [selectedSaleyard, setSelectedSaleyard] = useState("");
  const [customAddress, setCustomAddress] = useState("");

  // Step 3: Assumptions (auto-filled from herd, editable)
  const [weight, setWeight] = useState("");
  const [headCount, setHeadCount] = useState("");
  const [distance, setDistance] = useState("");
  const [headPerDeck, setHeadPerDeck] = useState("");
  const [rate, setRate] = useState(DEFAULT_RATE_PER_DECK_PER_KM.toFixed(2));
  const [result, setResult] = useState<FreightEstimate | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [calculatedDistanceLabel, setCalculatedDistanceLabel] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [densityOpen, setDensityOpen] = useState(false);

  const selectedHerd = herds.find((h) => h.id === selectedHerdId);

  // Build herd options
  const herdOptions = [
    { value: "", label: "Select herd" },
    ...herds.map((h) => ({
      value: h.id,
      label: `${h.name} - ${h.head_count} head, ${Math.round(h.current_weight)}kg`,
    })),
  ];

  // Build property options
  const propertyOptions = [
    { value: "", label: "Select property" },
    ...properties.map((p) => ({
      value: p.id,
      label: p.suburb ? `${p.property_name} (${p.suburb}, ${p.state})` : p.property_name,
    })),
  ];

  // Toggle custom job mode
  function handleCustomJobToggle(checked: boolean) {
    setIsCustomJob(checked);
    setResult(null);
    if (checked) {
      setSelectedHerdId("");
      setWeight("");
      setHeadCount("");
      setHeadPerDeck("");
    }
  }

  // When herd selected, auto-fill weight/headCount and set property
  function handleHerdChange(herdId: string) {
    setSelectedHerdId(herdId);
    setResult(null);
    const herd = herds.find((h) => h.id === herdId);
    if (herd) {
      setWeight(Math.round(herd.current_weight).toString());
      setHeadCount(herd.head_count.toString());
      // Use category-aware head per deck - breeders/cow-calf use fixed density
      const mapping = resolveFreightCategory(herd.category, herd.sex, herd.current_weight);
      const hpd = mapping.category.id === "cow_calf_units"
        ? mapping.category.headsPerDeck
        : headsPerDeckForWeight(herd.current_weight);
      setHeadPerDeck(hpd.toString());
      if (herd.property_id) {
        setSelectedPropertyId(herd.property_id);
        // Recalculate distance if saleyard already selected
        recalcDistance(herd.property_id, selectedSaleyard);
      }
    } else {
      setWeight("");
      setHeadCount("");
      setHeadPerDeck("");
    }
  }

  // When saleyard selected, auto-calculate distance from property and clear custom address
  function handleSaleyardChange(saleyard: string) {
    setSelectedSaleyard(saleyard);
    setCustomAddress("");
    setResult(null);
    if (!saleyard) {
      setCalculatedDistance(null);
      setCalculatedDistanceLabel("");
    }
    recalcDistance(selectedPropertyId, saleyard);
  }

  // When a custom address is selected from Google Places autocomplete
  async function handleAddressSelect(addressResult: AddressResult) {
    const label = addressResult.address || `${addressResult.suburb}, ${addressResult.state}`;
    setCustomAddress(label);
    setSelectedSaleyard("");
    setResult(null);
    // Calculate distance from property to custom address via OSRM
    const prop = properties.find((p) => p.id === selectedPropertyId);
    if (prop?.latitude && prop?.longitude) {
      const { distanceKm } = await getRoadDistanceKm(
        prop.latitude, prop.longitude, addressResult.latitude, addressResult.longitude,
      );
      setDistance(distanceKm.toString());
      setCalculatedDistance(distanceKm);
      setCalculatedDistanceLabel(`${prop.property_name} to ${label.split(",")[0]}`);
    }
  }

  // When property changes, recalculate distance
  function handlePropertyChange(propId: string) {
    setSelectedPropertyId(propId);
    setResult(null);
    recalcDistance(propId, selectedSaleyard);
  }

  async function recalcDistance(propId: string, saleyard: string) {
    if (!propId || !saleyard) return;
    const prop = properties.find((p) => p.id === propId);
    const coords = saleyardCoordinates[saleyard];
    if (prop?.latitude && prop?.longitude && coords) {
      const { distanceKm } = await getRoadDistanceKm(prop.latitude, prop.longitude, coords.lat, coords.lon);
      setDistance(distanceKm.toString());
      setCalculatedDistance(distanceKm);
      const saleyardName = saleyard.split(",")[0].trim();
      setCalculatedDistanceLabel(`${prop.property_name} to ${saleyardName}`);
    }
  }

  // Category-aware heads-per-deck for the selected herd
  // Weight-based head per deck, with cow-calf fixed density exception
  function categoryAwareHpd(w: number): number {
    if (selectedHerd) {
      const mapping = resolveFreightCategory(selectedHerd.category, selectedHerd.sex, w);
      if (mapping.category.id === "cow_calf_units") {
        return mapping.category.headsPerDeck;
      }
    }
    return headsPerDeckForWeight(w);
  }

  // Live heads-per-deck preview
  const previewHpd = useMemo(() => {
    const w = Number(weight);
    if (!w || w <= 0) return null;
    return categoryAwareHpd(w);
  }, [weight, selectedHerdId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update headPerDeck when weight changes (if no override)
  function handleWeightChange(val: string) {
    setWeight(val);
    setResult(null);
    const w = Number(val);
    if (w > 0) {
      setHeadPerDeck(categoryAwareHpd(w).toString());
    }
  }

  function handleCalculate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);

    // Validate required fields before calculating
    const herdRequired = !isCustomJob;
    if (!selectedPropertyId || (herdRequired && !selectedHerdId) || !weight || !headCount || !distance) return;

    const hpdOverride = Number(headPerDeck) || undefined;

    const estimate = calculateFreightEstimate({
      herdGroupId: selectedHerdId || undefined,
      appCategory: selectedHerd?.category ?? "Grown Steer",
      sex: selectedHerd?.sex ?? "Female",
      averageWeightKg: Number(weight) || 0,
      headCount: Number(headCount) || 0,
      distanceKm: Number(distance) || 0,
      ratePerDeckPerKm: Number(rate) || DEFAULT_RATE_PER_DECK_PER_KM,
      headsPerDeckOverride: hpdOverride,
      isCustomJob,
    });

    setResult(estimate);
  }

  function handleReset() {
    setSelectedHerdId("");
    setSelectedPropertyId("");
    setIsCustomJob(false);
    setSelectedSaleyard("");
    setCustomAddress("");
    setWeight("");
    setHeadCount("");
    setDistance("");
    setHeadPerDeck("");
    setRate(DEFAULT_RATE_PER_DECK_PER_KM.toFixed(2));
    setResult(null);
    setCalculatedDistance(null);
    setCalculatedDistanceLabel("");
    setAttempted(false);
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
              <div>
                <Select
                  id="property"
                  name="property"
                  label="Property"
                  options={propertyOptions}
                  value={selectedPropertyId}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  hint={attempted && !selectedPropertyId}
                />
                {selectedHerd && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span>{selectedHerd.breed} {selectedHerd.category}</span>
                    <span>{selectedHerd.head_count} head</span>
                    <span>{Math.round(selectedHerd.current_weight)}kg avg</span>
                    <span>{selectedHerd.sex}</span>
                  </div>
                )}
              </div>
              <div>
                <Select
                  id="herd"
                  name="herd"
                  label="Herd"
                  options={herdOptions}
                  value={selectedHerdId}
                  onChange={(e) => handleHerdChange(e.target.value)}
                  hint={attempted && !isCustomJob && !selectedHerdId}
                  disabled={isCustomJob}
                />
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.03] px-4 py-2.5 ring-1 ring-inset ring-white/[0.06] transition-colors hover:bg-white/[0.05]">
                  <input
                    type="checkbox"
                    checked={isCustomJob}
                    onChange={(e) => handleCustomJobToggle(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-white/[0.04] text-sky-500 focus:ring-sky-500/50"
                  />
                  <span>
                    <span className="text-sm font-medium text-sky-400">Custom Job</span>
                    <br />
                    <span className="text-xs text-text-muted">(enter weight and head count manually)</span>
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Destination - appears after property + herd selected */}
        {selectedPropertyId && (selectedHerdId || isCustomJob) && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={MapPin} />
                <div>
                  <CardTitle>Destination</CardTitle>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Select a saleyard or custom address to auto-calculate distance, or enter manually.
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
                  hint={attempted && !selectedSaleyard && !customAddress}
                />
                <div>
                  <label htmlFor="custom_address" className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Custom Address
                  </label>
                  <AddressAutocomplete
                    defaultValue={customAddress}
                    onSelect={handleAddressSelect}
                    placeholder="Search address..."
                    className="rounded-xl border-0 bg-surface py-3 pl-9 pr-4 ring-0 focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-surface-raised"
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  hint={attempted && !distance}
                  helperText="Enter the one-way road distance"
                />
                {calculatedDistance !== null && (
                  <div className="flex flex-col justify-center rounded-xl bg-emerald-500/5 px-4 py-3 ring-1 ring-inset ring-emerald-500/20">
                    <p className="text-xs font-medium text-emerald-400">Calculated Distance</p>
                    <p className="mt-0.5 text-lg font-bold text-emerald-300">
                      {Math.round(calculatedDistance)} km
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-muted">
                      {calculatedDistanceLabel}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Freight Assumptions - appears after distance entered */}
        {selectedPropertyId && (selectedHerdId || isCustomJob) && distance && (
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
                  hint={attempted && !weight}
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
                  hint={attempted && !headCount}
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
                  hint={attempted && !distance}
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
              <p className="mt-4 text-xs leading-relaxed text-text-muted">
                Default rate and head per deck values are based on national averages.
                Adjust to match your local carrier's requirements.
              </p>

              {/* Loading Density Reference */}
              <button
                type="button"
                onClick={() => setDensityOpen(!densityOpen)}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-sky-400 transition-colors hover:text-sky-300"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${densityOpen ? "rotate-180" : ""}`} />
                Loading Density Reference
              </button>
              {densityOpen && (
                <div className="mt-2 overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left text-text-muted">
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 text-right font-medium">Head/Deck</th>
                        <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Weight Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {freightCategoryLibrary.map((cat) => (
                        <tr key={cat.id} className="border-b border-white/[0.04] last:border-0">
                          <td className="px-3 py-1.5 text-text-secondary">{cat.displayName}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-text-primary">{cat.headsPerDeck}</td>
                          <td className="hidden px-3 py-1.5 text-right text-text-muted sm:table-cell">
                            {cat.weightCeilingKg === Infinity
                              ? `${cat.weightFloorKg}kg+`
                              : cat.weightFloorKg === 0
                                ? `Up to ${cat.weightCeilingKg}kg`
                                : `${cat.weightFloorKg} - ${cat.weightCeilingKg}kg`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions - appears after distance entered */}
        {selectedPropertyId && (selectedHerdId || isCustomJob) && distance && (
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
        )}
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
            </div>

            {/* Alerts */}
            {(result.efficiencyPrompt || result.shortCartNotice || result.categoryWarning || result.breederAutoDetectNotice) && (
              <div className="space-y-3">
                {result.efficiencyPrompt && (
                  <AlertCard type="success" message={result.efficiencyPrompt} />
                )}
                {result.shortCartNotice && (
                  <AlertCard type="info" message={result.shortCartNotice} />
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
