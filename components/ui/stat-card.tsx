import type { ReactNode } from "react";

type StatCardAccent = "brand" | "lime" | "sky" | "teal" | "amber" | "purple" | "simulator";

const accentClasses: Record<StatCardAccent, string> = {
  brand: "bg-brand/15 text-brand",
  lime: "bg-emerald/15 text-emerald",
  sky: "bg-sky/15 text-sky",
  teal: "bg-teal/15 text-teal",
  amber: "bg-gold/15 text-gold",
  purple: "bg-violet/15 text-violet",
  simulator: "bg-red/15 text-red",
};

interface StatCardProps {
  label: string;
  value: string;
  change?: {
    value: string;
    positive?: boolean;
  };
  icon?: ReactNode;
  accent?: StatCardAccent;
}

function StatCard({ label, value, change, icon, accent = "brand" }: StatCardProps) {
  return (
    <div className="flex rounded-2xl border border-white/[0.08] bg-white/[0.07] bg-clip-padding p-5 backdrop-blur-xl [backface-visibility:hidden] [transform:translateZ(0)]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {icon && (
          <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${accentClasses[accent]}`}>
            {icon}
          </div>
        )}
        <p className="text-text-muted text-xs font-medium tracking-wide uppercase">{label}</p>
        <p className="text-text-primary mt-1.5 text-xl font-bold">{value}</p>
        {change && (
          <p
            className={`mt-1 text-xs font-medium ${
              change.positive ? "text-success" : "text-error"
            }`}
          >
            {change.positive ? "+" : ""}
            {change.value}
          </p>
        )}
      </div>
    </div>
  );
}

export { StatCard };
export type { StatCardProps };
