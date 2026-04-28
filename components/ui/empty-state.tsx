import type { ReactNode } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { Button, type ButtonVariant } from "@/components/ui/button";

type EmptyStateVariant =
  | "brand"
  | "teal"
  | "indigo"
  | "lime"
  | "sky"
  | "amber"
  | "purple"
  | "advisor"
  | "brangus"
  | "insights"
  | "markets"
  | "yard-book"
  | "reports"
  | "freight-iq"
  | "grid-iq"
  | "ch40";

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
  advisor: { iconBg: "bg-advisor/10", iconText: "text-advisor" },
  brangus: { iconBg: "bg-brangus/10", iconText: "text-brangus" },
  insights: { iconBg: "bg-insights/10", iconText: "text-insights" },
  markets: { iconBg: "bg-markets/10", iconText: "text-markets" },
  "yard-book": { iconBg: "bg-yard-book/10", iconText: "text-yard-book" },
  reports: { iconBg: "bg-reports/10", iconText: "text-reports" },
  "freight-iq": { iconBg: "bg-freight-iq/10", iconText: "text-freight-iq" },
  "grid-iq": { iconBg: "bg-grid-iq/10", iconText: "text-grid-iq" },
  "ch40": { iconBg: "bg-ch40/10", iconText: "text-ch40" },
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
  brangus: "brangus",
  insights: "insights",
  markets: "markets",
  "yard-book": "yard-book",
  reports: "reports",
  "freight-iq": "freight-iq",
  "grid-iq": "grid-iq",
  "ch40": "ch40",
};

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = "brand",
}: EmptyStateProps) {
  const v = variantStyles[variant];
  const btnVariant = variantToButton[variant];
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${v.iconBg}`}>
        {icon || <Inbox className={`h-6 w-6 ${v.iconText}`} />}
      </div>
      <h3 className="text-text-primary mb-1 text-sm font-medium">{title}</h3>
      <p className="text-text-muted max-w-xs text-xs">{description}</p>
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
