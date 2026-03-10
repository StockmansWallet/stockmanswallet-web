import type { ReactNode } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { Button, type ButtonVariant } from "@/components/ui/button";

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

const variantStyles: Record<EmptyStateVariant, { iconBg: string; iconText: string }> = {
  brand: { iconBg: "bg-brand/10", iconText: "text-brand" },
  teal: { iconBg: "bg-teal-500/10", iconText: "text-teal-400" },
  lime: { iconBg: "bg-lime-500/10", iconText: "text-lime-400" },
  sky: { iconBg: "bg-sky-500/10", iconText: "text-sky-400" },
  amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
  purple: { iconBg: "bg-purple-500/10", iconText: "text-purple-400" },
};

const variantToButton: Record<EmptyStateVariant, ButtonVariant> = {
  brand: "primary",
  teal: "teal",
  lime: "lime",
  sky: "sky",
  amber: "amber",
  purple: "purple",
};

function EmptyState({ icon, title, description, actionLabel, actionHref, onAction, variant = "brand" }: EmptyStateProps) {
  const v = variantStyles[variant];
  const btnVariant = variantToButton[variant];
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${v.iconBg}`}>
        {icon || <Inbox className={`h-6 w-6 ${v.iconText}`} />}
      </div>
      <h3 className="mb-1 text-sm font-medium text-text-primary">{title}</h3>
      <p className="max-w-xs text-xs text-text-muted">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-4">
          <Button variant={btnVariant} size="sm">
            {actionLabel}
          </Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button variant={btnVariant} size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
