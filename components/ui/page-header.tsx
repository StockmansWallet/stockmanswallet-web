import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeaderActionsPortal } from "@/components/ui/page-header-actions-portal";

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

type HeaderAccent = FeatureHue | "brand" | "warning" | "error" | "success" | "info";

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

const featureTitleClasses: Record<FeatureHue, string> = {
  brangus: "text-brangus",
  insights: "text-insights",
  markets: "text-markets",
  "yard-book": "text-yard-book",
  reports: "text-reports",
  "freight-iq": "text-freight-iq",
  "grid-iq": "text-grid-iq",
  "producer-network": "text-producer-network",
  advisor: "text-advisor",
};

function PageHeader({
  title,
  titleHref,
  subtitle,
  actions,
  titleClassName,
  subtitleClassName,
  compact,
  feature,
}: PageHeaderProps) {
  const accent = resolveHeaderAccent(feature, titleClassName);
  const headingClassName =
    titleClassName ??
    `text-2xl font-semibold tracking-tight sm:text-3xl ${
      feature ? featureTitleClasses[feature] : "text-text-primary"
    }`;
  const subtitleClass =
    subtitleClassName ?? "mt-1 text-sm leading-relaxed text-text-secondary sm:text-base";
  const heading = <h1 className={headingClassName}>{title}</h1>;
  const marker = (
    <span
      hidden
      data-page-header
      data-page-title={title}
      data-page-subtitle={subtitle ?? ""}
      data-page-title-href={titleHref ?? ""}
      data-page-accent={accent}
    />
  );

  if (compact) {
    return (
      <>
        {marker}
        <div className="mb-3 flex items-center justify-between gap-4 lg:hidden">
          <div className="min-w-0">
            {titleHref ? <Link href={titleHref}>{heading}</Link> : heading}
            {subtitle && <p className={subtitleClass}>{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
        {actions && <PageHeaderActionsPortal>{actions}</PageHeaderActionsPortal>}
      </>
    );
  }

  return (
    <>
      {marker}
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between lg:hidden">
        <div className="min-w-0">
          {titleHref ? <Link href={titleHref}>{heading}</Link> : heading}
          {subtitle && <p className={subtitleClass}>{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
      {actions && <PageHeaderActionsPortal>{actions}</PageHeaderActionsPortal>}
    </>
  );
}

function resolveHeaderAccent(
  feature: FeatureHue | undefined,
  titleClassName: string | undefined
): HeaderAccent {
  if (feature) return feature;
  if (!titleClassName) return "brand";
  if (titleClassName.includes("text-warning")) return "warning";
  if (titleClassName.includes("text-error")) return "error";
  if (titleClassName.includes("text-success")) return "success";
  if (titleClassName.includes("text-info")) return "info";
  if (titleClassName.includes("text-brangus")) return "brangus";
  if (titleClassName.includes("text-insights")) return "insights";
  if (titleClassName.includes("text-markets")) return "markets";
  if (titleClassName.includes("text-yard-book")) return "yard-book";
  if (titleClassName.includes("text-reports")) return "reports";
  if (titleClassName.includes("text-freight-iq")) return "freight-iq";
  if (titleClassName.includes("text-grid-iq")) return "grid-iq";
  if (titleClassName.includes("text-producer-network")) return "producer-network";
  if (titleClassName.includes("text-advisor")) return "advisor";
  return "brand";
}

export { PageHeader };
export type { PageHeaderProps, FeatureHue };
