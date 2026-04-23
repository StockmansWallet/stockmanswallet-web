import type { ReactNode } from "react";

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

function PageHeader({ title, actions, compact }: PageHeaderProps) {
  // Experiment: page titles are hidden since the sidebar indicates location.
  // Keep <h1> for screen readers and accessibility. Action buttons still render.
  const srTitle = <h1 className="sr-only">{title}</h1>;

  if (!actions) return srTitle;

  if (compact) {
    return (
      <div className="mb-3 flex items-center justify-end">
        {srTitle}
        <div className="flex items-center gap-2">{actions}</div>
      </div>
    );
  }

  return (
    <div className="pt-6 pb-4">
      {srTitle}
      <div className="flex flex-1 items-center justify-end">
        <div className="flex items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

export { PageHeader };
export type { PageHeaderProps, FeatureHue };
