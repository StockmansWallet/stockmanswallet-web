import { forwardRef, type InputHTMLAttributes, useCallback, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Starting value for number stepper arrows when the field is empty */
  nudgeDefault?: number;
  /** Show a subtle orange ring to indicate the field still needs input */
  hint?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = "", type, step, min, max, onChange, value, nudgeDefault, hint, ...props }, ref) => {
    const isNumber = type === "number";
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

    const nudge = useCallback(
      (direction: 1 | -1) => {
        const el = inputRef.current;
        const s = Number(step) || 1;
        // Debug: Read current value from the DOM element (works for both controlled and uncontrolled inputs)
        const rawVal = el?.value ?? String(value ?? "");
        const isEmpty = rawVal === "" || rawVal === undefined || rawVal === null;
        const current = isEmpty && nudgeDefault !== undefined ? nudgeDefault : (Number(rawVal) || 0);
        let next = current + s * direction;
        // Respect min/max bounds
        if (min !== undefined && next < Number(min)) next = Number(min);
        if (max !== undefined && next > Number(max)) next = Number(max);
        // Round to avoid floating point drift
        const decimals = String(s).includes(".") ? String(s).split(".")[1].length : 0;
        next = Number(next.toFixed(decimals));
        // Debug: Update the DOM element directly for uncontrolled inputs
        if (el) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          nativeInputValueSetter?.call(el, String(next));
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        // Debug: Also fire the React onChange for controlled inputs
        if (onChange) {
          const syntheticTarget = { value: String(next) } as HTMLInputElement;
          onChange({
            target: syntheticTarget,
            currentTarget: syntheticTarget,
          } as unknown as React.ChangeEvent<HTMLInputElement>);
        }
      },
      [value, step, min, max, onChange, nudgeDefault, inputRef],
    );

    const hasTrailingIcon = isNumber;

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
          <input
            ref={inputRef}
            id={id}
            type={type}
            step={step}
            min={min}
            max={max}
            value={value}
            onChange={onChange}
            className={`w-full rounded-xl bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
              hasTrailingIcon ? "pr-10" : ""
            } ${
              error
                ? "ring-1 ring-inset ring-red-500/60 focus:ring-red-500"
                : hint
                  ? "ring-1 ring-inset ring-brand/40 shadow-[0_0_8px_#D9762F40] focus:ring-brand/60 focus:shadow-[0_0_12px_#D9762F59] focus:bg-surface-raised"
                  : "focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-surface-raised"
            } ${className}`}
            {...props}
          />
          {isNumber && (
            <div className="pointer-events-none absolute right-1.5 top-1/2 flex -translate-y-1/2 flex-col">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => nudge(1)}
                className="pointer-events-auto flex h-4 w-6 items-center justify-center rounded-t-md text-text-muted transition-colors hover:text-text-primary active:text-brand"
              >
                <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => nudge(-1)}
                className="pointer-events-auto flex h-4 w-6 items-center justify-center rounded-b-md text-text-muted transition-colors hover:text-text-primary active:text-brand"
              >
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          )}
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
Input.displayName = "Input";

export { Input };
export type { InputProps };
