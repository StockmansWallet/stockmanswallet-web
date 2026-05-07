import { Check, X } from "lucide-react";

export function InlineCreate({
  value,
  placeholder,
  actionLabel,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  placeholder: string;
  actionLabel: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mb-2 flex gap-1 px-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSave();
          if (event.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 text-xs text-white outline-none placeholder:text-white/35 focus:border-brand/50"
        autoFocus
      />
      <button type="button" onClick={onSave} className="bg-brand/15 text-brand hover:bg-brand/25 rounded-lg px-2 text-xs font-semibold">
        {actionLabel}
      </button>
    </div>
  );
}

export function EditRow({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSave();
          if (event.key === "Escape") onCancel();
        }}
        className="h-7 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2 text-xs text-white outline-none focus:border-brand/50"
        autoFocus
      />
      <button type="button" onClick={onSave} className="rounded-md p-1.5 text-emerald-300 hover:bg-emerald-400/10" aria-label="Save name">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onCancel} className="rounded-md p-1.5 text-white/45 hover:bg-white/[0.08] hover:text-white" aria-label="Cancel rename">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function MenuPopover({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="menu"
      className="absolute top-8 right-1 z-50 w-40 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl backdrop-saturate-150"
    >
      {children}
    </div>
  );
}

export function MenuButton({
  icon,
  label,
  destructive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        destructive
          ? "text-error hover:bg-error/10"
          : "text-text-muted hover:bg-white/[0.06] hover:text-text-primary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
