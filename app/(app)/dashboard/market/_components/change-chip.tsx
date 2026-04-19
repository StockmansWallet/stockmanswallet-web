interface ChangeChipProps {
  value: number | null;
  label?: string;
  size?: "xs" | "sm";
}

export function ChangeChip({ value, label, size = "xs" }: ChangeChipProps) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-white/[0.03] ${size === "xs" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"} text-text-muted tabular-nums`}>
        {label && <span className="text-text-muted/60">{label}</span>}
        <span>-</span>
      </span>
    );
  }
  const positive = value > 0.05;
  const negative = value < -0.05;
  const tone = positive
    ? "bg-emerald-500/10 text-emerald-300"
    : negative
    ? "bg-red-500/10 text-red-300"
    : "bg-white/[0.04] text-text-muted";
  const sign = positive ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${tone} ${size === "xs" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"} font-medium tabular-nums`}>
      {label && <span className="opacity-70">{label}</span>}
      <span>{sign}{value.toFixed(1)}%</span>
    </span>
  );
}
