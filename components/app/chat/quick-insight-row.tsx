// Horizontal scrollable row of quick insight cards for Brangus chat responses
// Shown below the last assistant bubble when display_summary_cards tool is used
// Cards surface key figures (values, prices, counts) for fast scanning
// Supports click-to-navigate (via onCardAction) and click-and-drag horizontal scrolling

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import type { QuickInsight, CardAction } from "@/lib/brangus/types";

// Width over which the edge fade runs out. Keep this in sync with the
// mask-image gradient stops below.
const FADE_PX = 28;

// Build a horizontal mask-image gradient that fades the content at whichever
// edges the user can still scroll past. Opaque in the middle, transparent at
// the live edges. When both edges are inert (no overflow in either direction)
// we return `undefined` so the browser doesn't apply a mask at all.
function buildEdgeMask(canScrollLeft: boolean, canScrollRight: boolean): string | undefined {
  if (!canScrollLeft && !canScrollRight) return undefined;
  const left = canScrollLeft
    ? `transparent 0, rgba(0,0,0,0.4) ${Math.round(FADE_PX * 0.35)}px, #000 ${FADE_PX}px`
    : `#000 0`;
  const right = canScrollRight
    ? `#000 calc(100% - ${FADE_PX}px), rgba(0,0,0,0.4) calc(100% - ${Math.round(FADE_PX * 0.35)}px), transparent 100%`
    : `#000 100%`;
  return `linear-gradient(to right, ${left}, ${right})`;
}

// Abbreviate common terms so card text fits without truncation
function compact(text: string): string {
  return text
    .replace(/\bhead\b/gi, "h")
    .replace(/\bherds\b/gi, "herds")
    .replace(/\bacross\b/gi, "across")
    .replace(/\bactive herds\b/gi, "herds");
}

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
      className={`flex min-w-[100px] max-w-[180px] shrink-0 flex-col gap-1 rounded-xl bg-white/5 px-3 py-2.5 ${
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
        {compact(insight.value)}
      </span>
      <span
        className={`text-[10px] truncate ${insight.subtitle ? "text-text-secondary" : "text-transparent"}`}
      >
        {insight.subtitle ? compact(insight.subtitle) : "\u00A0"}
      </span>
    </div>
  );
}

// Distance from the right edge (in px) within which we still consider the
// user to be "following the tail" and auto-scroll new cards into view. Set
// just over a card's width so a small back-scroll still counts.
const TAIL_THRESHOLD_PX = 80;

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
  const [edgeState, setEdgeState] = useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });
  const dragStartRef = useRef<{
    x: number;
    scrollLeft: number;
    moved: boolean;
  } | null>(null);

  // Snapshot of scroll geometry from the last settled state. Refreshed whenever
  // the user scrolls and at the end of each growth handling pass, so when the
  // insights list lengthens we can ask "was the user at the tail BEFORE this
  // change?" without having to measure pre-render.
  const lastScrollStateRef = useRef<{
    scrollLeft: number;
    scrollWidth: number;
    clientWidth: number;
  }>({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 });
  const prevCountRef = useRef<number>(insights.length);

  // Drive the edge-fade mask off the scroll position. Treat a 1px threshold as
  // "at the edge" so tiny sub-pixel scroll offsets don't leave a stray fade.
  const recalcEdges = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const canLeft = el.scrollLeft > 1;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdgeState((prev) => (prev.left === canLeft && prev.right === canRight ? prev : { left: canLeft, right: canRight }));
    lastScrollStateRef.current = {
      scrollLeft: el.scrollLeft,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    };
  }, []);

  // Recalculate on mount and when the container resizes. ResizeObserver
  // covers both viewport resizes and changes to the surrounding chat layout.
  useEffect(() => {
    recalcEdges();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recalcEdges());
    ro.observe(el);
    return () => ro.disconnect();
  }, [recalcEdges]);

  // When new cards land on the right, smooth-scroll to reveal them so the
  // older cards visibly slide leftwards; the motion is the user's cue that
  // new content just arrived. Only follow the tail when the user was already
  // at (or near) the right edge - if they've scrolled back to read earlier
  // cards, we leave their view alone.
  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = insights.length;
    const el = containerRef.current;
    if (!el) return;
    if (insights.length > prevCount) {
      const prev = lastScrollStateRef.current;
      const wasAtTail =
        prev.scrollWidth === 0 ||
        prev.scrollLeft + prev.clientWidth >= prev.scrollWidth - TAIL_THRESHOLD_PX;
      if (wasAtTail) {
        el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      }
    }
    recalcEdges();
  }, [insights.length, recalcEdges]);

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
    recalcEdges();
  }, [recalcEdges]);

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

  // Apple-style edge fade: the content at whichever edge is still scrollable
  // fades into the background, signalling "there's more here" without a mouse-
  // only affordance. Pointer events pass straight through because the mask is
  // applied to the scroll container itself, not an overlay.
  const maskImage = buildEdgeMask(edgeState.left, edgeState.right);
  const maskStyle: React.CSSProperties | undefined = maskImage
    ? ({
        maskImage,
        WebkitMaskImage: maskImage,
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      ref={containerRef}
      className={`flex gap-2 overflow-x-auto pb-1 px-3 scrollbar-none ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
      style={maskStyle}
      onScroll={recalcEdges}
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
