"use client";

import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

interface StepBreedingDetailsProps {
  breedingProgram: string;
  joiningStart: string;
  joiningEnd: string;
  onJoiningStartChange: (v: string) => void;
  onJoiningEndChange: (v: string) => void;
}

export function StepBreedingDetails({
  breedingProgram, joiningStart, joiningEnd,
  onJoiningStartChange, onJoiningEndChange,
}: StepBreedingDetailsProps) {
  const needsDates = breedingProgram === "ai" || breedingProgram === "controlled";
  const periodLabel = breedingProgram === "ai" ? "Insemination" : "Joining";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Breeding Details</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {needsDates
            ? `Set the ${periodLabel.toLowerCase()} period for this herd.`
            : "No dates required for uncontrolled breeding."}
        </p>
      </div>

      {needsDates && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="joining_start"
            label={`${periodLabel} Period Start`}
            type="date"
            required
            value={joiningStart}
            onChange={(e) => onJoiningStartChange(e.target.value)}
          />
          <Input
            id="joining_end"
            label={`${periodLabel} Period End`}
            type="date"
            required
            value={joiningEnd}
            onChange={(e) => onJoiningEndChange(e.target.value)}
            min={joiningStart || undefined}
          />
        </div>
      )}

      <div className="flex gap-3 rounded-xl bg-surface-lowest p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p className="text-xs text-text-secondary">
          {needsDates
            ? `Calving accrual commences at the midpoint of the ${periodLabel.toLowerCase()} period, reaching 100% at calving (approximately 9 months).`
            : "Calving accrual progresses over 12 months based on your calving rate, reflecting year-round breeding."}
        </p>
      </div>
    </div>
  );
}
