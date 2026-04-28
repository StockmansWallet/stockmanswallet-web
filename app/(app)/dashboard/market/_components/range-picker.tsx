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
    <div className="bg-surface relative inline-flex items-center gap-1 rounded-full p-1">
      {PRESETS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange({ key: k })}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value.key === k
              ? "bg-markets text-background/75"
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
            ? "bg-markets text-background/75"
            : "text-text-muted hover:text-text-primary"
        }`}
      >
        Custom
      </button>

      {showCustom && (
        <div
          ref={popoverRef}
          className="absolute top-[calc(100%+8px)] right-0 z-20 w-72 rounded-xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-4 shadow-2xl shadow-black/35 backdrop-blur-xl backdrop-saturate-150"
        >
          <p className="text-text-secondary mb-3 text-xs font-medium">Custom range</p>
          <div className="space-y-2.5">
            <label className="text-text-muted block text-[11px]">
              From
              <input
                type="date"
                value={start}
                max={end || undefined}
                onChange={(e) => setStart(e.target.value)}
                className="bg-surface text-text-primary focus:ring-markets mt-1 w-full rounded-lg px-3 py-2 text-sm ring-1 ring-white/5 outline-none"
              />
            </label>
            <label className="text-text-muted block text-[11px]">
              To
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
                className="bg-surface text-text-primary focus:ring-markets mt-1 w-full rounded-lg px-3 py-2 text-sm ring-1 ring-white/5 outline-none"
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
              className="text-text-muted hover:text-text-primary rounded-full px-3 py-1.5 text-xs font-medium"
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
              className="bg-markets hover:bg-markets-dark rounded-full px-3.5 py-1.5 text-xs font-semibold text-black shadow-sm transition-colors disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function sliceToRange<T extends { week_date: string }>(points: T[], value: RangeValue): T[] {
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
