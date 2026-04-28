"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DatePickerProps {
  id?: string;
  label?: string;
  error?: string;
  value: string; // yyyy-MM-dd or ""
  onChange: (value: string) => void;
  min?: string; // yyyy-MM-dd
  max?: string; // yyyy-MM-dd
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(s: string): string {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const startPad = mondayIndex(firstDay);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DatePicker({
  id,
  label,
  error,
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  // Stable "today" reference - only changes when the date actually changes
  const today = useMemo(() => new Date(), []);

  const selected = parseDate(value);
  const [view, setView] = useState<[number, number]>([
    selected?.getFullYear() ?? today.getFullYear(),
    selected?.getMonth() ?? today.getMonth(),
  ]);
  const viewYear = view[0];
  const viewMonth = view[1];

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const minDate = parseDate(min ?? "");
  const maxDate = parseDate(max ?? "");

  // Position the popover below the trigger (re-measures after render)
  useEffect(() => {
    if (!open || !triggerRef.current) return;

    function updatePosition() {
      const rect = triggerRef.current!.getBoundingClientRect();
      const popoverWidth = 280;
      const popoverHeight = popoverRef.current?.offsetHeight ?? 380;

      let top = rect.bottom + 8;
      let left = rect.left;

      // Keep within viewport horizontally
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (left < 16) left = 16;

      // Flip above if not enough space below
      if (top + popoverHeight > window.innerHeight - 16) {
        top = rect.top - popoverHeight - 8;
      }

      setPopoverPos({ top, left });
    }

    updatePosition();
    requestAnimationFrame(updatePosition);

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const navigateMonth = useCallback((delta: number) => {
    setView(([y, m]) => {
      let newMonth = m + delta;
      let newYear = y;
      if (newMonth < 0) { newMonth = 11; newYear--; }
      else if (newMonth > 11) { newMonth = 0; newYear++; }
      return [newYear, newMonth];
    });
  }, []);

  function selectDay(date: Date) {
    onChange(toISO(date));
    setOpen(false);
  }

  function handleToday() {
    const now = new Date();
    onChange(toISO(now));
    setView([now.getFullYear(), now.getMonth()]);
    setOpen(false);
  }

  function handleClear() {
    onChange("");
    setOpen(false);
  }

  function handleToggleOpen() {
    if (!open) {
      const target = selected ?? today;
      setView([target.getFullYear(), target.getMonth()]);
    }
    setOpen((current) => !current);
  }

  function isDisabled(date: Date): boolean {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  const days = buildCalendarDays(viewYear, viewMonth);

  return (
    <div className="relative" data-field-error={error ? "true" : undefined}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleToggleOpen}
        className={`flex w-full items-center justify-between rounded-lg bg-surface px-4 py-3 text-left text-sm outline-none transition-all ${
          value ? "text-text-primary" : "text-text-muted"
        } ${
          error
            ? "ring-1 ring-inset ring-error/60"
            : open
              ? "ring-1 ring-inset ring-brand/60 bg-surface-raised"
              : "focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-surface-raised"
        }`}
      >
        <span>{value ? formatDisplay(value) : placeholder}</span>
        <Calendar className="h-4 w-4 shrink-0 text-text-muted" />
      </button>

      {error && (
        <p className="mt-1.5 text-xs text-error">{error}</p>
      )}

      {/* Calendar popover via portal */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Calendar"
            style={{ top: popoverPos.top, left: popoverPos.left }}
            className="fixed z-50 w-[280px] animate-fade-in rounded-2xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-4 shadow-2xl shadow-black/35 backdrop-blur-xl backdrop-saturate-150"
          >
            {/* Month navigation */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => navigateMonth(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-text-primary">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => navigateMonth(1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="mb-1 grid grid-cols-7 gap-0">
              {DAY_LABELS.map((d, i) => (
                <div
                  key={i}
                  className="flex h-8 items-center justify-center text-xs font-medium text-text-muted"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0">
              {days.map((date, i) => {
                if (!date) {
                  return <div key={`empty-${i}`} className="h-9" />;
                }

                const isSelected = selected && isSameDay(date, selected);
                const isToday = isSameDay(date, today);
                const disabled = isDisabled(date);

                return (
                  <button
                    key={date.getDate()}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectDay(date)}
                    className={`flex h-9 w-full items-center justify-center rounded-full text-sm transition-colors focus-visible:ring-2 focus-visible:ring-brand/60 ${
                      isSelected
                        ? "bg-brand font-semibold text-white"
                        : disabled
                          ? "cursor-not-allowed text-text-muted/40"
                          : isToday
                            ? "font-medium text-brand ring-1 ring-inset ring-brand/40 hover:bg-surface-raised"
                            : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-text-muted transition-colors hover:text-text-secondary"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="text-xs font-medium text-brand transition-colors hover:text-brand-light"
              >
                Today
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

DatePicker.displayName = "DatePicker";

export { DatePicker };
export type { DatePickerProps };
