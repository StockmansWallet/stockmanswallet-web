"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import type { OnboardingProperty } from "@/app/onboarding/actions";
import AddressAutocomplete, {
  type AddressResult,
} from "@/components/app/address-autocomplete";

export function StepProperty({
  displayName,
  property,
  onDisplayNameChange,
  onPropertyChange,
}: {
  displayName: string;
  property: OnboardingProperty;
  onDisplayNameChange: (v: string) => void;
  onPropertyChange: (patch: Partial<OnboardingProperty>) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  function handleAddressSelect(result: AddressResult) {
    onPropertyChange({
      address: result.address,
      suburb: result.suburb,
      state: result.state,
      postcode: result.postcode,
      latitude: result.latitude,
      longitude: result.longitude,
    });
  }

  const locationLine = [property.suburb, property.state, property.postcode]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Your property
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-white/60">
          Tell us where you run your livestock. We&apos;ll use this to default
          your saleyards and freight estimates.
        </p>
      </div>

      <div className="space-y-3.5">
        {/* Your Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="displayName"
            className="block text-xs font-medium tracking-wide text-white/72"
          >
            Your name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="e.g. Leon Ernst"
            autoCapitalize="words"
            className="focus:border-brand/70 focus:ring-brand/20 h-11 w-full rounded-full border border-white/10 bg-white/10 px-5 text-base text-white outline-none transition-colors placeholder:text-white/35 focus:bg-white/12 focus:ring-2"
          />
        </div>

        {/* Property Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="propertyName"
            className="block text-xs font-medium tracking-wide text-white/72"
          >
            Property name
          </label>
          <input
            id="propertyName"
            type="text"
            value={property.name}
            onChange={(e) => onPropertyChange({ name: e.target.value })}
            placeholder="e.g. Willow Creek Station"
            autoCapitalize="words"
            className="focus:border-brand/70 focus:ring-brand/20 h-11 w-full rounded-full border border-white/10 bg-white/10 px-5 text-base text-white outline-none transition-colors placeholder:text-white/35 focus:bg-white/12 focus:ring-2"
          />
        </div>

        {/* Address (autocomplete fills suburb/state/postcode silently) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium tracking-wide text-white/72">
            Property address
          </label>
          <AddressAutocomplete
            variant="pill"
            onSelect={handleAddressSelect}
            placeholder="Start typing an address..."
          />
          {/* Only show the resolved-location chip after a real address pick
              (signalled by a populated suburb). Without this guard the chip
              shows just "QLD" from the default state value. */}
          {property.suburb && locationLine && (
            <p className="flex items-center gap-1.5 pl-1 pt-0.5 text-xs text-white/55">
              <MapPin className="h-3 w-3 text-brand" />
              {locationLine}
            </p>
          )}
        </div>

        {/* Optional details expander */}
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          {detailsOpen ? "Hide details" : "Add property details (optional)"}
          {detailsOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {detailsOpen && (
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="space-y-1.5">
              <label
                htmlFor="pic"
                className="block text-xs font-medium tracking-wide text-white/72"
              >
                PIC number
              </label>
              <input
                id="pic"
                type="text"
                value={property.pic ?? ""}
                onChange={(e) =>
                  onPropertyChange({ pic: e.target.value.toUpperCase() })
                }
                placeholder="QABC1234"
                className="focus:border-brand/70 focus:ring-brand/20 h-10 w-full rounded-full border border-white/10 bg-white/10 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:bg-white/12 focus:ring-2"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="size"
                className="block text-xs font-medium tracking-wide text-white/72"
              >
                Size
              </label>
              <div className="flex gap-1.5">
                <input
                  id="size"
                  type="number"
                  value={property.size ?? ""}
                  onChange={(e) =>
                    onPropertyChange({
                      size: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="0"
                  className="focus:border-brand/70 focus:ring-brand/20 h-10 w-full rounded-full border border-white/10 bg-white/10 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:bg-white/12 focus:ring-2"
                />
                <div className="flex flex-shrink-0 overflow-hidden rounded-full border border-white/10">
                  <button
                    type="button"
                    onClick={() => onPropertyChange({ sizeUnit: "ac" })}
                    className={`px-3 text-xs font-medium transition-colors ${
                      (property.sizeUnit ?? "ac") === "ac"
                        ? "bg-brand text-white"
                        : "bg-white/5 text-white/60 hover:text-white"
                    }`}
                  >
                    ac
                  </button>
                  <button
                    type="button"
                    onClick={() => onPropertyChange({ sizeUnit: "ha" })}
                    className={`px-3 text-xs font-medium transition-colors ${
                      property.sizeUnit === "ha"
                        ? "bg-brand text-white"
                        : "bg-white/5 text-white/60 hover:text-white"
                    }`}
                  >
                    ha
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-white/45">
        You can add more properties and refine details later in Settings.
      </p>
    </div>
  );
}
