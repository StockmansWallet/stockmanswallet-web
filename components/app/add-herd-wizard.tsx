"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StepName } from "./add-herd-steps/step-name";
import { StepKind } from "./add-herd-steps/step-kind";
import { StepBreederType } from "./add-herd-steps/step-breeder-type";
import { StepBreedingDetails } from "./add-herd-steps/step-breeding-details";
import { StepAttributes } from "./add-herd-steps/step-attributes";
import { StepGrowth } from "./add-herd-steps/step-growth";
import { StepCalves } from "./add-herd-steps/step-calves";
import { StepProperty } from "./add-herd-steps/step-property";
import { StepSaleyard } from "./add-herd-steps/step-saleyard";
import { ChevronLeft } from "lucide-react";

// Breeder categories that trigger the extended flow
const BREEDER_KEYWORDS = ["breeder", "wet cow"];

function isBreederCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return BREEDER_KEYWORDS.some((kw) => lower.includes(kw));
}

// Step definitions
type StepId =
  | "name"
  | "kind"
  | "breeder-type"
  | "breeding-details"
  | "attributes"
  | "growth"
  | "calves"
  | "property"
  | "saleyard";

const BASE_STEPS: StepId[] = ["name", "kind", "attributes", "growth", "property", "saleyard"];
const BREEDER_STEPS: StepId[] = [
  "name", "kind", "breeder-type", "breeding-details",
  "attributes", "growth", "calves", "property", "saleyard",
];

interface AddHerdWizardProps {
  properties: { id: string; property_name: string }[];
  action: (formData: FormData) => Promise<{ error: string } | void>;
}

export function AddHerdWizard({ properties, action }: AddHerdWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [paddock, setPaddock] = useState("");
  const [species, setSpecies] = useState("Cattle");
  const [breed, setBreed] = useState("");
  const [category, setCategory] = useState("");
  const [breedPremiumOverride, setBreedPremiumOverride] = useState("");
  const [breedingProgram, setBreedingProgram] = useState<"ai" | "controlled" | "uncontrolled" | "">("");
  const [joiningStart, setJoiningStart] = useState("");
  const [joiningEnd, setJoiningEnd] = useState("");
  const [headCount, setHeadCount] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [initialWeight, setInitialWeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [dailyWeightGain, setDailyWeightGain] = useState(0);
  const [mortalityRate, setMortalityRate] = useState(0);
  const [calvingRate, setCalvingRate] = useState(50);
  const [calvesHeadCount, setCalvesHeadCount] = useState("");
  const [calvesAgeMonths, setCalvesAgeMonths] = useState("");
  const [calvesWeight, setCalvesWeight] = useState("");
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [saleyard, setSaleyard] = useState("");

  const isBreeder = isBreederCategory(category);

  const steps = useMemo(() => {
    let s = isBreeder ? [...BREEDER_STEPS] : [...BASE_STEPS];
    // Skip breeding-details for uncontrolled
    if (isBreeder && breedingProgram === "uncontrolled") {
      s = s.filter((st) => st !== "breeding-details");
    }
    return s;
  }, [isBreeder, breedingProgram]);

  const totalSteps = steps.length;
  const stepId = steps[currentStep] ?? "name";

  // Validation per step
  function isStepValid(): boolean {
    switch (stepId) {
      case "name": return name.trim().length > 0;
      case "kind": return species !== "" && breed !== "" && category !== "";
      case "breeder-type": return breedingProgram !== "";
      case "breeding-details": {
        if (breedingProgram === "uncontrolled") return true;
        return joiningStart !== "" && joiningEnd !== "" && joiningEnd >= joiningStart;
      }
      case "attributes": return Number(headCount) > 0 && Number(initialWeight) > 0;
      case "growth": return true;
      case "calves": return true;
      case "property": return true;
      case "saleyard": return saleyard !== "";
      default: return true;
    }
  }

  function handleNext() {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("species", species);
    formData.set("breed", breed);
    formData.set("category", category);
    formData.set("head_count", headCount || "1");
    formData.set("age_months", ageMonths || "0");
    formData.set("initial_weight", initialWeight || "0");
    formData.set("current_weight", currentWeight || initialWeight || "0");
    formData.set("daily_weight_gain", String(dailyWeightGain));
    formData.set("mortality_rate", String(mortalityRate));
    formData.set("paddock_name", paddock.trim());
    formData.set("property_id", propertyId);
    formData.set("selected_saleyard", saleyard);
    if (breedPremiumOverride) formData.set("breed_premium_override", breedPremiumOverride);

    // Breeder fields
    if (isBreeder) {
      formData.set("is_breeder", "on");
      formData.set("breeding_program_type", breedingProgram);
      formData.set("calving_rate", String(calvingRate));
      if (joiningStart) formData.set("joining_period_start", joiningStart);
      if (joiningEnd) formData.set("joining_period_end", joiningEnd);

      // Calves at foot in additional_info
      if (calvesHeadCount || calvesAgeMonths || calvesWeight) {
        const parts = [];
        if (calvesHeadCount) parts.push(`Calves at Foot: ${calvesHeadCount} head`);
        if (calvesAgeMonths) parts.push(`${calvesAgeMonths} months`);
        if (calvesWeight) parts.push(`${calvesWeight} kg`);
        formData.set("additional_info", parts.join(", "));
      }
    }

    const result = await action(formData);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="pb-24">
      {/* Progress bar */}
      <div className="mb-6 flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentStep ? "bg-brand" : "bg-surface"
            }`}
          />
        ))}
      </div>

      {/* Step counter */}
      <p className="mb-6 text-xs font-medium uppercase tracking-wider text-text-muted">
        Step {currentStep + 1} of {totalSteps}
      </p>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[300px]">
        {stepId === "name" && (
          <StepName name={name} paddock={paddock} onNameChange={setName} onPaddockChange={setPaddock} />
        )}
        {stepId === "kind" && (
          <StepKind
            species={species} breed={breed} category={category} breedPremiumOverride={breedPremiumOverride}
            onSpeciesChange={setSpecies} onBreedChange={setBreed} onCategoryChange={(v) => {
              setCategory(v);
              // Reset breeder fields if switching away from breeder
              if (!isBreederCategory(v)) {
                setBreedingProgram("");
                setJoiningStart("");
                setJoiningEnd("");
                setCalvesHeadCount("");
                setCalvesAgeMonths("");
                setCalvesWeight("");
              }
            }}
            onBreedPremiumChange={setBreedPremiumOverride}
          />
        )}
        {stepId === "breeder-type" && (
          <StepBreederType breedingProgram={breedingProgram} onBreedingProgramChange={setBreedingProgram} />
        )}
        {stepId === "breeding-details" && (
          <StepBreedingDetails
            breedingProgram={breedingProgram} joiningStart={joiningStart} joiningEnd={joiningEnd}
            onJoiningStartChange={setJoiningStart} onJoiningEndChange={setJoiningEnd}
          />
        )}
        {stepId === "attributes" && (
          <StepAttributes
            headCount={headCount} ageMonths={ageMonths} initialWeight={initialWeight} currentWeight={currentWeight}
            onHeadCountChange={setHeadCount} onAgeMonthsChange={setAgeMonths}
            onInitialWeightChange={setInitialWeight} onCurrentWeightChange={setCurrentWeight}
          />
        )}
        {stepId === "growth" && (
          <StepGrowth
            dailyWeightGain={dailyWeightGain} mortalityRate={mortalityRate} calvingRate={calvingRate}
            isBreeder={isBreeder}
            onDailyWeightGainChange={setDailyWeightGain} onMortalityRateChange={setMortalityRate}
            onCalvingRateChange={setCalvingRate}
          />
        )}
        {stepId === "calves" && (
          <StepCalves
            calvesHeadCount={calvesHeadCount} calvesAgeMonths={calvesAgeMonths} calvesWeight={calvesWeight}
            onCalvesHeadCountChange={setCalvesHeadCount} onCalvesAgeMonthsChange={setCalvesAgeMonths}
            onCalvesWeightChange={setCalvesWeight}
          />
        )}
        {stepId === "property" && (
          <StepProperty properties={properties} selectedPropertyId={propertyId} onPropertyChange={setPropertyId} />
        )}
        {stepId === "saleyard" && (
          <StepSaleyard selectedSaleyard={saleyard} onSaleyardChange={setSaleyard} />
        )}
      </div>

      {/* Navigation bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 lg:px-8">
          <div>
            {currentStep > 0 && (
              <Button type="button" variant="ghost" size="md" onClick={handleBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div>
            {isLastStep ? (
              <Button
                type="button"
                size="md"
                disabled={!isStepValid() || submitting}
                onClick={handleSave}
              >
                {submitting ? "Saving..." : "Save Herd"}
              </Button>
            ) : (
              <Button
                type="button"
                size="md"
                disabled={!isStepValid()}
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
