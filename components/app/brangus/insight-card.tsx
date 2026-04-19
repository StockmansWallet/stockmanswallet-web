// Brangus Insight Card - displays a single data-driven insight
// Layout matches the iOS insight card: icon, title, key figure, narrative.

import Link from "next/link";
import {
  Wallet,
  Scale,
  Calendar,
  HeartPulse,
  AlertTriangle,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BrangusInsight } from "@/lib/brangus/insight-engine";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  wallet: Wallet,
  scale: Scale,
  calendar: Calendar,
  "heart-pulse": HeartPulse,
  "alert-triangle": AlertTriangle,
  "clipboard-list": ClipboardList,
};

const sentimentColor: Record<string, string> = {
  positive: "text-success",
  negative: "text-error",
  neutral: "text-brand",
};

const sentimentBg: Record<string, string> = {
  positive: "bg-success/15",
  negative: "bg-error/15",
  neutral: "bg-brand/15",
};

const sentimentIconColor: Record<string, string> = {
  positive: "text-success",
  negative: "text-error",
  neutral: "text-brand",
};

export function InsightCard({ insight }: { insight: BrangusInsight }) {
  const Icon = iconMap[insight.icon] ?? Wallet;

  const content = (
    <Card className="transition-all hover:bg-white/[0.07]">
      <CardContent className="flex flex-col gap-3 p-4">
        {/* Header: icon + title + herd name */}
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${sentimentBg[insight.sentiment]}`}>
            <Icon className={`h-4.5 w-4.5 ${sentimentIconColor[insight.sentiment]}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{insight.title}</p>
            {insight.herdName && (
              <p className="truncate text-xs text-text-secondary">{insight.herdName}</p>
            )}
          </div>
        </div>

        {/* Key figure */}
        <div>
          <p className={`text-2xl font-bold ${sentimentColor[insight.sentiment]}`}>
            {insight.keyFigure}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">{insight.keyFigureSubtitle}</p>
        </div>

        {/* Narrative */}
        <p className="line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {insight.narrative}
        </p>

        {/* Footer link */}
        {insight.linkHref && (
          <div className="flex items-center gap-1 text-xs font-medium text-brand">
            View Details
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (insight.linkHref) {
    return (
      <Link href={insight.linkHref} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
