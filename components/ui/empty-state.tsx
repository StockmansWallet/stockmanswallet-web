import type { ReactNode } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";

type EmptyStateVariant = "brand" | "teal" | "lime" | "sky" | "amber" | "purple";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: EmptyStateVariant;
}

const variantStyles: Record<EmptyStateVariant, { iconBg: string; iconText: string; btnBg: string; btnHover: string }> = {
  brand: { iconBg: "bg-brand/10", iconText: "text-brand", btnBg: "bg-brand", btnHover: "hover:bg-brand-dark" },
  teal: { iconBg: "bg-teal-500/10", iconText: "text-teal-400", btnBg: "bg-teal-500", btnHover: "hover:bg-teal-600" },
  lime: { iconBg: "bg-lime-500/10", iconText: "text-lime-400", btnBg: "bg-lime-600", btnHover: "hover:bg-lime-700" },
  sky: { iconBg: "bg-sky-500/10", iconText: "text-sky-400", btnBg: "bg-sky-500", btnHover: "hover:bg-sky-600" },
  amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400", btnBg: "bg-amber-500", btnHover: "hover:bg-amber-600" },
  purple: { iconBg: "bg-purple-500/10", iconText: "text-purple-400", btnBg: "bg-purple-500", btnHover: "hover:bg-purple-600" },
};

function EmptyState({ icon, title, description, actionLabel, actionHref, onAction, variant = "brand" }: EmptyStateProps) {
  const v = variantStyles[variant];
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${v.iconBg}`}>
        {icon || <Inbox className={`h-6 w-6 ${v.iconText}`} />}
      </div>
      <h3 className="mb-1 text-sm font-medium text-text-primary">{title}</h3>
      <p className="max-w-xs text-xs text-text-muted">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={`mt-4 rounded-xl ${v.btnBg} px-4 py-2 text-xs font-semibold text-white transition-colors ${v.btnHover}`}
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          onClick={onAction}
          className={`mt-4 rounded-xl ${v.btnBg} px-4 py-2 text-xs font-semibold text-white transition-colors ${v.btnHover}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
