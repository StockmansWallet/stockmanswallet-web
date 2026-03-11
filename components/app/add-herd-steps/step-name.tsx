"use client";

import { Input } from "@/components/ui/input";

interface StepNameProps {
  name: string;
  paddock: string;
  onNameChange: (v: string) => void;
  onPaddockChange: (v: string) => void;
}

export function StepName({ name, paddock, onNameChange, onPaddockChange }: StepNameProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Name & Location</h2>
        <p className="mt-1 text-sm text-text-secondary">Give your herd a name and optional paddock location.</p>
      </div>
      <Input
        id="name"
        label="Herd Name"
        required
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="e.g. Breeders, Steers, Heifers"
        autoFocus
      />
      <Input
        id="paddock"
        label="Paddock"
        value={paddock}
        onChange={(e) => onPaddockChange(e.target.value)}
        placeholder="e.g. Swamp Paddock"
        helperText="Optional"
      />
    </div>
  );
}
