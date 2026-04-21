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
      [result.address, result.suburb, result.state, result.postcode].filter(Boolean).join(", ");
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
            <MapPin className="text-grid-iq h-4 w-4" />
            <p className="text-grid-iq text-sm font-semibold">Processor Location</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-text-secondary hover:border-grid-iq/40 hover:bg-grid-iq/10 hover:text-grid-iq inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>

        {!isEditing ? (
          <div className="space-y-1.5">
            {location ? (
              <p className="text-text-primary text-sm">{location}</p>
            ) : (
              <p className="text-text-muted text-sm italic">No address set.</p>
            )}
            {initialLatitude != null && initialLongitude != null ? (
              <p className="text-text-secondary font-mono text-xs">
                {initialLatitude.toFixed(5)}, {initialLongitude.toFixed(5)}
              </p>
            ) : (
              <p className="text-warning text-xs">
                No coordinates set. Freight to processor shows as $0 until you add latitude and
                longitude.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-text-muted mb-1 block text-[11px]">
                Address or Business Name
              </label>
              <AddressAutocomplete
                defaultValue={location}
                onSelect={handleAddressPick}
                placeholder="Start typing an address or business name..."
                searchTypes={[]}
              />
              {location && <p className="text-text-muted mt-1 text-[11px]">Saved: {location}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-text-muted mb-1 block text-[11px]">Latitude</label>
                <input
                  type="number"
                  step="0.00001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-27.59842"
                  className="text-text-primary placeholder:text-text-muted focus:border-grid-iq/50 focus:ring-grid-iq/25 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-none"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="text-text-muted mb-1 block text-[11px]">Longitude</label>
                <input
                  type="number"
                  step="0.00001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="152.86914"
                  className="text-text-primary placeholder:text-text-muted focus:border-grid-iq/50 focus:ring-grid-iq/25 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-none"
                  disabled={isSaving}
                />
              </div>
            </div>

            <p className="text-text-muted text-[11px]">
              Pick a search result above to auto-fill coordinates. For addresses Google does not
              know, paste lat/lng manually (right-click the pin in Google Maps).
            </p>

            {error && (
              <div className="bg-error/10 text-error rounded-lg px-3 py-2 text-xs">{error}</div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
                onClick={() => {
                  setLocation(initialLocation ?? "");
                  setLatitude(initialLatitude != null ? String(initialLatitude) : "");
                  setLongitude(initialLongitude != null ? String(initialLongitude) : "");
                  setError(null);
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                variant="grid-iq"
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
