"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
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
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
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

      {/* Notes */}
      <section>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">Notes</h3>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={property?.notes ?? ""}
          placeholder="Any additional notes about this property..."
          className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all ring-1 ring-inset ring-white/10 focus:ring-brand/60 focus:bg-white/8"
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
