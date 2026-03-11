"use client";

import { Input } from "@/components/ui/input";

interface StepAttributesProps {
  headCount: string;
  ageMonths: string;
  initialWeight: string;
  currentWeight: string;
  onHeadCountChange: (v: string) => void;
  onAgeMonthsChange: (v: string) => void;
  onInitialWeightChange: (v: string) => void;
  onCurrentWeightChange: (v: string) => void;
}

export function StepAttributes({
  headCount, ageMonths, initialWeight, currentWeight,
  onHeadCountChange, onAgeMonthsChange, onInitialWeightChange, onCurrentWeightChange,
}: StepAttributesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Herd Attributes</h2>
        <p className="mt-1 text-sm text-text-secondary">How many head and their average size.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="head_count"
          label="Head Count"
          type="number"
          min={1}
          required
          value={headCount}
          onChange={(e) => onHeadCountChange(e.target.value)}
          placeholder="Number of head"
          autoFocus
        />
        <Input
          id="age_months"
          label="Average Age (months)"
          type="number"
          min={0}
          value={ageMonths}
          onChange={(e) => onAgeMonthsChange(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="initial_weight"
          label="Initial Weight (kg)"
          type="number"
          step="0.1"
          min={0}
          required
          value={initialWeight}
          onChange={(e) => onInitialWeightChange(e.target.value)}
          placeholder="Average weight at purchase"
        />
        <Input
          id="current_weight"
          label="Current Weight (kg)"
          type="number"
          step="0.1"
          min={0}
          value={currentWeight}
          onChange={(e) => onCurrentWeightChange(e.target.value)}
          placeholder="Leave blank if same as initial"
          helperText="Leave same as initial if unknown"
        />
      </div>
    </div>
  );
}
