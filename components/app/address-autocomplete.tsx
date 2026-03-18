"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

// Australian state name to code mapping
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

export interface AddressResult {
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteProps {
  defaultValue?: string;
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

let googleLoaded = false;
let loaderPromise: Promise<void> | null = null;

function ensureGoogleLoaded(): Promise<void> {
  if (googleLoaded) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  if (typeof window === "undefined") return Promise.reject();

  // Check if already loaded by another script
  if (window.google?.maps?.places) {
    googleLoaded = true;
    return Promise.resolve();
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set");
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

export default function AddressAutocomplete({
  defaultValue = "",
  onSelect,
  placeholder = "Start typing an address...",
  className = "",
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [value, setValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    ensureGoogleLoaded()
      .then(() => setLoaded(true))
      .catch(() => console.error("Failed to load Google Maps"));
  }, []);

  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "au" },
      types: ["address"],
      fields: ["address_components", "geometry", "formatted_address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location || !place.address_components) return;

      let streetNumber = "";
      let route = "";
      let suburb = "";
      let state = "";
      let postcode = "";

      for (const component of place.address_components) {
        const type = component.types[0];
        if (type === "street_number") streetNumber = component.long_name;
        if (type === "route") route = component.long_name;
        if (type === "locality" || type === "sublocality_level_1") suburb = component.long_name;
        if (type === "administrative_area_level_1") state = STATE_MAP[component.long_name] || component.short_name;
        if (type === "postal_code") postcode = component.long_name;
      }

      const address = streetNumber ? `${streetNumber} ${route}` : route;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      setValue(place.formatted_address || address);

      onSelectRef.current({
        address,
        suburb,
        state,
        postcode,
        latitude: lat,
        longitude: lng,
      });
    });

    autocompleteRef.current = autocomplete;
  }, [loaded]);

  // Sync external defaultValue changes
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <MapPin className="h-4 w-4 text-text-muted" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={loaded ? placeholder : "Loading address search..."}
        disabled={!loaded}
        className={`w-full rounded-lg border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50 ${className}`}
      />
    </div>
  );
}
