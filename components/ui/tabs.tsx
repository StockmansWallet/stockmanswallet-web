"use client";

import { useState, useRef, useEffect, useCallback, useLayoutEffect, type ReactNode } from "react";

type TabAccent =
  | "brangus"
  | "insights"
  | "markets"
  | "yard-book"
  | "reports"
  | "freight-iq"
  | "grid-iq"
  | "producer-network"
  | "advisor";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  /** Optional feature hue. When set, the active tab text and indicator are tinted to match. */
  accent?: TabAccent;
}

// Active text color for each accent. Uses the existing Tailwind feature tokens.
const activeTextByAccent: Record<TabAccent, string> = {
  brangus: "text-brangus-light",
  insights: "text-insights-light",
  markets: "text-markets-light",
  "yard-book": "text-yard-book-light",
  reports: "text-reports-light",
  "freight-iq": "text-freight-iq-text",
  "grid-iq": "text-grid-iq-light",
  "producer-network": "text-producer-network-light",
  advisor: "text-advisor-light",
};

// Sliding-pill indicator background, kept subtle so labels remain readable.
const indicatorByAccent: Record<TabAccent, string> = {
  brangus: "bg-brangus/20",
  insights: "bg-insights/20",
  markets: "bg-markets/20",
  "yard-book": "bg-yard-book/20",
  reports: "bg-reports/20",
  "freight-iq": "bg-freight-iq-dark/30",
  "grid-iq": "bg-grid-iq/20",
  "producer-network": "bg-producer-network/20",
  advisor: "bg-indigo/20",
};

function Tabs({ tabs, defaultTab, accent }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const btn = buttonRefs.current.get(activeTab);
    if (!container || !btn) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const next = {
      left: Math.round(btnRect.left - containerRect.left),
      width: Math.round(btnRect.width),
    };
    setIndicator((current) => {
      if (current.left === next.left && current.width === next.width) return current;
      return next;
    });
    setReady((current) => current || true);
  }, [activeTab]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure]);

  // Re-measure on resize
  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;
  const activeText = accent ? activeTextByAccent[accent] : "text-text-primary";
  const indicatorBg = accent ? indicatorByAccent[accent] : "bg-surface-high";

  return (
    <div>
      {/* Tab bar */}
      <div
        ref={containerRef}
        className="relative mb-6 flex gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-1 backdrop-blur-xl"
      >
        {/* Sliding indicator */}
        <div
          className={`absolute top-1 bottom-1 rounded-full ${indicatorBg} shadow-sm ${ready ? "transition-all duration-250 ease-out" : ""}`}
          style={{ left: indicator.left, width: indicator.width }}
        />

        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) buttonRefs.current.set(tab.id, el);
            }}
            onClick={() => setActiveTab(tab.id)}
            className={`relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              activeTab === tab.id
                ? activeText
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>{activeContent}</div>
    </div>
  );
}

export { Tabs };
export type { TabsProps, Tab, TabAccent };
