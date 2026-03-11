"use client";

import { Info } from "lucide-react";

interface Property {
  id: string;
  property_name: string;
}

interface StepPropertyProps {
  properties: Property[];
  selectedPropertyId: string;
  onPropertyChange: (id: string) => void;
}

export function StepProperty({ properties, selectedPropertyId, onPropertyChange }: StepPropertyProps) {
  if (properties.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Property</h2>
          <p className="mt-1 text-sm text-text-secondary">Assign this herd to a property.</p>
        </div>
        <div className="flex gap-3 rounded-xl bg-surface-lowest p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="text-xs text-text-secondary">
            No properties found. You can add a property later from the Properties page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Property</h2>
        <p className="mt-1 text-sm text-text-secondary">Assign this herd to a property.</p>
      </div>

      <div className="space-y-2">
        {properties.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPropertyChange(p.id)}
            className={`w-full rounded-xl p-4 text-left transition-all ${
              selectedPropertyId === p.id
                ? "bg-brand/15 ring-2 ring-brand"
                : "bg-surface hover:bg-surface-raised ring-1 ring-ring-subtle"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                selectedPropertyId === p.id ? "border-brand bg-brand" : "border-text-muted"
              }`}>
                {selectedPropertyId === p.id && (
                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                    <circle cx="6" cy="6" r="3" />
                  </svg>
                )}
              </div>
              <p className="text-sm font-medium text-text-primary">{p.property_name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
