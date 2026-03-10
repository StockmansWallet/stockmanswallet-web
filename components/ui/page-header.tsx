import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  inline?: boolean;
  compact?: boolean;
}

function PageHeader({
  title,
  subtitle,
  actions,
  titleClassName,
  subtitleClassName,
  inline,
  compact,
}: PageHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${compact ? "mb-3" : `mb-8 ${inline ? "mt-[68px]" : "mt-11"}`}`}>
      <div className={inline ? "flex items-baseline gap-3" : undefined}>
        <h1 className={titleClassName ?? "text-4xl font-bold text-text-primary"}>{title}</h1>
        {subtitle && (
          <p className={subtitleClassName ?? (inline ? "text-sm text-text-muted" : "mt-1 text-sm text-text-muted")}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export { PageHeader };
export type { PageHeaderProps };
