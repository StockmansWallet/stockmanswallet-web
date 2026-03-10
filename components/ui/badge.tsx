import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "default" | "brand" | "success" | "warning" | "danger" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-surface-raised text-text-secondary",
  brand:
    "bg-brand/15 text-brand",
  success:
    "bg-green-500/15 text-green-400",
  warning:
    "bg-amber-500/15 text-amber-400",
  danger:
    "bg-red-500/15 text-red-400",
  info:
    "bg-blue-500/15 text-blue-400",
};

function Badge({ variant = "default", children, className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
