"use client";

type BreedingProgram = "ai" | "controlled" | "uncontrolled";

interface StepBreederTypeProps {
  breedingProgram: BreedingProgram | "";
  onBreedingProgramChange: (v: BreedingProgram) => void;
}

const PROGRAMS: { value: BreedingProgram; title: string; description: string }[] = [
  {
    value: "ai",
    title: "Artificial Insemination",
    description: "Fixed insemination period with known dates. Calving accrual commences at midpoint of insemination period.",
  },
  {
    value: "controlled",
    title: "Controlled Breeding",
    description: "Bulls joined for a defined period. Calving accrual commences at midpoint of joining period.",
  },
  {
    value: "uncontrolled",
    title: "Uncontrolled Breeding",
    description: "Year-round breeding with no set dates. Calving accrual progresses over 12 months based on your calving rate.",
  },
];

export function StepBreederType({ breedingProgram, onBreedingProgramChange }: StepBreederTypeProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Breeding Program</h2>
        <p className="mt-1 text-sm text-text-secondary">How is this herd bred?</p>
      </div>

      <div className="space-y-3">
        {PROGRAMS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onBreedingProgramChange(p.value)}
            className={`w-full rounded-xl p-4 text-left transition-all ${
              breedingProgram === p.value
                ? "bg-brand/15 ring-2 ring-brand"
                : "bg-surface hover:bg-surface-raised ring-1 ring-ring-subtle"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                breedingProgram === p.value ? "border-brand bg-brand" : "border-text-muted"
              }`}>
                {breedingProgram === p.value && (
                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                    <circle cx="6" cy="6" r="3" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{p.title}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{p.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
