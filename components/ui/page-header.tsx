import type { ReactNode } from "react";
import Link from "next/link";

type FeatureHue =
  | "brangus"
  | "insights"
  | "markets"
  | "yard-book"
  | "reports"
  | "freight-iq"
  | "grid-iq"
  | "producer-network"
  | "advisor";

const FEATURE_TITLE: Record<FeatureHue, string> = {
  brangus: "text-4xl font-bold text-brangus",
  insights: "text-4xl font-bold text-insights",
  markets: "text-4xl font-bold text-markets",
  "yard-book": "text-4xl font-bold text-yard-book",
  reports: "text-4xl font-bold text-reports",
  "freight-iq": "text-4xl font-bold text-freight-iq",
  "grid-iq": "text-4xl font-bold text-grid-iq",
  "producer-network": "text-4xl font-bold text-producer-network",
  advisor: "text-4xl font-bold text-advisor",
};

interface PageHeaderProps {
  title: string;
  titleHref?: string;
  subtitle?: string;
  actions?: ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  inline?: boolean;
  compact?: boolean;
  /** Feature hue to tint the title with. Overridden by an explicit titleClassName. */
  feature?: FeatureHue;
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
  feature,
}: PageHeaderProps) {
  const inline = inlineProp ?? !!subtitle;
  const defaultTitleClass = feature
    ? FEATURE_TITLE[feature]
    : "text-4xl font-bold text-text-primary";
  const titleEl = <h1 className={titleClassName ?? defaultTitleClass}>{title}</h1>;

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
export type { PageHeaderProps, FeatureHue };
