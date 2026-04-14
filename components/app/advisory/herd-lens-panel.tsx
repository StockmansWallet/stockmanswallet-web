"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, Save, Loader2, RotateCcw } from "lucide-react";
import type { AdvisorLens } from "@/lib/types/advisor-lens";
import { upsertHerdLens, resetHerdOverrides } from "@/app/(app)/dashboard/advisor/clients/[id]/lens-actions";

interface BaselineMetrics {
  headCount: number;
  weight: number;
  dwg: number;
  mortalityRate: number;
  calvingRate: number;
  breedPremium: number;
}

interface HerdLensPanelProps {
  connectionId: string;
  herdId: string;
  lens: AdvisorLens | null;
  baselineValue: number;
  metrics: BaselineMetrics;
}

export function HerdLensPanel({
  connectionId,
  herdId,
  lens,
  baselineValue,
  metrics,
}: HerdLensPanelProps) {
  const [isPending, startTransition] = useTransition();

  // Override fields (initialised from existing lens or empty)
  const [breedPremium, setBreedPremium] = useState(
    lens?.breed_premium_override != null ? String(lens.breed_premium_override) : ""
  );
  const [dwg, setDwg] = useState(
    lens?.adwg_override != null ? String(lens.adwg_override) : ""
  );
  const [calvingRate, setCalvingRate] = useState(
    lens?.calving_rate_override != null ? String(lens.calving_rate_override) : ""
  );
  const [mortality, setMortality] = useState(
    lens?.mortality_rate_override != null ? String(lens.mortality_rate_override) : ""
  );
  const [headAdj, setHeadAdj] = useState(
    lens?.head_count_adjustment != null ? String(lens.head_count_adjustment) : ""
  );
  const [shading, setShading] = useState(
    lens?.shading_percentage ?? 100
  );
  const [notes, setNotes] = useState(lens?.advisor_notes ?? "");

  function handleSave() {
    startTransition(async () => {
      await upsertHerdLens(connectionId, herdId, {
        is_active: true,
        breed_premium_override: breedPremium.trim() ? parseFloat(breedPremium) : null,
        adwg_override: dwg.trim() ? parseFloat(dwg) : null,
        calving_rate_override: calvingRate.trim() ? parseFloat(calvingRate) : null,
        mortality_rate_override: mortality.trim() ? parseFloat(mortality) : null,
        head_count_adjustment: headAdj.trim() ? parseInt(headAdj) : null,
        shading_percentage: shading,
        advisor_notes: notes.trim() || null,
        cached_baseline_value: baselineValue,
      });
    });
  }

  function handleReset() {
    startTransition(async () => {
      await resetHerdOverrides(connectionId, herdId);
      setBreedPremium("");
      setDwg("");
      setCalvingRate("");
      setMortality("");
      setHeadAdj("");
      setShading(100);
      setNotes("");
    });
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2F8CD9]/15">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#2F8CD9]" />
            </div>
            <CardTitle>Advisor Lens</CardTitle>
          </div>
          <Badge className="bg-[#2F8CD9]/15 text-[#2F8CD9]">Per-Herd Overrides</Badge>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Adjust assumptions for this herd. Overrides are visible only to you and do not affect the client&apos;s data.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5">
        {/* Override fields */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <OverrideField
            label="Breed Premium (%)"
            currentValue={`${metrics.breedPremium > 0 ? "+" : ""}${metrics.breedPremium}%`}
            value={breedPremium}
            onChange={setBreedPremium}
            step="0.1"
          />
          <OverrideField
            label="DWG (kg/day)"
            currentValue={`${metrics.dwg} kg/day`}
            value={dwg}
            onChange={setDwg}
            step="0.01"
          />
          <OverrideField
            label="Calving Rate (%)"
            currentValue={`${Math.round(metrics.calvingRate * 100)}%`}
            value={calvingRate}
            onChange={setCalvingRate}
            step="1"
          />
          <OverrideField
            label="Mortality (%)"
            currentValue={`${Math.round(metrics.mortalityRate * 100)}%`}
            value={mortality}
            onChange={setMortality}
            step="0.1"
          />
          <OverrideField
            label="Head Count Adj."
            currentValue={`${metrics.headCount} head`}
            value={headAdj}
            onChange={setHeadAdj}
            step="1"
            placeholder="e.g. -10"
          />
        </div>

        {/* Shading slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-muted">Shading</label>
            <Badge className="bg-surface-raised text-text-secondary">{shading}%</Badge>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            value={shading}
            onChange={(e) => setShading(Number(e.target.value))}
            className="w-full accent-[#2F8CD9]"
          />
          <div className="flex justify-between text-[10px] text-text-muted">
            <span>0%</span>
            <span>100%</span>
            <span>200%</span>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Advisor Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="Record your reasoning for these adjustments..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-[#2F8CD9]/40"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="advisor"
            disabled={isPending}
            onClick={handleSave}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Lens
          </Button>
          <Button
            variant="ghost"
            disabled={isPending}
            onClick={handleReset}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OverrideField({
  label,
  currentValue,
  value,
  onChange,
  step,
  placeholder,
}: {
  label: string;
  currentValue: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? `Current: ${currentValue}`}
        className="border-border bg-surface"
      />
      <p className="text-[10px] text-text-muted">Current: {currentValue}</p>
    </div>
  );
}
