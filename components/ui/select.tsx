"use client";

import { forwardRef, useState, useRef, useEffect, useCallback, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SelectOption = { value: string; label: string; disabled?: boolean };
type OptionGroup = { header: string; options: SelectOption[] };

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  groups?: OptionGroup[];
  placeholder?: string;
  custom?: boolean;
  /** Show a subtle orange ring to indicate the field still needs input */
  hint?: boolean;
}

// ---------------------------------------------------------------------------
// Shared option button
// ---------------------------------------------------------------------------

function OptionButton({ opt, selected, onSelect }: { opt: SelectOption; selected: string; onSelect: (v: string) => void }) {
  const isSelected = opt.value === selected;
  const isDisabled = opt.disabled === true;
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      onClick={() => onSelect(opt.value)}
      className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
        isDisabled
          ? "cursor-not-allowed text-text-muted/50"
          : isSelected
            ? "font-medium text-brand"
            : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
      }`}
    >
      <Check
        className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`}
        strokeWidth={2.5}
      />
      {opt.label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Custom Select (portal-based dropdown - grouped or flat)
// ---------------------------------------------------------------------------

function GroupedSelect({
  id,
  label,
  error,
  helperText,
  options,
  groups,
  placeholder,
  value,
  onChange,
  required,
  hint,
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 0 });

  const selectedValue = String(value ?? "");
  const selectedLabel = groups
    ?.flatMap((g) => g.options)
    .find((o) => o.value === selectedValue)?.label
    ?? options.find((o) => o.value === selectedValue)?.label
    ?? "";

  // Position popover below trigger
  useEffect(() => {
    if (!open || !triggerRef.current) return;

    function updatePosition() {
      const rect = triggerRef.current!.getBoundingClientRect();
      const popoverHeight = 340;

      let top = rect.bottom + 8;
      let left = rect.left;

      if (left + rect.width > window.innerWidth - 16) {
        left = window.innerWidth - rect.width - 16;
      }
      if (left < 16) left = 16;

      if (top + popoverHeight > window.innerHeight - 16) {
        top = rect.top - popoverHeight - 8;
      }

      setPopoverPos({ top, left, width: rect.width });
    }

    updatePosition();

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

  const selectOption = useCallback(
    (optValue: string) => {
      const syntheticEvent = {
        target: { value: optValue },
        currentTarget: { value: optValue },
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange?.(syntheticEvent);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div>
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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`relative flex w-full items-center justify-between rounded-lg bg-surface py-3 pl-4 pr-10 text-left text-sm outline-none transition-all ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : selectedValue ? "text-text-primary" : "text-text-muted"
        } ${
          disabled
            ? ""
            : error
              ? "ring-1 ring-inset ring-red-500/60"
              : open
                ? "ring-1 ring-inset ring-brand/60 bg-surface-raised"
                : hint
                  ? "ring-1 ring-inset ring-brand/40 shadow-[0_0_8px_#D9762F40] focus:ring-brand/60 focus:shadow-[0_0_12px_#D9762F59] focus:bg-surface-raised"
                  : "focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-surface-raised"
        }`}
      >
        <span className="truncate">{selectedLabel || placeholder || "Select"}</span>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      </button>

      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>
      )}

      {/* Dropdown popover via portal */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="listbox"
            aria-label={label ?? "Select"}
            style={{ top: popoverPos.top, left: popoverPos.left, width: popoverPos.width }}
            className="fixed z-50 animate-fade-in rounded-2xl bg-bg-alt py-2 shadow-2xl ring-1 ring-inset ring-ring-subtle"
          >
            <div className="max-h-[320px] overflow-y-auto overscroll-contain">
              {groups
                ? groups.map((group) => (
                    <div key={group.header}>
                      <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        {group.header}
                      </div>
                      {group.options.map((opt) => (
                        <OptionButton key={opt.value} opt={opt} selected={selectedValue} onSelect={selectOption} />
                      ))}
                    </div>
                  ))
                : options.map((opt) => (
                    <OptionButton key={opt.value} opt={opt} selected={selectedValue} onSelect={selectOption} />
                  ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Native Select (unchanged - used when no groups prop)
// ---------------------------------------------------------------------------

const NativeSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, id, options, placeholder, className = "", groups: _groups, custom: _custom, hint, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={`w-full appearance-none rounded-lg bg-surface py-3 pl-4 pr-10 text-sm text-text-primary outline-none transition-all ${
              error
                ? "ring-1 ring-inset ring-red-500/60 focus:ring-red-500"
                : hint
                  ? "ring-1 ring-inset ring-brand/40 shadow-[0_0_8px_#D9762F40] focus:ring-brand/60 focus:shadow-[0_0_12px_#D9762F59] focus:bg-surface-raised"
                  : "focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-surface-raised"
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);
NativeSelect.displayName = "NativeSelect";

// ---------------------------------------------------------------------------
// Exported Select - routes to grouped or native based on props
// ---------------------------------------------------------------------------

const Select = forwardRef<HTMLSelectElement, SelectProps>((props, ref) => {
  if (props.custom || (props.groups && props.groups.length > 0)) {
    return <GroupedSelect {...props} />;
  }
  return <NativeSelect ref={ref} {...props} />;
});
Select.displayName = "Select";

export { Select };
export type { SelectProps, SelectOption, OptionGroup };
