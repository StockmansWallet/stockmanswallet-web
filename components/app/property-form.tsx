"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddressAutocomplete, { type AddressResult } from "@/components/app/address-autocomplete";
import PropertyMapPicker, { type PinResult } from "@/components/app/property-map-picker";
import { Home, MapPin, FileText, Star, Search, Pin, ChevronRight } from "lucide-react";

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
  /** When true, renders the bottom actions as a rounded-full pill bar. */
  actionBarLayout?: boolean;
  /** Whether the user has any other non-deleted properties. Controls whether the primary toggle is shown. */
  hasOtherProperties?: boolean;
}

export function PropertyForm({
  property,
  action,
  submitLabel,
  cancelHref,
  deleteButton,
  actionBarLayout,
  hasOtherProperties,
}: PropertyFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suburb, setSuburb] = useState(property?.suburb ?? "");
  const [state, setState] = useState(property?.state ?? "");
  const [postcode, setPostcode] = useState(property?.postcode ?? "");
  const [lga, setLga] = useState(property?.lga ?? "");
  const [address, setAddress] = useState(property?.address ?? "");
  const [accessRoad, setAccessRoad] = useState(property?.access_road ?? "");
  const [latitude, setLatitude] = useState<number | "">(
    property?.latitude ?? "",
  );
  const [longitude, setLongitude] = useState<number | "">(
    property?.longitude ?? "",
  );
  const [locationSource, setLocationSource] = useState<"geocoded" | "pin_dropped">(
    property?.location_source ?? "geocoded",
  );
  const [locationMode, setLocationMode] = useState<"search" | "pin">(
    property?.location_source === "pin_dropped" ? "pin" : "search",
  );
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

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
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((coords.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        return { name, dist: R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) };
      })
      .sort((a, b) => a.dist - b.dist);

    const closest = sorted[0];
    const stateLabel = AU_STATES.find((s) => s.value === state)?.label ?? state;
    const groups = [
      { header: "Suggested", options: [{ value: closest.name, label: closest.name }] },
      {
        header: `${stateLabel} Local Government Areas`,
        options: lgas.map((c) => ({ value: c, label: c })),
      },
    ];

    return { lgaGroups: groups, lgaFlat: flat };
  }, [state, latitude, longitude]);

  function handleAddressSelect(result: AddressResult) {
    setAddress(result.address);
    setAccessRoad("");
    if (result.suburb) setSuburb(result.suburb);
    if (result.state) setState(result.state);
    if (result.postcode) setPostcode(result.postcode);
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setLocationSource("geocoded");
  }

  function handlePinResult(result: PinResult) {
    // Pin-drop overrides any prior geocoded street address; coord becomes the
    // source of truth. Reverse-geocoded admin fields fill blanks but never
    // overwrite values the user already typed.
    setAddress("");
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setLocationSource("pin_dropped");
    if (result.state) setState(result.state);
    if (result.suburb && !suburb) setSuburb(result.suburb);
    if (result.postcode && !postcode) setPostcode(result.postcode);
    if (result.lga && !lga) setLga(result.lga);
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
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        typeof (err as { digest: unknown }).digest === "string" &&
        (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
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
        <div className="border-error/40 bg-error/10 text-error rounded-xl border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Property Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="bg-brand/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
              <Home className="text-brand h-3.5 w-3.5" />
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
              labelSuffix="Property Identification Code"
              defaultValue={property?.property_pic ?? ""}
              placeholder="e.g. QABC1234"
            />
            <Input
              id="region"
              name="region"
              label="Region"
              defaultValue={property?.region ?? ""}
              placeholder="e.g. Central Queensland"
            />
            <Input
              id="property_type"
              name="property_type"
              label="Property Type"
              defaultValue={property?.property_type ?? ""}
              placeholder="e.g. Grazing, Mixed Farming"
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
          </div>
        </CardContent>
      </Card>

      {/* Location & Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="bg-success/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
              <MapPin className="text-success h-3.5 w-3.5" />
            </div>
            <CardTitle>Location</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {/* Mode tabs */}
          <div className="bg-surface-lowest mb-4 flex items-center gap-1 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setLocationMode("search")}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                locationMode === "search"
                  ? "bg-brand text-white"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              Search Address
            </button>
            <button
              type="button"
              onClick={() => {
                setLocationMode("pin");
                if (latitude === "" || longitude === "") setMapPickerOpen(true);
              }}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                locationMode === "pin"
                  ? "bg-brand text-white"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Pin className="h-3.5 w-3.5" />
              Drop a Pin
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {locationMode === "search" ? (
              <div className="sm:col-span-2">
                <label
                  htmlFor="address"
                  className="text-text-secondary mb-1.5 block text-sm font-medium"
                >
                  Property Address
                </label>
                <AddressAutocomplete
                  defaultValue={address}
                  onSelect={handleAddressSelect}
                  placeholder="Start typing a property address..."
                />
                <input type="hidden" name="address" value={address} />
              </div>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <label className="text-text-secondary mb-1.5 block text-sm font-medium">
                    Property Pin
                  </label>
                  <button
                    type="button"
                    onClick={() => setMapPickerOpen(true)}
                    className="hover:bg-surface-raised flex w-full items-center gap-3 rounded-xl bg-white/5 px-4 py-3 text-left transition-colors"
                  >
                    <MapPin
                      className={`h-4 w-4 shrink-0 ${latitude === "" ? "text-text-muted" : "text-success"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-text-primary text-sm font-medium">
                        {latitude === "" || longitude === ""
                          ? "Drop a Pin on Your Property"
                          : "Pin Placed"}
                      </div>
                      {latitude !== "" && longitude !== "" && (
                        <div className="text-text-muted text-xs tabular-nums">
                          {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="text-text-muted h-4 w-4 shrink-0" />
                  </button>
                  {/* Preserve any prior address; handlePinResult clears it when the user actively drops a new pin. */}
                  <input type="hidden" name="address" value={address} />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    id="access_road"
                    name="access_road"
                    label="Access Road"
                    labelSuffix="recommended"
                    value={accessRoad}
                    onChange={(e) => setAccessRoad(e.target.value)}
                    placeholder="e.g. Mirambeena Road"
                  />
                </div>
              </>
            )}
            {locationMode === "search" && (
              <input type="hidden" name="access_road" value={accessRoad} />
            )}
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
            <Select
              id="lga"
              name="lga"
              label="Local Government Area"
              options={lgaFlat}
              groups={lgaGroups}
              custom={!!lgaGroups}
              placeholder={state ? "Select Local Government Area" : "Enter address first"}
              disabled={!state}
              value={lga}
              onChange={(e) => setLga(e.target.value)}
            />
            {/* Coordinates: hidden inputs always submitted; visible badge when set */}
            <input type="hidden" name="latitude" value={latitude} />
            <input type="hidden" name="longitude" value={longitude} />
            <input type="hidden" name="location_source" value={locationSource} />
            {latitude !== "" && longitude !== "" && locationMode === "search" && (
              <div>
                <label className="text-text-secondary mb-1.5 block text-sm font-medium">
                  GPS Coordinates
                </label>
                <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-4 py-3">
                  <MapPin className="text-success h-4 w-4 shrink-0" />
                  <span className="text-text-primary text-sm tabular-nums">
                    {Number(latitude).toFixed(4)}° S, {Number(longitude).toFixed(4)}° E
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <PropertyMapPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={handlePinResult}
        initialLatitude={typeof latitude === "number" ? latitude : null}
        initialLongitude={typeof longitude === "number" ? longitude : null}
      />

      {/* Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="bg-warning/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
              <FileText className="text-warning h-3.5 w-3.5" />
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
            className="text-text-primary placeholder:text-text-muted focus:ring-brand/60 w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-white/10 transition-all outline-none ring-inset focus:bg-white/8"
          />
        </CardContent>
      </Card>

      {/* Primary Property */}
      {/* Hidden when this row is already primary (only way to demote is to promote another) */}
      {/* Hidden on first-property creation since the server auto-promotes */}
      {!property?.is_default && (property || hasOtherProperties) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-brand/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                <Star className="text-brand h-3.5 w-3.5" />
              </div>
              <CardTitle>Primary Property</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <Switch
              id="is_primary"
              name="is_primary"
              label="Set as primary property"
              description="The primary property is used as the default for new herds. Setting this on will replace your current primary."
              color="brand"
            />
          </CardContent>
        </Card>
      )}
      {property?.is_default && (
        <Card>
          <CardContent className="flex items-center gap-2.5 px-5 py-4">
            <Star className="text-brand h-4 w-4 shrink-0" />
            <p className="text-text-secondary text-sm">
              This is your primary property. To change it, edit a different property and set it as primary.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {actionBarLayout ? (
        <div className="bg-surface-lowest flex items-center justify-between rounded-full px-2 py-2">
          <div className="flex items-center gap-1.5 pl-1">{deleteButton}</div>
          <div className="flex items-center gap-1.5">
            <Link
              href={cancelHref ?? "/dashboard/properties"}
              className="bg-surface-lowest text-text-muted hover:bg-surface-raised hover:text-text-secondary inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-xs font-medium transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand hover:bg-brand-dark inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-xs font-medium text-white transition-all disabled:opacity-50"
            >
              {submitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 pt-2">
          {deleteButton}
          <div className="ml-auto flex items-center gap-3">
            <Link href={cancelHref ?? "/dashboard/properties"}>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : submitLabel}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
