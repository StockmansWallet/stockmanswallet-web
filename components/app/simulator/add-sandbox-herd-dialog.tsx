"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { createSandboxHerd } from "@/app/(app)/dashboard/advisor/simulator/actions";
import { breedsForSpecies } from "@/lib/data/reference-data";
import {
  cattleMasterCategories,
  categoriesForSpecies,
} from "@/lib/data/weight-mapping";

interface AddSandboxHerdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}

const speciesOptions = ["Cattle"] as const;

function sexForCategory(category: string): string {
  switch (category) {
    case "Steer":
    case "Bull":
      return "Male";
    case "Heifer":
    case "Breeder":
    case "Dry Cow":
      return "Female";
    default:
      return "Male";
  }
}

export function AddSandboxHerdDialog({
  open,
  onOpenChange,
  propertyId,
}: AddSandboxHerdDialogProps) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("Cattle");
  const [breed, setBreed] = useState("");
  const [category, setCategory] = useState("");
  const [breederSubType, setBreederSubType] = useState("Cow");
  const [headCount, setHeadCount] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [weight, setWeight] = useState("");
  const [dwg, setDwg] = useState("0.8");
  const [mortality, setMortality] = useState("2");
  const [calvingRate, setCalvingRate] = useState("85");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const breeds = breedsForSpecies(species);
  const categories = categoriesForSpecies(species);
  const isBreeder = category === "Breeder";

  function resetForm() {
    setName("");
    setSpecies("Cattle");
    setBreed("");
    setCategory("");
    setBreederSubType("Cow");
    setHeadCount("");
    setAgeMonths("");
    setWeight("");
    setDwg("0.8");
    setMortality("2");
    setCalvingRate("85");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onOpenChange(false);
  }

  function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Herd name is required"); return; }
    if (!breed) { setError("Please select a breed"); return; }
    if (!category) { setError("Please select a category"); return; }

    const head = parseInt(headCount);
    if (isNaN(head) || head < 1) { setError("Head count must be at least 1"); return; }

    const age = parseInt(ageMonths);
    if (isNaN(age) || age < 0) { setError("Age must be 0 or more months"); return; }

    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) { setError("Weight must be greater than 0"); return; }

    const d = parseFloat(dwg);
    if (isNaN(d) || d < 0) { setError("Daily weight gain cannot be negative"); return; }

    const mort = mortality.trim() ? parseFloat(mortality) : undefined;
    if (mort !== undefined && (isNaN(mort) || mort < 0 || mort > 100)) {
      setError("Mortality must be between 0 and 100");
      return;
    }

    const calv = calvingRate.trim() ? parseFloat(calvingRate) : undefined;
    if (isBreeder && calv !== undefined && (isNaN(calv) || calv < 0 || calv > 100)) {
      setError("Calving rate must be between 0 and 100");
      return;
    }

    startTransition(async () => {
      const result = await createSandboxHerd(propertyId, {
        name: trimmedName,
        species,
        breed,
        category,
        sex: sexForCategory(category),
        head_count: head,
        age_months: age,
        initial_weight: w,
        daily_weight_gain: d,
        mortality_rate: mort !== undefined ? mort / 100 : undefined,
        calving_rate: isBreeder && calv !== undefined ? calv / 100 : undefined,
        breeder_sub_type: isBreeder ? breederSubType : undefined,
      });

      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        resetForm();
        onOpenChange(false);
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Sandbox Herd" size="md">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {/* Name */}
        <Field label="Herd Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. North Paddock Steers"
            className="border-zinc-700 bg-zinc-900"
          />
        </Field>

        {/* Species + Breed */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Species">
            <select
              value={species}
              onChange={(e) => {
                setSpecies(e.target.value);
                setBreed("");
                setCategory("");
              }}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-text-primary"
            >
              {speciesOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          <Field label="Breed">
            <select
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Select breed</option>
              {breeds.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Category + Breeder Sub-type */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          {isBreeder && (
            <Field label="Breeder Sub-type">
              <select
                value={breederSubType}
                onChange={(e) => setBreederSubType(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-text-primary"
              >
                <option value="Cow">Cow</option>
                <option value="Heifer">Heifer</option>
              </select>
            </Field>
          )}
        </div>

        {/* Head Count + Age */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Head Count">
            <Input
              type="number"
              min={1}
              value={headCount}
              onChange={(e) => setHeadCount(e.target.value)}
              placeholder="e.g. 50"
              className="border-zinc-700 bg-zinc-900"
            />
          </Field>

          <Field label="Age (months)">
            <Input
              type="number"
              min={0}
              value={ageMonths}
              onChange={(e) => setAgeMonths(e.target.value)}
              placeholder="e.g. 12"
              className="border-zinc-700 bg-zinc-900"
            />
          </Field>
        </div>

        {/* Weight + DWG */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Weight (kg)">
            <Input
              type="number"
              min={1}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 350"
              className="border-zinc-700 bg-zinc-900"
            />
          </Field>

          <Field label="DWG (kg/day)">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={dwg}
              onChange={(e) => setDwg(e.target.value)}
              placeholder="e.g. 0.8"
              className="border-zinc-700 bg-zinc-900"
            />
          </Field>
        </div>

        {/* Mortality + Calving Rate */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mortality %">
            <Input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={mortality}
              onChange={(e) => setMortality(e.target.value)}
              placeholder="e.g. 2"
              className="border-zinc-700 bg-zinc-900"
            />
          </Field>

          {isBreeder && (
            <Field label="Calving Rate %">
              <Input
                type="number"
                step="1"
                min={0}
                max={100}
                value={calvingRate}
                onChange={(e) => setCalvingRate(e.target.value)}
                placeholder="e.g. 85"
                className="border-zinc-700 bg-zinc-900"
              />
            </Field>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-text-muted"
          >
            Cancel
          </Button>
          <Button
            className="bg-[#FF5722] text-white hover:bg-[#FF5722]/90"
            disabled={isPending}
            onClick={handleCreate}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add Herd
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      {children}
    </div>
  );
}
