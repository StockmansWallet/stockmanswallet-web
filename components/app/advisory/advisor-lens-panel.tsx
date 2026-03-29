"use client";

import { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { upsertAdvisorLens, resetLensOverrides } from "@/app/(app)/dashboard/advisor/clients/[id]/lens-actions";
import { applyShadingTo } from "@/lib/types/advisor-lens";
import type { AdvisorLens, AdvisorScenario } from "@/lib/types/advisor-lens";
import { ScenarioPicker } from "./scenario-picker";
import { Eye, EyeOff, RotateCcw, SlidersHorizontal, DollarSign } from "lucide-react";

interface AdvisorLensPanelProps {
  connectionId: string;
  lens: AdvisorLens | null;
  scenarios: AdvisorScenario[];
  baselineValue: number;
  advisorName: string;
}

interface OverrideFieldProps {
  label: string;
  baselineValue: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
}

function OverrideField({ label, baselineValue, value, onChange, suffix = "", step = "0.01" }: OverrideFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">Baseline: {baselineValue}{suffix}</p>
      </div>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="--"
        className="w-24 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-right text-sm tabular-nums text-text-primary outline-none focus:border-brand"
      />
    </div>
  );
}

export function AdvisorLensPanel({
  connectionId,
  lens,
  scenarios,
  baselineValue,
  advisorName,
}: AdvisorLensPanelProps) {
  const [isActive, setIsActive] = useState(lens?.is_active ?? true);
  const [shading, setShading] = useState(String(lens?.shading_percentage ?? 100));
  const [breedPremium, setBreedPremium] = useState(lens?.breed_premium_override != null ? String(lens.breed_premium_override) : "");
  const [adwg, setAdwg] = useState(lens?.adwg_override != null ? String(lens.adwg_override) : "");
  const [calvingRate, setCalvingRate] = useState(lens?.calving_rate_override != null ? String(lens.calving_rate_override) : "");
  const [mortality, setMortality] = useState(lens?.mortality_rate_override != null ? String(lens.mortality_rate_override) : "");
  const [headAdj, setHeadAdj] = useState(lens?.head_count_adjustment != null ? String(lens.head_count_adjustment) : "");
  const [notes, setNotes] = useState(lens?.advisor_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shadingNum = parseFloat(shading) || 100;
  const adjustedValue = baselineValue; // Simplified: real calculation would apply overrides
  const shadedValue = applyShadingTo(adjustedValue, shadingNum);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    const result = await upsertAdvisorLens(connectionId, {
      is_active: isActive,
      shading_percentage: shadingNum,
      breed_premium_override: breedPremium ? parseFloat(breedPremium) : null,
      adwg_override: adwg ? parseFloat(adwg) : null,
      calving_rate_override: calvingRate ? parseFloat(calvingRate) : null,
      mortality_rate_override: mortality ? parseFloat(mortality) : null,
      head_count_adjustment: headAdj ? parseInt(headAdj) : null,
      advisor_notes: notes || null,
      cached_baseline_value: baselineValue,
      cached_advisor_value: adjustedValue,
      cached_shaded_value: shadedValue,
    });
    if (result?.error) setError(result.error);
    setSaving(false);
  }, [connectionId, isActive, shadingNum, breedPremium, adwg, calvingRate, mortality, headAdj, notes, baselineValue, adjustedValue, shadedValue]);

  const handleReset = useCallback(async () => {
    setSaving(true);
    setError(null);
    const result = await resetLensOverrides(connectionId);
    if (result?.error) {
      setError(result.error);
    } else {
      setBreedPremium("");
      setAdwg("");
      setCalvingRate("");
      setMortality("");
      setHeadAdj("");
      setShading("100");
    }
    setSaving(false);
  }, [connectionId]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Lens toggle + value summary */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F8CD9]/15">
                {isActive ? <Eye className="h-5 w-5 text-[#2F8CD9]" /> : <EyeOff className="h-5 w-5 text-text-muted" />}
              </div>
              <div>
                <p className="font-semibold text-text-primary">Advisor Lens</p>
                <p className="text-xs text-text-muted">{isActive ? "Active" : "Inactive"}</p>
              </div>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? "bg-[#2F8CD9]" : "bg-white/10"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${isActive ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          {isActive && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Baseline</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-text-primary">${Math.round(baselineValue).toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-[#2F8CD9]/10 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#2F8CD9]">Adjusted</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-[#2F8CD9]">${Math.round(adjustedValue).toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-brand/10 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-brand">Shaded</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-brand">${Math.round(shadedValue).toLocaleString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isActive && (
        <>
          {/* Override fields */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2F8CD9]/15">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#2F8CD9]" />
                </div>
                <CardTitle>Assumptions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-white/[0.04] px-5 pb-5">
              <OverrideField label="Breed Premium" baselineValue="0" value={breedPremium} onChange={setBreedPremium} suffix="%" />
              <OverrideField label="Daily Weight Gain" baselineValue="0" value={adwg} onChange={setAdwg} suffix=" kg/day" />
              <OverrideField label="Calving Rate" baselineValue="85" value={calvingRate} onChange={setCalvingRate} suffix="%" step="1" />
              <OverrideField label="Mortality Rate" baselineValue="0" value={mortality} onChange={setMortality} suffix="%" />
              <OverrideField label="Head Count Adj." baselineValue="0" value={headAdj} onChange={setHeadAdj} step="1" />
            </CardContent>
          </Card>

          {/* Shading slider */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                    <DollarSign className="h-3.5 w-3.5 text-brand" />
                  </div>
                  <CardTitle>Shading</CardTitle>
                </div>
                <Badge variant="default">{shadingNum}%</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={shading}
                onChange={(e) => setShading(e.target.value)}
                className="w-full accent-brand"
              />
              <div className="mt-1 flex justify-between text-[10px] text-text-muted">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Advisor Notes</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reasoning for adjustments..."
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </CardContent>
          </Card>

          {/* Scenarios */}
          <ScenarioPicker
            connectionId={connectionId}
            scenarios={scenarios}
            activeLensScenarioId={lens?.active_scenario_id ?? null}
            advisorName={advisorName}
          />

          {/* Action buttons */}
          <div className="flex items-center justify-between pb-4">
            <Button variant="ghost" onClick={handleReset} disabled={saving}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Lens"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
