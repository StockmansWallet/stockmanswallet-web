"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { HerdForm } from "@/components/app/herd-form";
import {
  DEMO_OVERLAY_CHANGE_EVENT,
  getLocalHerd,
  updateLocalHerd,
  type DemoLocalHerd,
} from "@/lib/demo-overlay";
import { deriveSexFromCategory, fullHerdFormSchema } from "@/lib/validation/herd-schema";
import type { Database } from "@/lib/types/database";

type HerdRow = Database["public"]["Tables"]["herds"]["Row"];

type Property = { id: string; property_name: string };

export function LocalHerdEditView({
  id,
  properties,
  existingOwners,
}: {
  id: string;
  properties: Property[];
  existingOwners: string[];
}) {
  const router = useRouter();
  const [herd, setHerd] = useState<DemoLocalHerd | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sync = () => {
      setHerd(getLocalHerd(id));
      setLoaded(true);
    };
    sync();
    window.addEventListener(DEMO_OVERLAY_CHANGE_EVENT, sync);
    return () => window.removeEventListener(DEMO_OVERLAY_CHANGE_EVENT, sync);
  }, [id]);

  if (!loaded) {
    return <div className="text-text-muted py-12 text-center text-sm">Loading...</div>;
  }

  if (!herd) {
    return (
      <div className="text-text-secondary py-12 text-center text-sm">
        This local herd no longer exists.
      </div>
    );
  }

  async function action(formData: FormData): Promise<{ error: string } | void> {
    const raw = Object.fromEntries(formData.entries());
    const parsed = fullHerdFormSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const details = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
        .join("; ");
      return { error: `Validation failed: ${details}` };
    }
    const v = parsed.data;
    const breedPremiumOverride = v.breed_premium_override
      ? parseFloat(v.breed_premium_override)
      : null;
    if (breedPremiumOverride != null && !v.breed_premium_justification?.trim()) {
      return { error: "A justification is required when setting a custom breed premium." };
    }
    const isBreeder = v.is_breeder === "on";
    const derivedJoinedDate = (() => {
      if (!isBreeder) return null;
      const prog = v.breeding_program_type;
      if (
        (prog === "ai" || prog === "controlled") &&
        v.joining_period_start &&
        v.joining_period_end
      ) {
        const start = new Date(v.joining_period_start).getTime();
        const end = new Date(v.joining_period_end).getTime();
        return new Date((start + end) / 2).toISOString().split("T")[0];
      }
      return null;
    })();

    updateLocalHerd(id, {
      name: v.name,
      species: v.species,
      breed: v.breed,
      category: v.category,
      sub_category: v.sub_category ?? null,
      sex: deriveSexFromCategory(v.category),
      age_months: v.age_months,
      head_count: v.head_count,
      initial_weight: v.initial_weight,
      current_weight: v.current_weight ?? v.initial_weight,
      daily_weight_gain: v.daily_weight_gain,
      mortality_rate: v.mortality_rate / 100,
      is_breeder: isBreeder,
      is_pregnant: v.is_pregnant === "on",
      calving_rate: isBreeder ? (v.calving_rate ?? 85) / 100 : 0.85,
      breeding_program_type: isBreeder ? (v.breeding_program_type ?? null) : null,
      joining_period_start:
        isBreeder && (v.breeding_program_type === "ai" || v.breeding_program_type === "controlled")
          ? v.joining_period_start || null
          : null,
      joining_period_end:
        isBreeder && (v.breeding_program_type === "ai" || v.breeding_program_type === "controlled")
          ? v.joining_period_end || null
          : null,
      joined_date: derivedJoinedDate,
      lactation_status: v.lactation_status ?? null,
      paddock_name: v.paddock_name ?? null,
      selected_saleyard: v.selected_saleyard ?? null,
      property_id: v.property_id ?? null,
      additional_info: v.additional_info ?? null,
      calf_weight_recorded_date: v.calf_weight_recorded_date ?? null,
      notes: v.notes ?? null,
      animal_id_number: v.animal_id_number ?? null,
      breed_premium_override: breedPremiumOverride,
      breeder_sub_type: v.breeder_sub_type ?? null,
      livestock_owner: v.livestock_owner ?? null,
      breed_premium_justification: breedPremiumOverride
        ? (v.breed_premium_justification ?? null)
        : null,
    });
    router.push(`/dashboard/herds/${id}`);
    router.refresh();
  }

  return (
    <div className="w-full max-w-[1680px] pb-24">
      <PageHeader
        title={`Edit: ${herd.name}`}
        subtitle={[herd.species, herd.breed].filter(Boolean).join(" \u00B7 ")}
      />
      <HerdForm
        herd={herd as unknown as HerdRow}
        properties={properties}
        existingOwners={existingOwners}
        action={action}
        submitLabel="Save Changes"
        cancelHref={`/dashboard/herds/${id}`}
      />
    </div>
  );
}
