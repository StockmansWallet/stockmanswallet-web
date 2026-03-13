// Horizontal scrollable row of quick insight cards for Brangus chat responses
// Shown below the last assistant bubble when display_summary_cards tool is used
// Cards surface key figures (values, prices, counts) for fast scanning
// Supports click-to-navigate (via onCardAction) and click-and-drag horizontal scrolling

"use client";

import { useRef, useState, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import type { QuickInsight, CardAction } from "@/lib/brangus/types";

const sentimentColor: Record<QuickInsight["sentiment"], string> = {
  positive: "text-success",
  negative: "text-error",
  neutral: "text-text-primary",
};

function QuickInsightCard({
  insight,
  onCardAction,
}: {
  insight: QuickInsight;
  onCardAction?: (action: CardAction) => void;
}) {
  const hasTap = !!insight.action && !!onCardAction;

  return (
    <div
      className={`flex min-w-[100px] max-w-[150px] shrink-0 flex-col gap-1 rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 ${
        hasTap ? "cursor-pointer transition-opacity hover:opacity-80" : ""
      }`}
      onClick={hasTap ? () => onCardAction(insight.action!) : undefined}
      role={hasTap ? "button" : undefined}
      tabIndex={hasTap ? 0 : undefined}
      onKeyDown={
        hasTap
          ? (e) => {
              if (e.key === "Enter") onCardAction(insight.action!);
            }
          : undefined
      }
    >
      {/* Label row with optional chevron for tappable cards */}
      <div className="flex items-center gap-0.5">
        <span className="flex-1 truncate text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          {insight.label}
        </span>
        {hasTap && (
          <ChevronRight className="h-2.5 w-2.5 shrink-0 text-text-muted" />
        )}
      </div>
      <span
        className={`text-[17px] font-bold leading-tight ${sentimentColor[insight.sentiment]} truncate`}
      >
        {insight.value}
      </span>
      <span
        className={`text-[10px] truncate ${insight.subtitle ? "text-text-secondary" : "text-transparent"}`}
      >
        {insight.subtitle || "\u00A0"}
      </span>
    </div>
  );
}

export function QuickInsightRow({
  insights,
  onCardAction,
}: {
  insights: QuickInsight[];
  onCardAction?: (action: CardAction) => void;
}) {
  if (!insights.length) return null;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    x: number;
    scrollLeft: number;
    moved: boolean;
  } | null>(null);

  // Click-and-drag horizontal scrolling for mouse users
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    dragStartRef.current = {
      x: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const start = dragStartRef.current;
    const el = containerRef.current;
    if (!start || !el) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 5) start.moved = true;
    el.scrollLeft = start.scrollLeft - dx;
  }, []);

  const handleMouseUp = useCallback(() => {
    // Small delay so onClick on cards can check if we were dragging
    setTimeout(() => {
      dragStartRef.current = null;
      setIsDragging(false);
    }, 0);
  }, []);

  // Wrap onCardAction to suppress navigation if user was dragging
  const handleCardAction = useCallback(
    (action: CardAction) => {
      if (dragStartRef.current?.moved) return;
      onCardAction?.(action);
    },
    [onCardAction]
  );

  return (
    <div
      ref={containerRef}
      className={`flex gap-2 overflow-x-auto pb-1 pl-4 scrollbar-none ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
      onMouseDown={handleMouseDown}
      onMouseMove={isDragging ? handleMouseMove : undefined}
      onMouseUp={handleMouseUp}
      onMouseLeave={isDragging ? handleMouseUp : undefined}
    >
      {insights.map((insight) => (
        <QuickInsightCard
          key={insight.id}
          insight={insight}
          onCardAction={handleCardAction}
        />
      ))}
    </div>
  );
}
