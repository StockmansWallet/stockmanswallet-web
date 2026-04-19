import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, id, className = "", required, ...props }, ref) => {
    return (
      <div data-field-error={error ? "true" : undefined}>
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-medium text-text-secondary"
          >
            {label}{required && <span className="text-error"> *</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          required={required}
          className={`w-full rounded-lg bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all resize-none ${
            error
              ? "ring-1 ring-inset ring-error/60 focus:ring-error"
              : "focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-surface-raised"
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
