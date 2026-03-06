import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
}

function PageHeader({ title, subtitle, actions, titleClassName, subtitleClassName }: PageHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h1 className={titleClassName ?? "text-2xl font-bold text-text-primary"}>{title}</h1>
        {subtitle && (
          <p className={subtitleClassName ?? "mt-1 text-sm text-text-muted"}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export { PageHeader };
export type { PageHeaderProps };
