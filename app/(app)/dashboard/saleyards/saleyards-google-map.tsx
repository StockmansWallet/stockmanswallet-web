"use client";

// Google Map for the Saleyards page. Client-only because the Google Maps
// JS API needs `window`. Imported via next/dynamic with ssr:false from the
// parent saleyards-map-view.
//
// Uses @vis.gl/react-google-maps (Google's official React wrapper) - smaller
// bundle and cleaner API than @react-google-maps/api. The same
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY that powers the address autocomplete
// component is reused here.
//
// Markers:
// - Active yard: green circle
// - Stale yard: muted grey circle, lower opacity
// - User's primary property: distinct home pin

import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, Map, InfoWindow, Marker, useMap } from "@vis.gl/react-google-maps";

import type { SaleyardRow } from "./saleyards-map-view";

type EnrichedYard = SaleyardRow & { distanceKm: number | null };

interface Props {
  yards: EnrichedYard[];
  primaryProperty: { name: string; latitude: number | null; longitude: number | null } | null;
  selectedYard: string | null;
  onSelectYard: (name: string) => void;
  formatDataDate: (iso: string | null, days: number | null) => string;
}

// Default centre/zoom only used until the camera controller fits to AU's
// continental bounding box. Once fitBounds runs, those values are overridden.
const AU_CENTRE = { lat: -27, lng: 134 };
const AU_ZOOM = 4;

// Continental Australia bounding box - Cape York up north, Tasmania down
// south, Perth out west, the eastern seaboard out east. fitBounds to this
// fixed box gives a consistent "all of AU, minimum ocean" framing for every
// user regardless of where their yards sit. Pinned numbers (not derived
// from markers) so portfolios with WA-only or NSW-only yards still see the
// full continent at the same zoom.
const AU_BOUNDS = {
  north: -10.5, // Cape York
  south: -43.7, // South of Hobart
  west: 113, // Perth coast
  east: 154, // East coast
};

const DARK_PASTEL_MAP_STYLE: google.maps.MapTypeStyle[] = [
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b8b0a3" }, { saturation: -45 }, { lightness: 2 }],
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [{ visibility: "on" }, { color: "#1b1712" }, { lightness: 4 }],
  },
  {
    featureType: "all",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.fill",
    stylers: [{ color: "#2a241e" }, { saturation: -45 }, { lightness: 6 }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#7c6b55" }, { saturation: -55 }, { lightness: -5 }, { weight: 1.1 }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#3a3d31" }, { saturation: -38 }, { lightness: -6 }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#47513b" }, { saturation: -50 }, { lightness: -8 }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#3f4235" }, { saturation: -55 }, { lightness: -10 }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#5a4a38" }, { saturation: -45 }, { lightness: -8 }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#7a6349" }, { saturation: -50 }, { lightness: -10 }, { weight: 0.2 }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#4a4033" }, { saturation: -55 }, { lightness: -4 }],
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [{ color: "#3d352c" }, { saturation: -55 }, { lightness: -4 }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#3a332b" }, { saturation: -60 }, { lightness: -6 }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#223f45" }, { saturation: -48 }, { lightness: -12 }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8fb1b1" }, { saturation: -40 }, { lightness: -4 }],
  },
];

const CIRCLE_MARKER_PATH = "M 0,0 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0";

// Programmatic camera control. fitBounds to AU's continental bbox on first
// render, then panTo when the parent selects a yard externally (e.g. via
// the list below the map).
function MapCameraController({
  yards,
  selectedYard,
}: {
  yards: EnrichedYard[];
  selectedYard: string | null;
}) {
  const map = useMap();
  const initialFitDone = useRef(false);

  useEffect(() => {
    if (!map || initialFitDone.current) return;
    const bounds = new google.maps.LatLngBounds(
      { lat: AU_BOUNDS.south, lng: AU_BOUNDS.west },
      { lat: AU_BOUNDS.north, lng: AU_BOUNDS.east },
    );
    // Zero padding gives the tightest possible fit of AU within the
    // container; horizontal ocean is unavoidable because the container is
    // wider than AU's bbox aspect, but vertical ocean is minimised.
    map.fitBounds(bounds, 0);
    initialFitDone.current = true;
  }, [map]);

  useEffect(() => {
    if (!map || !selectedYard) return;
    const yard = yards.find((y) => y.name === selectedYard);
    if (yard?.latitude == null || yard?.longitude == null) return;
    map.panTo({ lat: yard.latitude, lng: yard.longitude });
    if ((map.getZoom() ?? 0) < 7) map.setZoom(7);
  }, [map, selectedYard, yards]);

  return null;
}

export default function SaleyardsGoogleMap({
  yards,
  primaryProperty,
  selectedYard,
  onSelectYard,
  formatDataDate,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Track which marker has its info window open. Driven by the parent's
  // selectedYard so list-row clicks open the info window too. Clicking a
  // marker on the map updates parent state via onSelectYard.
  const [infoOpenFor, setInfoOpenFor] = useState<string | null>(null);

  // Sync info-window state with external selection.
  useEffect(() => {
    setInfoOpenFor(selectedYard);
  }, [selectedYard]);

  const selectedYardData = useMemo(
    () => (infoOpenFor ? yards.find((y) => y.name === infoOpenFor) : null),
    [infoOpenFor, yards],
  );

  if (!apiKey) {
    return (
      <div className="bg-surface-lowest text-text-muted flex h-[38vh] min-h-[300px] w-full items-center justify-center rounded-2xl px-6 text-center text-sm">
        Google Maps API key is missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local to render the map.
      </div>
    );
  }

  return (
    <div className="relative h-[38vh] min-h-[300px] w-full overflow-hidden rounded-2xl">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={AU_CENTRE}
          defaultZoom={AU_ZOOM}
          backgroundColor="#223f45"
          styles={DARK_PASTEL_MAP_STYLE}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          style={{ width: "100%", height: "100%" }}
        >
          <MapCameraController yards={yards} selectedYard={selectedYard} />

          {yards.map((y) =>
            y.latitude != null && y.longitude != null ? (
              <Marker
                key={y.name}
                position={{ lat: y.latitude, lng: y.longitude }}
                title={`${y.name}${y.isStale ? " (stale)" : ""}`}
                icon={{
                  path: CIRCLE_MARKER_PATH,
                  fillColor: y.isStale ? "#a1a1aa" : "#22c55e",
                  fillOpacity: y.isStale ? 0.7 : 1,
                  strokeColor: y.isStale ? "#71717a" : "#15803d",
                  strokeOpacity: 1,
                  strokeWeight: selectedYard === y.name ? 3 : 2,
                  scale: selectedYard === y.name ? 1.12 : 0.88,
                }}
                onClick={() => {
                  onSelectYard(y.name);
                  setInfoOpenFor(y.name);
                }}
              />
            ) : null,
          )}

          {primaryProperty?.latitude != null && primaryProperty.longitude != null && (
            <Marker
              position={{ lat: primaryProperty.latitude, lng: primaryProperty.longitude }}
              title={primaryProperty.name}
              label={{
                text: "⌂",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "700",
              }}
              icon={{
                path: CIRCLE_MARKER_PATH,
                fillColor: "#f59e0b",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeOpacity: 1,
                strokeWeight: 3,
                scale: 1.55,
              }}
              onClick={() => setInfoOpenFor("__primary__")}
            />
          )}

          {/* Yard info window. headerDisabled removes the default 48px
              chrome row that hosts the close button - clicking the map or
              another marker closes the popup, the X is just visual noise. */}
          {selectedYardData && selectedYardData.latitude != null && selectedYardData.longitude != null && (
            <InfoWindow
              position={{ lat: selectedYardData.latitude, lng: selectedYardData.longitude }}
              onCloseClick={() => setInfoOpenFor(null)}
              pixelOffset={[0, -12]}
              headerDisabled={true}
            >
              <div className="min-w-[220px] text-zinc-900">
                <p className="font-semibold">{selectedYardData.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {selectedYardData.locality ?? selectedYardData.streetAddress ?? selectedYardData.state}
                </p>
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-500">Last MLA report</dt>
                    <dd className="text-zinc-900">
                      {formatDataDate(selectedYardData.lastDataDate, selectedYardData.daysSinceLast)}
                    </dd>
                  </div>
                  {selectedYardData.distanceKm != null && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-500">Distance</dt>
                      <dd className="text-zinc-900">
                        {Math.round(selectedYardData.distanceKm)} km from{" "}
                        {primaryProperty?.name ?? "your property"}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-500">State</dt>
                    <dd className="text-zinc-900">{selectedYardData.state}</dd>
                  </div>
                </dl>
                {selectedYardData.isStale && (
                  <p className="mt-2 rounded-md border-l-2 border-zinc-400 bg-zinc-100 px-2 py-1 text-[11px] leading-snug text-zinc-700">
                    <strong>Stale data.</strong> No fresh MLA report in over a year. This yard
                    will be selectable again once new prices land.
                  </p>
                )}
              </div>
            </InfoWindow>
          )}

          {/* Primary property info window */}
          {infoOpenFor === "__primary__" &&
            primaryProperty?.latitude != null &&
            primaryProperty.longitude != null && (
              <InfoWindow
                position={{ lat: primaryProperty.latitude, lng: primaryProperty.longitude }}
                onCloseClick={() => setInfoOpenFor(null)}
                pixelOffset={[0, -16]}
                headerDisabled={true}
              >
                <div className="text-zinc-900">
                  <p className="font-semibold">{primaryProperty.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Your primary property</p>
                </div>
              </InfoWindow>
            )}
        </Map>
      </APIProvider>
    </div>
  );
}
