import type { ReactNode } from "react";

type StatCardAccent = "brand" | "lime" | "sky" | "teal" | "amber" | "purple";

const accentClasses: Record<StatCardAccent, string> = {
  brand: "bg-brand/15 text-brand",
  lime: "bg-lime-500/15 text-lime-400",
  sky: "bg-sky-500/15 text-sky-400",
  teal: "bg-teal-500/15 text-teal-400",
  amber: "bg-amber-500/15 text-amber-400",
  purple: "bg-purple-500/15 text-purple-400",
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
    <div className="rounded-2xl bg-surface-lowest p-5">
      <div className="flex items-center gap-2">
        {icon && (
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${accentClasses[accent]}`}>
            {icon}
          </div>
        )}
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
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
  );
}

export { StatCard };
export type { StatCardProps };
