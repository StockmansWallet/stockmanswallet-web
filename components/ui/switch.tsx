"use client";

interface SwitchProps {
  id?: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({
  id,
  name,
  checked,
  defaultChecked,
  onChange,
  label,
  description,
  disabled,
}: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="peer sr-only"
        />
        <div className="h-6 w-11 rounded-full bg-white/10 transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
        <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </div>
      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <p className="text-sm font-medium text-text-primary">{label}</p>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-text-muted leading-relaxed">{description}</p>
          )}
        </div>
      )}
    </label>
  );
}
