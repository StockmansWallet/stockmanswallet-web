"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  calculateFreightEstimate,
  DEFAULT_RATE_PER_DECK_PER_KM,
} from "@/lib/engines/freight-engine";
import { headsPerDeckForWeight } from "@/lib/data/freight-categories";
import { resolveFreightCategory } from "@/lib/engines/freight-engine";
import { parseCalvesAtFoot } from "@/lib/engines/valuation-engine";
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
  Bookmark,
  BookmarkCheck,
  Share2,
  Check,
  History,
} from "lucide-react";
import { getRoadDistanceKm } from "@/lib/services/distance-service";
import AddressAutocomplete, { type AddressResult } from "@/components/app/address-autocomplete";
import { buildFreightShareText } from "@/lib/freight/share-formatter";
import { saveFreightEstimate } from "./actions";

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
  additional_info: string | null;
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
  label: saleyardLocality[s] ? `${saleyardLocality[s].split(",")[0].trim()} - ${s}` : s,
}));

// --- Helpers ---

// Matches the assumptions string shown on screen and written to saved records.
function buildAssumptionsLine(result: FreightEstimate): string {
  const weight = Math.round(result.averageWeightKg);
  const rate = result.ratePerDeckPerKm.toFixed(2);
  const distance = Math.round(result.distanceKm);
  return `${result.freightCategory.displayName} · ${result.headsPerDeck} head/deck · ${weight}kg avg weight · $${rate}/deck/km · ${distance} km`;
}

// --- Sub-components ---

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-freight-iq/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
      <Icon className="text-freight-iq h-3.5 w-3.5" />
    </div>
  );
}

function AlertCard({ type, message }: { type: "warning" | "info" | "success"; message: string }) {
  const styles = {
    warning: {
      bg: "bg-warning/10 ring-warning/20",
      icon: <AlertTriangle className="text-warning h-4 w-4" />,
    },
    info: { bg: "bg-info/10 ring-info/20", icon: <Info className="text-info h-4 w-4" /> },
    success: {
      bg: "bg-success/10 ring-success/20",
      icon: <CheckCircle2 className="text-success h-4 w-4" />,
    },
  };
  const s = styles[type];
  return (
    <div
      className={`flex items-start gap-3 rounded-xl p-4 ring-1 backdrop-blur-md ring-inset ${s.bg}`}
    >
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <p className="text-text-secondary text-sm leading-relaxed">{message}</p>
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
  const [calvesAtFoot, setCalvesAtFoot] = useState(true);
  const [didSave, setDidSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [isSaving, startSaving] = useTransition();

  const selectedHerd = herds.find((h) => h.id === selectedHerdId);
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  // Label for destination (saleyard name, custom address, or manual distance).
  const destinationLabel = useMemo(() => {
    if (selectedSaleyard) {
      const locality = saleyardLocality[selectedSaleyard];
      const saleyardName = selectedSaleyard.split(",")[0].trim();
      return locality ? `${locality.split(",")[0].trim()} (${saleyardName})` : saleyardName;
    }
    if (customAddress) return customAddress.split(",")[0].trim();
    return "Manual destination";
  }, [selectedSaleyard, customAddress]);

  const herdLabel = isCustomJob ? "Custom job" : selectedHerd ? selectedHerd.name : "";

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
      // Breeder defaults to calves at foot (cow-calf density); others use weight-band.
      // For breeders with calves at foot, pre-fill with cow count only (each
      // cow-calf pair is one loading unit, 18 HPD already accounts for the calf).
      const isBreeder = herd.category === "Breeder";
      setCalvesAtFoot(true);
      if (isBreeder) {
        const calfData = parseCalvesAtFoot(herd.additional_info);
        const loadingUnits = calfData
          ? Math.max(1, herd.head_count - calfData.headCount)
          : herd.head_count;
        setHeadCount(loadingUnits.toString());
      } else {
        setHeadCount(herd.head_count.toString());
      }
      const mapping = resolveFreightCategory(
        herd.category,
        herd.sex,
        herd.current_weight,
        isBreeder
      );
      const hpd =
        mapping.category.id === "cow_calf_units"
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
        prop.latitude,
        prop.longitude,
        addressResult.latitude,
        addressResult.longitude
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
      const { distanceKm } = await getRoadDistanceKm(
        prop.latitude,
        prop.longitude,
        coords.lat,
        coords.lon
      );
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
      const mapping = resolveFreightCategory(
        selectedHerd.category,
        selectedHerd.sex,
        w,
        calvesAtFoot
      );
      if (mapping.category.id === "cow_calf_units") {
        return mapping.category.headsPerDeck;
      }
    }
    return headsPerDeckForWeight(w);
  }

  // Live heads-per-deck preview
  const previewHpd = (() => {
    const w = Number(weight);
    if (!w || w <= 0) return null;
    return categoryAwareHpd(w);
  })();

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
    if (
      !selectedPropertyId ||
      (herdRequired && !selectedHerdId) ||
      !weight ||
      !headCount ||
      !distance
    )
      return;

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
      calvesAtFoot,
    });

    setResult(estimate);
    setDidSave(false);
    setSaveError(null);
    setShareStatus("idle");
  }

  function handleSave() {
    if (!result) return;
    setSaveError(null);
    startSaving(async () => {
      const res = await saveFreightEstimate({
        originPropertyName: selectedProperty?.property_name ?? "Origin",
        destinationName: destinationLabel,
        herdName: herdLabel,
        categoryName: result.freightCategory.displayName,
        headCount: result.headCount,
        averageWeightKg: result.averageWeightKg,
        headsPerDeck: result.headsPerDeck,
        decksRequired: result.decksRequired,
        distanceKm: result.distanceKm,
        ratePerDeckPerKm: result.ratePerDeckPerKm,
        totalCost: result.totalCost,
        costPerHead: result.costPerHead,
        costPerDeck: result.costPerDeck,
        costPerKm: result.costPerKm,
        hasPartialDeck: result.hasPartialDeck,
        spareSpotsOnLastDeck: result.spareSpotsOnLastDeck,
        isCustomJob: result.isCustomJob,
        categoryWarning: result.categoryWarning ?? null,
        efficiencyPrompt: result.efficiencyPrompt ?? null,
        breederAutoDetectNotice: result.breederAutoDetectNotice ?? null,
        shortCartNotice: result.shortCartNotice ?? null,
        assumptionsSummary: buildAssumptionsLine(result),
      });
      if (res.error) {
        setSaveError(res.error);
        return;
      }
      setDidSave(true);
    });
  }

  async function handleShare() {
    if (!result) return;
    const text = buildFreightShareText({
      originName: selectedProperty?.property_name ?? "Origin",
      destinationName: destinationLabel,
      herdName: herdLabel,
      headCount: result.headCount,
      averageWeightKg: result.averageWeightKg,
      distanceKm: result.distanceKm,
      totalCost: result.totalCost,
      costPerHead: result.costPerHead,
      costPerDeck: result.costPerDeck,
      decksRequired: result.decksRequired,
      assumptions: buildAssumptionsLine(result),
    });
    // Prefer native share sheet on mobile browsers; fall back to clipboard copy.
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Freight IQ Estimate", text });
        return;
      } catch {
        // Share cancelled or unavailable  -  fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2000);
    } catch {
      setSaveError("Unable to copy to clipboard");
    }
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
    setCalvesAtFoot(true);
    setDidSave(false);
    setSaveError(null);
    setShareStatus("idle");
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
      {/* Left Column: Setup */}
      <form onSubmit={handleCalculate} className="min-w-0 space-y-4 xl:col-span-7">
        {/* Step 1: Origin & Herd */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Navigation} />
              <div>
                <CardTitle>Origin & Herd</CardTitle>
                <p className="text-text-muted mt-0.5 text-xs">
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
                  <div className="text-text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>
                      {selectedHerd.breed} {selectedHerd.category}
                    </span>
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
              </div>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.06] transition-colors ring-inset hover:bg-white/[0.05]">
              <input
                type="checkbox"
                checked={isCustomJob}
                onChange={(e) => handleCustomJobToggle(e.target.checked)}
                className="text-freight-iq focus:ring-freight-iq/50 h-4 w-4 shrink-0 rounded border-white/20 bg-white/[0.04]"
              />
              <span className="text-freight-iq text-sm font-medium">Custom Job</span>
              <span className="text-text-muted text-xs">Enter weight and head count manually</span>
            </label>
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
                  <p className="text-text-muted mt-0.5 text-xs">
                    Select a saleyard or custom address to auto-calculate distance, or enter
                    manually.
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
                  <label
                    htmlFor="custom_address"
                    className="text-text-secondary mb-1.5 block text-sm font-medium"
                  >
                    Custom Address
                  </label>
                  <AddressAutocomplete
                    defaultValue={customAddress}
                    onSelect={handleAddressSelect}
                    placeholder="Search address..."
                    className="bg-surface focus:ring-freight-iq/60 focus:bg-surface-raised rounded-xl border-0 py-3 pr-4 pl-9 ring-0 focus:ring-1 focus:ring-inset"
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
                  onChange={(e) => {
                    setDistance(e.target.value);
                    setResult(null);
                  }}
                  placeholder="e.g. 200"
                  hint={attempted && !distance}
                  helperText="Enter the one-way road distance"
                />
                {calculatedDistance !== null && (
                  <div className="bg-success/5 ring-success/20 flex flex-col justify-center rounded-xl px-4 py-3 ring-1 ring-inset">
                    <p className="text-success text-xs font-medium">Calculated Distance</p>
                    <p className="text-success mt-0.5 text-lg font-bold">
                      {Math.round(calculatedDistance)} km
                    </p>
                    <p className="text-text-muted mt-0.5 truncate text-xs">
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
                  <p className="text-text-muted mt-0.5 text-xs">
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
                  onChange={(e) => {
                    setHeadCount(e.target.value);
                    setResult(null);
                  }}
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
                  onChange={(e) => {
                    setDistance(e.target.value);
                    setResult(null);
                  }}
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
                  onChange={(e) => {
                    setHeadPerDeck(e.target.value);
                    setResult(null);
                  }}
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
                  onChange={(e) => {
                    setRate(e.target.value);
                    setResult(null);
                  }}
                />
              </div>
              <p className="text-text-muted mt-4 text-xs leading-relaxed">
                Default rate and head per deck values are based on national averages. Adjust to
                match your local carrier&apos;s requirements.
              </p>

              {/* Loading Density Reference */}
              <button
                type="button"
                onClick={() => setDensityOpen(!densityOpen)}
                className="text-freight-iq hover:text-freight-iq mt-3 flex items-center gap-1.5 text-xs font-medium transition-colors"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${densityOpen ? "rotate-180" : ""}`}
                />
                Loading Density Reference
              </button>
              {densityOpen && (
                <div className="mt-2 overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] ring-inset">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-text-muted border-b border-white/[0.06] text-left">
                        <th className="px-3 py-2 font-medium">Weight Range</th>
                        <th className="px-3 py-2 text-right font-medium">Head/Deck</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { range: "Under 300 kg", hpd: 40 },
                        { range: "300 - 349 kg", hpd: 36 },
                        { range: "350 - 399 kg", hpd: 32 },
                        { range: "400 - 449 kg", hpd: 28 },
                        { range: "450 - 499 kg", hpd: 26 },
                        { range: "500 - 549 kg", hpd: 24 },
                        { range: "550 - 599 kg", hpd: 22 },
                        { range: "600 - 649 kg", hpd: 20 },
                        { range: "650+ kg", hpd: 18 },
                      ].map((band) => (
                        <tr key={band.range} className="border-b border-white/[0.04] last:border-0">
                          <td className="text-text-secondary px-3 py-1.5">{band.range}</td>
                          <td className="text-text-primary px-3 py-1.5 text-right font-mono">
                            {band.hpd}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-white/[0.08]">
                        <td className="text-text-secondary px-3 py-1.5">Cow & Calf Units</td>
                        <td className="text-text-primary px-3 py-1.5 text-right font-mono">18</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Calves at Foot toggle - only for Breeder category */}
              {selectedHerd?.category === "Breeder" && (
                <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.06] transition-colors ring-inset hover:bg-white/[0.05]">
                  <input
                    type="checkbox"
                    checked={calvesAtFoot}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCalvesAtFoot(checked);
                      setResult(null);
                      const w = Number(weight);
                      if (checked) {
                        setHeadPerDeck("18");
                      } else if (w > 0) {
                        setHeadPerDeck(headsPerDeckForWeight(w).toString());
                      }
                    }}
                    className="text-freight-iq focus:ring-freight-iq/50 mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-white/[0.04]"
                  />
                  <span>
                    <span className="text-text-primary text-sm font-medium">Calves at foot</span>
                    <br />
                    <span className="text-text-muted text-xs">
                      {calvesAtFoot
                        ? "Loaded at Cow & Calf density (18 head/deck). Turn off if calves have not dropped."
                        : "Using standard weight-based loading density."}
                    </span>
                  </span>
                </label>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions - appears after distance entered */}
        {selectedPropertyId && (selectedHerdId || isCustomJob) && distance && (
          <div className="flex items-center gap-3">
            <Button type="submit" variant="freight-iq">
              Calculate Freight
            </Button>
            {(result || selectedHerdId) && (
              <Button
                type="button"
                variant="ghost"
                className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
                onClick={handleReset}
              >
                Reset
              </Button>
            )}
          </div>
        )}
      </form>

      {/* Right Column: Results */}
      <div className="w-full xl:sticky xl:top-[5.25rem] xl:col-span-5">
        {result ? (
          <div className="space-y-4">
            {/* Hero Cost */}
            <Card className="bg-freight-iq/5 ring-freight-iq/20">
              <CardContent className="p-6 text-center">
                <p className="text-text-muted text-xs font-medium tracking-wider uppercase">
                  Freight Estimate
                </p>
                <p className="text-freight-iq mt-1 text-4xl font-bold">
                  ${Math.round(result.totalCost).toLocaleString()}
                  <span className="text-text-muted ml-1.5 text-base font-medium">+GST</span>
                </p>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardContent className="divide-y divide-white/[0.06] p-0">
                {[
                  {
                    label: "Freight Cost",
                    icon: <DollarSign className="h-4 w-4" />,
                    value: `$${Math.round(result.totalCost).toLocaleString()}`,
                  },
                  {
                    label: "Cost Per Head",
                    icon: <span className="text-xs font-bold">hd</span>,
                    value: `$${Math.round(result.costPerHead).toLocaleString()}`,
                  },
                  {
                    label: "Cost Per Deck",
                    icon: <Truck className="h-4 w-4" />,
                    value: `$${Math.round(result.costPerDeck).toLocaleString()}`,
                  },
                  {
                    label: "Required Decks",
                    icon: <Truck className="h-4 w-4" />,
                    value: result.decksRequired.toString(),
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="text-text-muted flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                        {row.icon}
                      </div>
                      <span className="text-text-primary text-sm font-medium">{row.label}</span>
                    </div>
                    <span className="text-text-primary text-sm font-semibold">{row.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Assumptions */}
            <div className="px-1">
              <p className="text-text-muted text-xs font-medium">Assumptions</p>
              <p className="text-text-muted mt-1 text-xs leading-relaxed">
                {result.freightCategory.displayName} · {result.headsPerDeck} head/deck ·{" "}
                {Math.round(result.averageWeightKg)}kg avg weight · $
                {result.ratePerDeckPerKm.toFixed(2)}/deck/km · {Math.round(result.distanceKm)} km
              </p>
            </div>

            {/* Alerts */}
            {(result.efficiencyPrompt ||
              result.shortCartNotice ||
              result.categoryWarning ||
              result.breederAutoDetectNotice) && (
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

            {/* Save & Share */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={didSave ? "ghost" : "freight-iq"}
                  onClick={handleSave}
                  disabled={didSave || isSaving}
                  aria-live="polite"
                >
                  {didSave ? (
                    <>
                      <BookmarkCheck className="mr-1.5 h-4 w-4" /> Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="mr-1.5 h-4 w-4" />{" "}
                      {isSaving ? "Saving..." : "Save Estimate"}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="bg-freight-iq/15 text-freight-iq hover:bg-freight-iq/25 ring-freight-iq/20 ring-1 backdrop-blur-md ring-inset"
                  onClick={handleShare}
                  aria-live="polite"
                >
                  {shareStatus === "copied" ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-1.5 h-4 w-4" /> Share
                    </>
                  )}
                </Button>
              </div>
              {saveError && (
                <p className="text-error text-xs" role="alert">
                  {saveError}
                </p>
              )}
              <Link
                href="/dashboard/tools/freight/history"
                className="text-freight-iq mt-3 inline-flex h-9 items-center gap-1.5 self-center rounded-full bg-white/[0.03] px-4 text-[13px] font-semibold ring-1 ring-white/[0.06] backdrop-blur-md transition-colors ring-inset hover:bg-white/[0.06]"
              >
                <History className="h-3.5 w-3.5" /> View saved estimates
              </Link>
            </div>
          </div>
        ) : (
          <Card className="hidden lg:block">
            <CardContent className="p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                <Truck className="text-text-muted h-5 w-5" />
              </div>
              <p className="text-text-secondary mt-3 text-sm font-medium">Freight Estimate</p>
              <p className="text-text-muted mt-1 text-xs">
                Fill in the details and hit calculate to see your freight cost breakdown.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
