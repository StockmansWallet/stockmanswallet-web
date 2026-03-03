"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { saleyards } from "@/lib/data/reference-data";
import type { Database } from "@/lib/types/database";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

const AU_STATES = [
  { value: "QLD", label: "Queensland" },
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
];

const saleyardOptions = saleyards.map((s) => ({ value: s, label: s }));

interface PropertyFormProps {
  property?: PropertyRow;
  action: (formData: FormData) => Promise<{ error: string } | void>;
  submitLabel: string;
}

export function PropertyForm({ property, action, submitLabel }: PropertyFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await action(formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Property Details */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">
          Property Details
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="property_name"
            name="property_name"
            label="Property Name"
            required
            defaultValue={property?.property_name ?? ""}
            placeholder="e.g. Springfield Station"
          />
          <Input
            id="property_pic"
            name="property_pic"
            label="PIC Number"
            defaultValue={property?.property_pic ?? ""}
            placeholder="e.g. QABC1234"
            helperText="Property Identification Code"
          />
          <Select
            id="state"
            name="state"
            label="State"
            required
            options={AU_STATES}
            placeholder="Select state"
            defaultValue={property?.state ?? ""}
          />
          <Input
            id="region"
            name="region"
            label="Region"
            defaultValue={property?.region ?? ""}
            placeholder="e.g. Central Queensland"
          />
          <Input
            id="acreage"
            name="acreage"
            label="Acreage"
            type="number"
            step="any"
            defaultValue={property?.acreage ?? ""}
            placeholder="e.g. 5000"
          />
          <Input
            id="property_type"
            name="property_type"
            label="Property Type"
            defaultValue={property?.property_type ?? ""}
            placeholder="e.g. Grazing, Mixed Farming"
          />
        </div>
      </section>

      {/* Address */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">
          Address
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              id="address"
              name="address"
              label="Street Address"
              defaultValue={property?.address ?? ""}
              placeholder="e.g. 123 Station Road"
            />
          </div>
          <Input
            id="suburb"
            name="suburb"
            label="Town / Suburb"
            defaultValue={property?.suburb ?? ""}
          />
          <Input
            id="postcode"
            name="postcode"
            label="Postcode"
            defaultValue={property?.postcode ?? ""}
          />
          <Input
            id="latitude"
            name="latitude"
            label="Latitude"
            type="number"
            step="any"
            defaultValue={property?.latitude ?? ""}
            placeholder="e.g. -23.7000"
          />
          <Input
            id="longitude"
            name="longitude"
            label="Longitude"
            type="number"
            step="any"
            defaultValue={property?.longitude ?? ""}
            placeholder="e.g. 150.5000"
          />
        </div>
      </section>

      {/* Defaults */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">
          Default Settings
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select
              id="default_saleyard"
              name="default_saleyard"
              label="Default Saleyard"
              options={saleyardOptions}
              placeholder="Select saleyard"
              defaultValue={property?.default_saleyard ?? ""}
            />
          </div>
          <Input
            id="default_saleyard_distance"
            name="default_saleyard_distance"
            label="Distance to Saleyard (km)"
            type="number"
            step="any"
            defaultValue={property?.default_saleyard_distance ?? ""}
            placeholder="e.g. 120"
          />
          <Input
            id="mortality_rate"
            name="mortality_rate"
            label="Mortality Rate (%)"
            type="number"
            step="0.1"
            defaultValue={property?.mortality_rate ?? 2}
            helperText="Annual mortality rate for valuations"
          />
          <Input
            id="calving_rate"
            name="calving_rate"
            label="Calving Rate (%)"
            type="number"
            step="0.1"
            defaultValue={property?.calving_rate ?? 85}
            helperText="Expected calving/lambing percentage"
          />
          <Input
            id="freight_cost_per_km"
            name="freight_cost_per_km"
            label="Freight Cost ($/km)"
            type="number"
            step="0.01"
            defaultValue={property?.freight_cost_per_km ?? 3}
          />
        </div>
      </section>

      {/* Notes */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Notes</h3>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={property?.notes ?? ""}
          placeholder="Any additional notes about this property..."
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5"
        />
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
