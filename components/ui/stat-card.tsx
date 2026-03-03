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
    <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-[#271F16]">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
      {change && (
        <p
          className={`mt-1 text-xs font-medium ${
            change.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
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
