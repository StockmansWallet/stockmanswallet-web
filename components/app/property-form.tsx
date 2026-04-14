"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddressAutocomplete, { type AddressResult } from "@/components/app/address-autocomplete";
import { Home, MapPin, FileText } from "lucide-react";

import type { Database } from "@/lib/types/database";
import { lgasForState } from "@/lib/data/lga-data";
import { lgaCoord } from "@/lib/data/lga-coordinates";

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
  cancelHref?: string;
  deleteButton?: ReactNode;
}

export function PropertyForm({ property, action, submitLabel, cancelHref, deleteButton }: PropertyFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suburb, setSuburb] = useState(property?.suburb ?? "");
  const [state, setState] = useState(property?.state ?? "");
  const [postcode, setPostcode] = useState(property?.postcode ?? "");
  const [lga, setLga] = useState(property?.lga ?? "");
  const [address, setAddress] = useState(property?.address ?? "");
  const [latitude, setLatitude] = useState(property?.latitude ?? "");
  const [longitude, setLongitude] = useState(property?.longitude ?? "");

  // Sort LGAs by proximity and split into Suggested + All groups
  const { lgaGroups, lgaFlat } = useMemo(() => {
    const lgas = lgasForState(state);
    const flat = lgas.map((c) => ({ value: c, label: c }));

    const lat1 = Number(latitude);
    const lon1 = Number(longitude);
    if (!latitude || !longitude || Number.isNaN(lat1) || Number.isNaN(lon1)) {
      return { lgaGroups: undefined, lgaFlat: flat };
    }

    const R = 6371.0;
    const sorted = lgas
      .map((name) => {
        const coords = lgaCoord(name, state);
        if (!coords) return { name, dist: Infinity };
        const dLat = ((coords.lat - lat1) * Math.PI) / 180;
        const dLon = ((coords.lng - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat1 * Math.PI) / 180) * Math.cos((coords.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        return { name, dist: R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) };
      })
      .sort((a, b) => a.dist - b.dist);

    const closest = sorted[0];
    const stateLabel = AU_STATES.find((s) => s.value === state)?.label ?? state;
    const groups = [
      { header: "Suggested", options: [{ value: closest.name, label: closest.name }] },
      { header: `${stateLabel} Local Government Areas`, options: lgas.map((c) => ({ value: c, label: c })) },
    ];

    return { lgaGroups: groups, lgaFlat: flat };
  }, [state, latitude, longitude]);

  function handleAddressSelect(result: AddressResult) {
    setAddress(result.address);
    if (result.suburb) setSuburb(result.suburb);
    if (result.state) setState(result.state);
    if (result.postcode) setPostcode(result.postcode);
    setLatitude(result.latitude);
    setLongitude(result.longitude);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      // Next.js redirect() throws a special error that must propagate
      if (err && typeof err === "object" && "digest" in err && typeof (err as { digest: unknown }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Property Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
              <Home className="h-3.5 w-3.5 text-brand" />
            </div>
            <CardTitle>Property Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
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
            <Input
              id="region"
              name="region"
              label="Region"
              defaultValue={property?.region ?? ""}
              placeholder="e.g. Central Queensland"
            />
            <Select
              id="lga"
              name="lga"
              label="Local Government Area"
              options={lgaFlat}
              groups={lgaGroups}
              custom={!!lgaGroups}
              placeholder="Select Local Government Area"
              value={lga}
              onChange={(e) => setLga(e.target.value)}
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
        </CardContent>
      </Card>

      {/* Location & Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <CardTitle>Location</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Property Address
              </label>
              <AddressAutocomplete
                defaultValue={property?.address ?? ""}
                onSelect={handleAddressSelect}
                placeholder="Start typing a property address..."
              />
              <input type="hidden" name="address" value={address} />
            </div>
            <Input
              id="suburb"
              name="suburb"
              label="Town / Suburb"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
            />
            <Input
              id="postcode"
              name="postcode"
              label="Postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
            />
            <Select
              id="state"
              name="state"
              label="State"
              required
              options={AU_STATES}
              placeholder="Select state"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setLga("");
              }}
            />
            {/* Coordinates auto-filled from address selection */}
            <input type="hidden" name="latitude" value={latitude} />
            <input type="hidden" name="longitude" value={longitude} />
            {latitude && longitude && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  GPS Coordinates
                </label>
                <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-4 py-3">
                  <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-sm tabular-nums text-text-primary">
                    {Number(latitude).toFixed(4)}° S, {Number(longitude).toFixed(4)}° E
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <CardTitle>Notes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={property?.notes ?? ""}
            placeholder="Any additional notes about this property..."
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all ring-1 ring-inset ring-white/10 focus:ring-brand/60 focus:bg-white/8"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
        <Link href={cancelHref ?? "/dashboard/properties"}>
          <Button type="button" variant="secondary" size="md">
            Cancel
          </Button>
        </Link>
        {deleteButton && (
          <div className="ml-auto">
            {deleteButton}
          </div>
        )}
      </div>
    </form>
  );
}
