import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = "", ...props }, ref) => {
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
        <input
          ref={ref}
          id={id}
          className={`w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all ${
            error
              ? "ring-1 ring-inset ring-red-500/60 focus:ring-red-500"
              : "focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-white/8"
          } ${className}`}
          {...props}
        />
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
