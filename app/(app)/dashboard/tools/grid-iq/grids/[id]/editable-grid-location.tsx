"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Loader2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// OpenStreetMap Nominatim search result shape (subset we use).
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}

async function geocodeAddress(query: string): Promise<NominatimResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("countrycodes", "au");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("q", query);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  return (await res.json()) as NominatimResult[];
}

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

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const skipNextSearch = useRef(false);

  // Debounced search as user types the address. Skips when the user just
  // picked a suggestion (so selecting doesn't re-trigger a search).
  useEffect(() => {
    if (!isEditing) return;
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const trimmed = location.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setHasSearched(false);
      return;
    }
    const handle = setTimeout(async () => {
      setIsSearching(true);
      try {
        let results = await geocodeAddress(trimmed);
        if (results.length === 0 && trimmed.includes(",")) {
          const relaxed = trimmed.split(",").slice(1).join(",").trim();
          if (relaxed.length >= 3) results = await geocodeAddress(relaxed);
        }
        setSuggestions(results);
        setShowSuggestions(true);
        setHasSearched(true);
      } catch {
        setSuggestions([]);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [location, isEditing]);

  const handleSelectSuggestion = (s: NominatimResult) => {
    skipNextSearch.current = true;
    setLocation(s.display_name);
    setLatitude(parseFloat(s.lat).toFixed(5));
    setLongitude(parseFloat(s.lon).toFixed(5));
    setSuggestions([]);
    setShowSuggestions(false);
  };

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
            <MapPin className="h-4 w-4 text-teal-400" />
            <p className="text-sm font-semibold text-teal-400">
              Processor Location
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-teal-400"
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
                No coordinates set. Freight to processor shows as $0 until you
                add latitude and longitude.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <label className="mb-1 block text-[11px] text-text-muted">
                Address (type to search, pick a result to auto-fill coords)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g. 123 Example Road, Dinmore QLD 4303"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-muted focus:border-teal-400/50 focus:outline-none focus:ring-1 focus:ring-teal-400/25"
                disabled={isSaving}
                autoComplete="off"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-[30px] h-4 w-4 animate-spin text-text-muted" />
              )}
              {showSuggestions && !isSearching && hasSearched && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a] shadow-xl">
                  {suggestions.length > 0 ? (
                    suggestions.map((s) => (
                      <button
                        key={s.place_id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectSuggestion(s)}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.05]"
                      >
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
                        <span className="text-xs text-text-primary">
                          {s.display_name}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2.5 text-xs text-text-muted">
                      No matches on OpenStreetMap. Try a shorter query
                      (suburb + state + postcode) or paste coordinates from
                      Google Maps.
                    </div>
                  )}
                </div>
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
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-teal-400/50 focus:outline-none focus:ring-1 focus:ring-teal-400/25"
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
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-teal-400/50 focus:outline-none focus:ring-1 focus:ring-teal-400/25"
                  disabled={isSaving}
                />
              </div>
            </div>

            <p className="text-[11px] text-text-muted">
              Type the address above and pick a result to auto-fill the
              coordinates. If the address is not found, you can paste
              coordinates from Google Maps directly (right-click the pin, the
              first line of the context menu is latitude, longitude).
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
                variant="teal"
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
