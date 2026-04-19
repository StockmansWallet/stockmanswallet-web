import type { ReactNode } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { Button, type ButtonVariant } from "@/components/ui/button";

type EmptyStateVariant = "brand" | "teal" | "indigo" | "lime" | "sky" | "amber" | "purple" | "advisor";

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
  teal: { iconBg: "bg-teal/10", iconText: "text-teal" },
  indigo: { iconBg: "bg-indigo/10", iconText: "text-indigo" },
  lime: { iconBg: "bg-emerald/10", iconText: "text-emerald" },
  sky: { iconBg: "bg-sky/10", iconText: "text-sky" },
  amber: { iconBg: "bg-gold/10", iconText: "text-gold" },
  purple: { iconBg: "bg-violet/10", iconText: "text-violet" },
  advisor: { iconBg: "bg-indigo/10", iconText: "text-indigo" },
};

const variantToButton: Record<EmptyStateVariant, ButtonVariant> = {
  brand: "primary",
  teal: "teal",
  indigo: "indigo",
  lime: "lime",
  sky: "sky",
  amber: "amber",
  purple: "purple",
  advisor: "advisor",
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
