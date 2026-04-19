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
    "bg-success/15 text-success",
  warning:
    "bg-warning/15 text-warning",
  danger:
    "bg-error/15 text-error",
  info:
    "bg-info/15 text-info",
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
