"use client";

import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

interface StepCalvesProps {
  calvesHeadCount: string;
  calvesAgeMonths: string;
  calvesWeight: string;
  onCalvesHeadCountChange: (v: string) => void;
  onCalvesAgeMonthsChange: (v: string) => void;
  onCalvesWeightChange: (v: string) => void;
}

export function StepCalves({
  calvesHeadCount, calvesAgeMonths, calvesWeight,
  onCalvesHeadCountChange, onCalvesAgeMonthsChange, onCalvesWeightChange,
}: StepCalvesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Calves at Foot</h2>
        <p className="mt-1 text-sm text-text-secondary">Record any calves currently with this herd. All fields are optional.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="calves_head"
          label="Calves Head Count"
          type="number"
          min={0}
          value={calvesHeadCount}
          onChange={(e) => onCalvesHeadCountChange(e.target.value)}
          placeholder="Optional"
        />
        <Input
          id="calves_age"
          label="Average Age (months)"
          type="number"
          min={0}
          value={calvesAgeMonths}
          onChange={(e) => onCalvesAgeMonthsChange(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <Input
        id="calves_weight"
        label="Average Weight (kg)"
        type="number"
        step="0.1"
        min={0}
        value={calvesWeight}
        onChange={(e) => onCalvesWeightChange(e.target.value)}
        placeholder="Optional"
      />

      <div className="flex gap-3 rounded-xl bg-surface-lowest p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p className="text-xs text-text-secondary">
          Skip this step if no calves are currently at foot. You can update this later.
        </p>
      </div>
    </div>
  );
}
