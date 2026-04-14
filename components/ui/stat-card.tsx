import type { ReactNode } from "react";

type StatCardAccent = "brand" | "lime" | "sky" | "teal" | "amber" | "purple" | "simulator";

const accentClasses: Record<StatCardAccent, string> = {
  brand: "bg-brand/15 text-brand",
  lime: "bg-lime-500/15 text-lime-400",
  sky: "bg-sky-500/15 text-sky-400",
  teal: "bg-teal-500/15 text-teal-400",
  amber: "bg-amber-500/15 text-amber-400",
  purple: "bg-purple-500/15 text-purple-400",
  simulator: "bg-[#ff4021]/15 text-[#ff4021]",
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
    <div className="flex rounded-2xl bg-surface-lowest p-5">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <p className="mt-1.5 text-xl font-bold text-text-primary">{value}</p>
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
