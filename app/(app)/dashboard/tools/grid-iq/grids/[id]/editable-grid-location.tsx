"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Loader2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddressAutocomplete from "@/components/app/address-autocomplete";

interface Props {
  gridId: string;
  initialLocation: string | null;
  initialLatitude: number | null;
  initialLongitude: number | null;
}

export function EditableGridLocation({
  gridId,
  initialLocation,
  initialLatitude,
  initialLongitude,
}: Props) {
  const router = useRouter();
  const [location, setLocation] = useState(initialLocation ?? "");
  const [latitude, setLatitude] = useState<string>(
    initialLatitude != null ? String(initialLatitude) : ""
  );
  const [longitude, setLongitude] = useState<string>(
    initialLongitude != null ? String(initialLongitude) : ""
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCoords = latitude.trim() !== "" && longitude.trim() !== "";
  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);
  const coordsValid =
    !hasCoords ||
    (!isNaN(latNum) &&
      !isNaN(lonNum) &&
      latNum >= -90 &&
      latNum <= 90 &&
      lonNum >= -180 &&
      lonNum <= 180);

  const handleAddressPick = (result: {
    address: string;
    suburb: string;
    state: string;
    postcode: string;
    latitude: number;
    longitude: number;
    formattedAddress?: string;
  }) => {
    const display =
      result.formattedAddress ||
      [result.address, result.suburb, result.state, result.postcode]
        .filter(Boolean)
        .join(", ");
    setLocation(display);
    setLatitude(result.latitude.toFixed(5));
    setLongitude(result.longitude.toFixed(5));
  };

  const handleSave = async () => {
    if (!coordsValid) {
      setError("Latitude must be between -90 and 90; longitude between -180 and 180.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("processor_grids")
        .update({
          location: location.trim() || null,
          location_latitude: hasCoords ? latNum : null,
          location_longitude: hasCoords ? lonNum : null,
        })
        .eq("id", gridId);

      if (updateError) throw updateError;
      setIsEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-400" />
            <p className="text-sm font-semibold text-indigo-400">
              Processor Location
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-text-secondary transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-indigo-400"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>

        {!isEditing ? (
          <div className="space-y-1.5">
            {location ? (
              <p className="text-sm text-text-primary">{location}</p>
            ) : (
              <p className="text-sm italic text-text-muted">
                No address set.
              </p>
            )}
            {initialLatitude != null && initialLongitude != null ? (
              <p className="font-mono text-xs text-text-secondary">
                {initialLatitude.toFixed(5)}, {initialLongitude.toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-amber-400">
                No coordinates set. Freight to processor shows as $0 until
                you add latitude and longitude.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] text-text-muted">
                Address or Business Name
              </label>
              <AddressAutocomplete
                defaultValue={location}
                onSelect={handleAddressPick}
                placeholder="Start typing an address or business name..."
                searchTypes={[]}
              />
              {location && (
                <p className="mt-1 text-[11px] text-text-muted">
                  Saved: {location}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] text-text-muted">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-27.59842"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/25"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-text-muted">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="152.86914"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/25"
                  disabled={isSaving}
                />
              </div>
            </div>

            <p className="text-[11px] text-text-muted">
              Pick a search result above to auto-fill coordinates. For
              addresses Google does not know, paste lat/lng manually
              (right-click the pin in Google Maps).
            </p>

            {error && (
              <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
                onClick={() => {
                  setLocation(initialLocation ?? "");
                  setLatitude(
                    initialLatitude != null ? String(initialLatitude) : ""
                  );
                  setLongitude(
                    initialLongitude != null ? String(initialLongitude) : ""
                  );
                  setError(null);
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                variant="indigo"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !coordsValid}
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
