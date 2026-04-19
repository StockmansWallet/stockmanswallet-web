"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Trash2,
  Loader2,
} from "lucide-react";
import { fetchRegionalData } from "@/app/(app)/dashboard/advisor/clients/[id]/lens-report-actions";
import { RegionalDataDisplay } from "./regional-data-display";
import type { RegionalDataSnapshot } from "@/lib/types/lens-report";

export interface HerdOverrideState {
  shading_percentage: number;
  breed_premium_override: string;
  adwg_override: string;
  calving_rate_override: string;
  mortality_rate_override: string;
  head_count_adjustment: string;
  advisor_notes: string;
  regional_data: RegionalDataSnapshot | null;
}

export interface HerdInfo {
  id: string;
  name: string;
  category: string;
  breed: string;
  species: string;
  head_count: number;
  initial_weight: number;
  daily_weight_gain: number;
  mortality_rate: number | null;
  calving_rate: number;
  breed_premium_override: number | null;
  selected_saleyard: string | null;
  is_breeder: boolean;
}

interface LensHerdCardProps {
  herd: HerdInfo;
  connectionId: string;
  overrides: HerdOverrideState;
  onOverridesChange: (overrides: HerdOverrideState) => void;
  onRemove: () => void;
  index: number;
}

export function LensHerdCard({
  herd,
  connectionId,
  overrides,
  onOverridesChange,
  onRemove,
  index,
}: LensHerdCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [fetchingRegional, startFetchTransition] = useTransition();

  function update(field: keyof HerdOverrideState, value: string | number | RegionalDataSnapshot | null) {
    onOverridesChange({ ...overrides, [field]: value });
  }

  function handleFetchRegional() {
    startFetchTransition(async () => {
      const result = await fetchRegionalData(connectionId, herd.id);
      if (result.data) {
        update("regional_data", result.data);
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface-raised/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-advisor/15 text-xs font-bold text-advisor">
            {index + 1}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{herd.name || "Unnamed Herd"}</h3>
            <p className="text-xs text-text-muted">
              {herd.head_count} head · {herd.breed} {herd.category} · {herd.initial_weight} kg
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overrides.shading_percentage !== 100 && (
            <Badge className="bg-warning/15 text-warning">
              {overrides.shading_percentage}% shading
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <CardContent className="space-y-4 px-5 pb-5 pt-0 border-t border-border/50">
          {/* Assumptions grid: 5 overrides + shading in a clean 3x2 grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mt-4">
            <OverrideField
              label="Breed Premium (%)"
              currentValue={`${herd.breed_premium_override ?? 0}%`}
              value={overrides.breed_premium_override}
              onChange={(v) => update("breed_premium_override", v)}
              step="0.1"
            />
            <OverrideField
              label="DWG (kg/day)"
              currentValue={`${herd.daily_weight_gain} kg/day`}
              value={overrides.adwg_override}
              onChange={(v) => update("adwg_override", v)}
              step="0.01"
            />
            <OverrideField
              label="Calving Rate (%)"
              currentValue={`${Math.round(herd.calving_rate * 100)}%`}
              value={overrides.calving_rate_override}
              onChange={(v) => update("calving_rate_override", v)}
              step="1"
            />
            <OverrideField
              label="Mortality (%)"
              currentValue={`${Math.round((herd.mortality_rate ?? 0) * 100)}%`}
              value={overrides.mortality_rate_override}
              onChange={(v) => update("mortality_rate_override", v)}
              step="0.1"
            />
            <OverrideField
              label="Head Count Adj."
              currentValue={`${herd.head_count} head`}
              value={overrides.head_count_adjustment}
              onChange={(v) => update("head_count_adjustment", v)}
              step="1"
              placeholder="e.g. -10"
            />

            {/* Shading as 6th grid item */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-muted">Shading</label>
                <span className="text-xs tabular-nums font-medium text-text-secondary">
                  {overrides.shading_percentage}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={overrides.shading_percentage}
                onChange={(e) => update("shading_percentage", Number(e.target.value))}
                className="w-full accent-advisor mt-1.5"
              />
              <div className="flex justify-between text-[10px] text-text-muted">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Notes</label>
            <textarea
              value={overrides.advisor_notes}
              onChange={(e) => update("advisor_notes", e.target.value)}
              maxLength={5000}
              rows={2}
              placeholder="Reasoning for adjustments..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-advisor/40"
            />
          </div>

          {/* Regional data (expanded inline when fetched) */}
          {overrides.regional_data && (
            <div className="rounded-lg border border-border/50 bg-surface-raised/30 p-3">
              <RegionalDataDisplay data={overrides.regional_data} />
            </div>
          )}

          {/* Footer: regional fetch + remove on one row */}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFetchRegional}
              disabled={fetchingRegional}
            >
              {fetchingRegional ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <MapPin className="mr-1.5 h-3.5 w-3.5" />
              )}
              Fetch Regional Averages
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onRemove}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove Herd
            </Button>
          </div>
        </CardContent>
      )}
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
