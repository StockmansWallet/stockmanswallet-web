import type { ReactNode } from "react";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  titleHref?: string;
  subtitle?: string;
  actions?: ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  inline?: boolean;
  compact?: boolean;
}

function PageHeader({
  title,
  titleHref,
  subtitle,
  actions,
  titleClassName,
  subtitleClassName,
  inline: inlineProp,
  compact,
}: PageHeaderProps) {
  const inline = inlineProp ?? !!subtitle;
  const titleEl = <h1 className={titleClassName ?? "text-4xl font-bold text-text-primary"}>{title}</h1>;

  if (compact) {
    return (
      <div className="mb-3 flex items-center justify-between">
        <div className={inline ? "flex flex-wrap items-baseline gap-x-3 gap-y-1" : undefined}>
          {titleHref ? <Link href={titleHref}>{titleEl}</Link> : titleEl}
          {subtitle && (
            <p className={subtitleClassName ?? (inline ? "text-base text-text-muted" : "mt-1.5 text-base text-text-muted")}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <div className="pb-4 pt-6">
      <div className="flex flex-1 items-center justify-between">
        <div className={inline ? "flex flex-wrap items-baseline gap-x-3 gap-y-1" : undefined}>
          {titleHref ? <Link href={titleHref}>{titleEl}</Link> : titleEl}
          {subtitle && (
            <p className={subtitleClassName ?? (inline ? "text-base text-text-muted" : "mt-1.5 text-base text-text-muted")}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export { PageHeader };
export type { PageHeaderProps };
