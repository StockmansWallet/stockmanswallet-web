"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { createProcessor, updateProcessor } from "./actions";
import AddressAutocomplete from "@/components/app/address-autocomplete";

interface ProcessorFormValues {
  id?: string;
  name: string;
  address: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
}

export function ProcessorForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial: ProcessorFormValues;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address ?? "");
  const [latitude, setLatitude] = useState<string>(
    initial.location_latitude != null ? String(initial.location_latitude) : ""
  );
  const [longitude, setLongitude] = useState<string>(
    initial.location_longitude != null ? String(initial.location_longitude) : ""
  );
  const [contactName, setContactName] = useState(initial.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(initial.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(initial.contact_email ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");

  // Callback when user picks from Google Places autocomplete dropdown.
  // Fills address + coords in one go, and name if we're creating a new
  // processor and the user hasn't typed their own name yet.
  const handleAddressPick = (result: {
    address: string;
    suburb: string;
    state: string;
    postcode: string;
    latitude: number;
    longitude: number;
    formattedAddress?: string;
    name?: string;
  }) => {
    const display =
      result.formattedAddress ||
      [result.address, result.suburb, result.state, result.postcode]
        .filter(Boolean)
        .join(", ");
    setAddress(display);
    setLatitude(result.latitude.toFixed(5));
    setLongitude(result.longitude.toFixed(5));
    if (mode === "create" && !name.trim() && result.name) {
      setName(result.name);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("address", address);
    fd.set("location_latitude", latitude);
    fd.set("location_longitude", longitude);
    fd.set("contact_name", contactName);
    fd.set("contact_phone", contactPhone);
    fd.set("contact_email", contactEmail);
    fd.set("notes", notes);

    startTransition(async () => {
      try {
        if (mode === "create") {
          const result = await createProcessor(fd);
          if (result && "error" in result) setError(result.error);
        } else {
          const result = await updateProcessor(initial.id!, fd);
          if (result.error) {
            setError(result.error);
          } else {
            router.refresh();
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  };

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-teal-400/50 focus:outline-none focus:ring-1 focus:ring-teal-400/25";
  const labelCls = "mb-1 block text-[11px] text-text-muted";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <label className={labelCls}>Processor Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. JBS Dinmore"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              Address or Business Name (pick a result to auto-fill coords)
            </label>
            <AddressAutocomplete
              defaultValue={address}
              onSelect={handleAddressPick}
              placeholder="e.g. JBS Dinmore, or 37644 Bruce Highway Riverview"
              searchTypes={[]}
            />
            {address && (
              <p className="mt-1 text-[11px] text-text-muted">
                Saved: {address}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Latitude</label>
              <input
                type="number"
                step="0.00001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-27.59842"
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input
                type="number"
                step="0.00001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="152.86914"
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>
          <p className="text-[11px] text-text-muted">
            Coordinates drive freight calculations. Pick a search result above
            or paste lat/lng from Google Maps.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-xs font-semibold text-text-primary">Contact (optional)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputCls}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <label className={labelCls}>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="Kill days, booking lead time, special requirements..."
          />
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" variant="teal" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          )}
          {mode === "create" ? "Create Processor" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
