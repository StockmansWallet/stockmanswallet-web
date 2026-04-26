"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";

// Centre-of-map crosshair pin picker. Used when a property has no fixed
// street address (rural stations identified by access road, e.g. "Lancewood
// Station via Mirambeena Road"). Mirrors the iOS PropertyMapPicker for
// cross-platform UX consistency.

const STATE_MAP: Record<string, string> = {
  "New South Wales": "NSW",
  "Victoria": "VIC",
  "Queensland": "QLD",
  "South Australia": "SA",
  "Western Australia": "WA",
  "Tasmania": "TAS",
  "Northern Territory": "NT",
  "Australian Capital Territory": "ACT",
};

export interface PinResult {
  latitude: number;
  longitude: number;
  suburb?: string;
  state?: string;
  postcode?: string;
  lga?: string;
}

interface PropertyMapPickerProps {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (result: PinResult) => void;
}

let googleLoaded = false;
let loaderPromise: Promise<void> | null = null;

function ensureGoogleLoaded(): Promise<void> {
  if (googleLoaded) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  if (typeof window === "undefined") return Promise.reject();
  if (window.google?.maps?.places) {
    googleLoaded = true;
    return Promise.resolve();
  }
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key not configured"));
  }
  loaderPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

const AUSTRALIA_CENTRE = { lat: -25.2744, lng: 133.7751 };

export default function PropertyMapPicker({
  initialLatitude,
  initialLongitude,
  open,
  onClose,
  onConfirm,
}: PropertyMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number }>(() =>
    initialLatitude && initialLongitude
      ? { lat: initialLatitude, lng: initialLongitude }
      : AUSTRALIA_CENTRE,
  );
  const [resolving, setResolving] = useState(false);

  // Load the Google Maps script
  useEffect(() => {
    if (!open) return;
    ensureGoogleLoaded()
      .then(() => setLoaded(true))
      .catch((e) => console.error("PropertyMapPicker:", e));
  }, [open]);

  // Initialise the map once both the script is loaded and the modal is open
  useEffect(() => {
    if (!open || !loaded || !mapContainerRef.current || mapRef.current) return;

    const startCenter =
      initialLatitude && initialLongitude
        ? { lat: initialLatitude, lng: initialLongitude }
        : AUSTRALIA_CENTRE;
    const startZoom = initialLatitude && initialLongitude ? 14 : 4;

    const map = new google.maps.Map(mapContainerRef.current, {
      center: startCenter,
      zoom: startZoom,
      mapTypeId: google.maps.MapTypeId.HYBRID,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.TOP_RIGHT,
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
      },
      gestureHandling: "greedy",
    });

    map.addListener("idle", () => {
      const c = map.getCenter();
      if (c) setCenter({ lat: c.lat(), lng: c.lng() });
    });

    mapRef.current = map;

    // Wire up the search box to recentre the map on a place
    if (searchInputRef.current && !autocompleteRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: "au" },
        fields: ["geometry"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;
        const loc = place.geometry.location;
        map.setCenter(loc);
        map.setZoom(14);
        setCenter({ lat: loc.lat(), lng: loc.lng() });
      });
      autocompleteRef.current = autocomplete;
    }
  }, [open, loaded, initialLatitude, initialLongitude]);

  // Reset map ref when modal closes so the map re-initialises next open
  useEffect(() => {
    if (!open) {
      mapRef.current = null;
      autocompleteRef.current = null;
    }
  }, [open]);

  async function handleConfirm() {
    if (!loaded || !window.google?.maps) return;
    setResolving(true);

    let suburb: string | undefined;
    let state: string | undefined;
    let postcode: string | undefined;
    let lga: string | undefined;

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: center });
      const components = response.results[0]?.address_components ?? [];
      for (const component of components) {
        const type = component.types[0];
        if (type === "locality" || type === "sublocality_level_1") suburb = component.long_name;
        if (type === "administrative_area_level_1")
          state = STATE_MAP[component.long_name] ?? component.short_name;
        if (type === "postal_code") postcode = component.long_name;
        if (type === "administrative_area_level_2") lga = component.long_name;
      }
    } catch {
      // Reverse-geocode failures are expected for remote AU coords. Coord is
      // still authoritative for freight calcs.
    }

    setResolving(false);
    onConfirm({
      latitude: center.lat,
      longitude: center.lng,
      suburb,
      state,
      postcode,
      lga,
    });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop: dims and blurs the page behind the modal */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel: opaque page-background colour so nothing bleeds through */}
      <div className="bg-background relative flex h-full max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
        {/* Header */}
        <div className="bg-background flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-text-primary text-base font-semibold">Drop a Pin on Your Property</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary rounded-lg p-1.5 transition-colors hover:bg-white/5"
            aria-label="Close map picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="bg-background border-b border-white/10 px-5 py-3">
          <div className="relative">
            <Search className="text-text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={loaded ? "Search a town or area to centre the map" : "Loading map..."}
              disabled={!loaded}
              className="text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:ring-brand-primary w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pr-3 pl-9 text-sm focus:ring-1 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        {/* Map */}
        <div className="relative flex-1">
          <div ref={mapContainerRef} className="h-full w-full" />
          {/* Crosshair pin sits at the visual centre regardless of map state */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center" style={{ transform: "translateY(-12px)" }}>
              <MapPin className="h-9 w-9 fill-red-500 text-red-700 drop-shadow-lg" strokeWidth={1.5} />
              <div className="-mt-1 h-1.5 w-1.5 rounded-full bg-black/60" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background border-t border-white/10 px-5 py-4">
          <p className="text-text-muted mb-3 text-center text-xs tabular-nums">
            Pinned at {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={resolving || !loaded}
            className="bg-brand hover:bg-brand-dark inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          >
            {resolving ? "Resolving..." : "Use This Location"}
          </button>
        </div>
      </div>
    </div>
  );
}
