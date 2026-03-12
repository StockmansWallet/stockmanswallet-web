// Horizontal scrollable row of quick insight cards for Brangus chat responses
// Shown below the last assistant bubble when display_summary_cards tool is used
// Cards surface key figures (values, prices, counts) for fast scanning

import type { QuickInsight } from "@/lib/brangus/types";

const sentimentColor: Record<QuickInsight["sentiment"], string> = {
  positive: "text-success",
  negative: "text-error",
  neutral: "text-text-primary",
};

function QuickInsightCard({ insight }: { insight: QuickInsight }) {
  return (
    <div className="flex min-w-[100px] max-w-[150px] shrink-0 flex-col gap-1 rounded-xl border border-white/8 bg-white/5 px-3 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted truncate">
        {insight.label}
      </span>
      <span className={`text-[17px] font-bold leading-tight ${sentimentColor[insight.sentiment]} truncate`}>
        {insight.value}
      </span>
      <span className={`text-[10px] truncate ${insight.subtitle ? "text-text-secondary" : "text-transparent"}`}>
        {insight.subtitle || "\u00A0"}
      </span>
    </div>
  );
}

export function QuickInsightRow({ insights }: { insights: QuickInsight[] }) {
  if (!insights.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 pl-1 scrollbar-none">
      {insights.map((insight) => (
        <QuickInsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
