"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown } from "lucide-react";

// MARK: - Date Presets

const DATE_PRESETS = [
  { label: "1M", value: "1m", months: 1 },
  { label: "3M", value: "3m", months: 3 },
  { label: "6M", value: "6m", months: 6 },
  { label: "1Y", value: "1y", months: 12 },
] as const;

function getPresetDates(months: number) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

// MARK: - Props

interface ReportFiltersProps {
  properties: { id: string; property_name: string }[];
  showPropertyFilter?: boolean;
}

// MARK: - Component

export function ReportFilters({ properties, showPropertyFilter = true }: ReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPreset = searchParams.get("range") ?? "1y";
  const currentProperties = searchParams.get("properties")?.split(",").filter(Boolean) ?? [];

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handlePresetChange = (preset: string) => {
    const match = DATE_PRESETS.find((p) => p.value === preset);
    if (!match) return;
    const dates = getPresetDates(match.months);
    updateParams({ range: preset, start: dates.start, end: dates.end });
  };

  const handlePropertyToggle = (propertyId: string) => {
    const current = new Set(currentProperties);
    if (current.has(propertyId)) {
      current.delete(propertyId);
    } else {
      current.add(propertyId);
    }
    const value = [...current].join(",");
    updateParams({ properties: value || null });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date range presets */}
      <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-0.5">
        <Calendar className="ml-2 h-3.5 w-3.5 text-text-muted" />
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetChange(preset.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              currentPreset === preset.value
                ? "bg-amber-500/20 text-amber-400"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Property filter */}
      {showPropertyFilter && properties.length > 1 && (
        <div className="relative">
          <PropertyDropdown
            properties={properties}
            selected={currentProperties}
            onToggle={handlePropertyToggle}
            onClear={() => updateParams({ properties: null })}
          />
        </div>
      )}
    </div>
  );
}

// MARK: - Property Dropdown

function PropertyDropdown({
  properties,
  selected,
  onToggle,
  onClear,
}: {
  properties: { id: string; property_name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const label =
    selected.length === 0
      ? "All Properties"
      : selected.length === 1
        ? properties.find((p) => p.id === selected[0])?.property_name ?? "1 Property"
        : `${selected.length} Properties`;

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.07]">
        {label}
        <ChevronDown className="h-3 w-3 text-text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute z-20 mt-1 w-56 rounded-xl border border-white/10 bg-surface-secondary p-1 shadow-lg">
        {selected.length > 0 && (
          <button
            onClick={onClear}
            className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-amber-400 hover:bg-white/[0.04]"
          >
            Clear filter
          </button>
        )}
        {properties.map((prop) => (
          <button
            key={prop.id}
            onClick={() => onToggle(prop.id)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-text-secondary hover:bg-white/[0.04]"
          >
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                selected.includes(prop.id)
                  ? "border-amber-400 bg-amber-500/20"
                  : "border-white/20"
              }`}
            >
              {selected.includes(prop.id) && (
                <svg className="h-2.5 w-2.5 text-amber-400" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {prop.property_name}
          </button>
        ))}
      </div>
    </details>
  );
}

// MARK: - Helper to parse config from searchParams

export function parseReportConfig(searchParams: { [key: string]: string | string[] | undefined }): {
  startDate: string;
  endDate: string;
  selectedPropertyIds: string[];
} {
  const range = (searchParams.range as string) ?? "1y";
  const preset = DATE_PRESETS.find((p) => p.value === range);
  const defaultDates = getPresetDates(preset?.months ?? 12);

  return {
    startDate: (searchParams.start as string) ?? defaultDates.start,
    endDate: (searchParams.end as string) ?? defaultDates.end,
    selectedPropertyIds: ((searchParams.properties as string) ?? "").split(",").filter(Boolean),
  };
}
