"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

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

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function fmtShort(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
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
  const urlStart = searchParams.get("start") ?? "";
  const urlEnd = searchParams.get("end") ?? "";
  const isCustom = currentPreset === "custom";

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

  const handleApplyCustom = (start: string, end: string) => {
    updateParams({ range: "custom", start, end });
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
      <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-0.5">
        <Calendar className="ml-2 h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetChange(preset.value)}
            aria-pressed={currentPreset === preset.value}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              currentPreset === preset.value
                ? "bg-warning/20 text-warning"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <CustomRangeButton
          active={isCustom}
          start={isCustom ? urlStart : ""}
          end={isCustom ? urlEnd : ""}
          onApply={handleApplyCustom}
        />
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

// MARK: - Custom Range Button + Popover

function CustomRangeButton({
  active,
  start,
  end,
  onApply,
}: {
  active: boolean;
  start: string;
  end: string;
  onApply: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync drafts when the URL-backed values change (e.g. a preset overrides them)
  useEffect(() => {
    setDraftStart(start);
    setDraftEnd(end);
  }, [start, end]);

  // Click outside / Escape closes
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      // Ignore pointers inside the DatePicker portal calendar (rendered on document.body)
      const el = target as HTMLElement;
      if (el.closest?.('[role="dialog"][aria-label="Calendar"]')) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const today = todayISO();
  const canApply = Boolean(draftStart && draftEnd && draftStart <= draftEnd && draftEnd <= today);

  function handleApply() {
    if (!canApply) return;
    onApply(draftStart, draftEnd);
    setOpen(false);
  }

  const chipLabel = active && start && end ? `${fmtShort(start)} - ${fmtShort(end)}` : "Custom";

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-pressed={active}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          active
            ? "bg-warning/20 text-warning"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        <span>{chipLabel}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Custom date range"
          className="absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl bg-bg-alt p-4 shadow-2xl ring-1 ring-inset ring-ring-subtle"
        >
          <div className="flex flex-col gap-3">
            <DatePicker
              label="Start date"
              value={draftStart}
              onChange={setDraftStart}
              max={draftEnd || today}
            />
            <DatePicker
              label="End date"
              value={draftEnd}
              onChange={setDraftEnd}
              min={draftStart || undefined}
              max={today}
            />
          </div>
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/10 pt-3">
            <button
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!canApply}
              className="rounded-full bg-warning/20 px-4 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
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
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-white/[0.04] px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.07]">
        {label}
        <ChevronDown className="h-3 w-3 text-text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute z-20 mt-1 w-56 rounded-xl border border-white/10 bg-bg-alt p-1 shadow-lg">
        {selected.length > 0 && (
          <button
            onClick={onClear}
            className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-warning hover:bg-white/[0.04]"
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
                  ? "border-warning bg-warning/20"
                  : "border-white/20"
              }`}
            >
              {selected.includes(prop.id) && (
                <svg className="h-2.5 w-2.5 text-warning" viewBox="0 0 12 12" fill="none">
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
