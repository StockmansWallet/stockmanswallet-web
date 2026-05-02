"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { MapPin } from "lucide-react";

// Australian state name to code mapping
const STATE_MAP: Record<string, string> = {
  "New South Wales": "NSW",
  Victoria: "VIC",
  Queensland: "QLD",
  "South Australia": "SA",
  "Western Australia": "WA",
  Tasmania: "TAS",
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
  // Populated when available. formattedAddress is the full Google-formatted
  // line; name is the business name when the pick is an establishment.
  formattedAddress?: string;
  name?: string;
}

interface AddressAutocompleteProps {
  defaultValue?: string;
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  // Google Places type filter. "address" matches street addresses only
  // (default, good for properties/farms). Pass ["establishment"] to match
  // businesses by name, or undefined to match both.
  searchTypes?: string[];
  // "default" matches the dashboard form chrome (rounded-lg, compact).
  // "pill" matches the auth/onboarding chrome (h-11 rounded-full, larger
  // text). The icon position adjusts with the variant.
  variant?: "default" | "pill";
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

type Prediction = google.maps.places.AutocompletePrediction;

export default function AddressAutocomplete({
  defaultValue = "",
  onSelect,
  placeholder = "Start typing an address...",
  className = "",
  searchTypes = ["address"],
  variant = "default",
}: AddressAutocompleteProps) {
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const autocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(
    null
  );
  // Session tokens group autocomplete requests + a getDetails call into one
  // billable session. Refresh after each successful selection (per Google's
  // billing guidance).
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [value, setValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [anchorRect, setAnchorRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Mount flag for createPortal (needed for SSR safety)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load Google Maps + initialise services
  useEffect(() => {
    let cancelled = false;
    ensureGoogleLoaded()
      .then(() => {
        if (cancelled || !window.google?.maps?.places) return;
        autocompleteServiceRef.current =
          new google.maps.places.AutocompleteService();
        // PlacesService requires an attached HTMLElement or a Map. A throwaway
        // div works fine for getDetails-only usage.
        placesServiceRef.current = new google.maps.places.PlacesService(
          document.createElement("div")
        );
        sessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
        setLoaded(true);
      })
      .catch(() => {
        // ensureGoogleLoaded already logs; swallow here so the input stays
        // usable without crashing the page.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync external defaultValue changes
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  // Position the dropdown below the input. Tracked on scroll/resize so the
  // floating panel stays glued to the input as the user scrolls inside any
  // scrollable ancestor (true on onboarding where `<main>` scrolls).
  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition() {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setAnchorRect({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
    updatePosition();
    // Capture phase catches scrolls inside ancestors too.
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // Click-outside to dismiss
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        wrapperRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Debounced predictions fetch
  const fetchPredictions = useCallback(
    (input: string) => {
      const service = autocompleteServiceRef.current;
      const token = sessionTokenRef.current;
      if (!service || !token) return;
      const trimmed = input.trim();
      if (trimmed.length < 2) {
        setPredictions([]);
        setActiveIndex(-1);
        return;
      }

      const request: google.maps.places.AutocompletionRequest = {
        input: trimmed,
        componentRestrictions: { country: "au" },
        sessionToken: token,
      };
      // Omit `types` when no specific filter is requested - Google rejects an
      // empty-array `types` field.
      if (searchTypes && searchTypes.length > 0) {
        request.types = searchTypes;
      }

      service.getPlacePredictions(request, (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
          setPredictions([]);
          setActiveIndex(-1);
          return;
        }
        setPredictions(results);
        setActiveIndex(-1);
      });
    },
    [searchTypes]
  );

  // Trigger debounced fetch on value changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchPredictions]);

  function handleSelect(prediction: Prediction) {
    const service = placesServiceRef.current;
    if (!service) return;

    service.getDetails(
      {
        placeId: prediction.place_id,
        fields: [
          "address_components",
          "geometry",
          "formatted_address",
          "name",
        ],
        sessionToken: sessionTokenRef.current ?? undefined,
      },
      (place, status) => {
        // Per Google billing best practice, rotate the session token after a
        // completed selection so the next autocomplete starts a fresh session.
        sessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();

        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !place ||
          !place.geometry?.location ||
          !place.address_components
        ) {
          setOpen(false);
          return;
        }

        let streetNumber = "";
        let route = "";
        let suburb = "";
        let state = "";
        let postcode = "";

        for (const component of place.address_components) {
          const type = component.types[0];
          if (type === "street_number") streetNumber = component.long_name;
          if (type === "route") route = component.long_name;
          if (type === "locality" || type === "sublocality_level_1") {
            suburb = component.long_name;
          }
          if (type === "administrative_area_level_1") {
            state = STATE_MAP[component.long_name] || component.short_name;
          }
          if (type === "postal_code") postcode = component.long_name;
        }

        const address = streetNumber ? `${streetNumber} ${route}` : route;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        setValue(place.formatted_address || address);
        setOpen(false);
        setPredictions([]);

        onSelectRef.current({
          address,
          suburb,
          state,
          postcode,
          latitude: lat,
          longitude: lng,
          formattedAddress: place.formatted_address || undefined,
          name: place.name || undefined,
        });
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || predictions.length === 0) {
      if (e.key === "ArrowDown" && predictions.length > 0) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % predictions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) =>
          i <= 0 ? predictions.length - 1 : i - 1
        );
        break;
      case "Enter":
        if (activeIndex >= 0) {
          e.preventDefault();
          handleSelect(predictions[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  }

  const isPill = variant === "pill";
  const showDropdown =
    open && predictions.length > 0 && anchorRect !== null && mounted;

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 flex items-center ${isPill ? "pl-5" : "pl-3"}`}
      >
        <MapPin
          className={`h-4 w-4 ${isPill ? "text-white/45" : "text-text-muted"}`}
        />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (predictions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={loaded ? placeholder : "Loading address search..."}
        disabled={!loaded}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        className={
          isPill
            ? `focus:border-brand/70 focus:ring-brand/20 h-11 w-full rounded-full border border-white/10 bg-white/10 pl-11 pr-5 text-base text-white outline-none transition-colors placeholder:text-white/35 focus:bg-white/12 focus:ring-2 disabled:opacity-50 ${className}`
            : `w-full rounded-lg border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50 ${className}`
        }
      />

      {showDropdown &&
        createPortal(
          <div
            ref={dropdownRef}
            id={listboxId}
            role="listbox"
            // Same chrome as the app-header profile popup. Rendered as a
            // first-class React element via a body portal so it lives at the
            // top of the layer stack and backdrop-filter actually composites
            // (no Google-injected ancestors trapping it).
            className="fixed z-[100] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-2 shadow-2xl shadow-black/35 backdrop-blur-xl backdrop-saturate-150"
            style={{
              top: anchorRect.top,
              left: anchorRect.left,
              width: anchorRect.width,
            }}
          >
            {predictions.map((p, i) => {
              const main = p.structured_formatting?.main_text ?? p.description;
              const secondary = p.structured_formatting?.secondary_text;
              const matches =
                p.structured_formatting?.main_text_matched_substrings ??
                p.matched_substrings ??
                undefined;
              const isActive = i === activeIndex;
              return (
                <button
                  key={p.place_id}
                  id={`${listboxId}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    // Prevent input blur before the click fires
                    e.preventDefault();
                  }}
                  onClick={() => handleSelect(p)}
                  className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-white/40" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">
                      <HighlightedText text={main} matches={matches} />
                    </p>
                    {secondary && (
                      <p className="truncate text-xs text-white/55">
                        {secondary}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

// Highlights the substrings Google flagged as matching the input. Renders the
// matched runs in brand orange while keeping the surrounding characters in the
// default colour, mirroring the legacy Google widget's `.pac-matched` look.
function HighlightedText({
  text,
  matches,
}: {
  text: string;
  matches?: { length: number; offset: number }[];
}) {
  if (!matches || matches.length === 0) return <>{text}</>;

  const segments: { text: string; matched: boolean }[] = [];
  let cursor = 0;
  // Defensive sort - matched_substrings should already be in order but never
  // assume.
  const sorted = [...matches].sort((a, b) => a.offset - b.offset);
  for (const m of sorted) {
    if (m.offset > cursor) {
      segments.push({ text: text.slice(cursor, m.offset), matched: false });
    }
    segments.push({
      text: text.slice(m.offset, m.offset + m.length),
      matched: true,
    });
    cursor = m.offset + m.length;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.matched ? (
          <span key={i} className="text-brand font-semibold">
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}
