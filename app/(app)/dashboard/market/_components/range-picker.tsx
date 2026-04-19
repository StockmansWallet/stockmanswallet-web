"use client";

import { useEffect, useRef, useState } from "react";

export type RangeKey = "1M" | "3M" | "6M" | "1Y" | "2Y" | "All" | "Custom";

export const RANGE_DAYS: Record<Exclude<RangeKey, "All" | "Custom">, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "2Y": 730,
};

const PRESETS: RangeKey[] = ["1M", "3M", "6M", "1Y", "2Y", "All"];

export interface RangeValue {
  key: RangeKey;
  startISO?: string;
  endISO?: string;
}

interface RangePickerProps {
  value: RangeValue;
  onChange: (v: RangeValue) => void;
}

export function RangePicker({ value, onChange }: RangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [start, setStart] = useState(value.startISO ?? "");
  const [end, setEnd] = useState(value.endISO ?? "");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCustom) return;
    function onClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showCustom]);

  return (
    <div className="relative inline-flex items-center gap-1 rounded-full bg-surface p-1">
      {PRESETS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange({ key: k })}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value.key === k
              ? "bg-brand text-white"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setShowCustom((v) => !v)}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          value.key === "Custom"
            ? "bg-brand text-white"
            : "text-text-muted hover:text-text-primary"
        }`}
      >
        Custom
      </button>

      {showCustom && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-72 rounded-xl bg-surface-lowest p-4 shadow-xl ring-1 ring-white/10"
        >
          <p className="mb-3 text-xs font-medium text-text-secondary">Custom range</p>
          <div className="space-y-2.5">
            <label className="block text-[11px] text-text-muted">
              From
              <input
                type="date"
                value={start}
                max={end || undefined}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-white/5 focus:ring-brand"
              />
            </label>
            <label className="block text-[11px] text-text-muted">
              To
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-white/5 focus:ring-brand"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setStart("");
                setEnd("");
              }}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={!start || !end}
              onClick={() => {
                onChange({ key: "Custom", startISO: start, endISO: end });
                setShowCustom(false);
              }}
              className="rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function sliceToRange<T extends { week_date: string }>(
  points: T[],
  value: RangeValue
): T[] {
  if (points.length === 0) return points;
  if (value.key === "All") return points;

  if (value.key === "Custom") {
    if (!value.startISO && !value.endISO) return points;
    return points.filter((p) => {
      if (value.startISO && p.week_date < value.startISO) return false;
      if (value.endISO && p.week_date > value.endISO) return false;
      return true;
    });
  }

  const days = RANGE_DAYS[value.key];
  const latestISO = points[points.length - 1].week_date;
  const cutoff = new Date(latestISO + "T12:00:00");
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  return points.filter((p) => p.week_date >= cutoffISO);
}
