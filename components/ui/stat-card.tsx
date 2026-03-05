import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  change?: {
    value: string;
    positive?: boolean;
  };
  icon?: ReactNode;
}

function StatCard({ label, value, change, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white/5 p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/15 text-brand">
            {icon}
          </div>
        )}
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
