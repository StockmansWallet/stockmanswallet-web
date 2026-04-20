"use client";

// Tabs wrapping the Asset Register's two primary sections: Livestock Assets and Portfolio Movement.
// Tab state is synced to the URL (?tab=movement) so it's shareable and survives refresh.
// The PDF export is unaffected - the PDF always contains both sections in sequence.

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import type { HerdReportData } from "@/lib/types/reports";
import { LivestockAssetsSection } from "./livestock-assets-section";
import { PortfolioMovementSection } from "@/components/app/portfolio-movement-section";

type TabId = "livestock" | "movement";

interface AssetRegisterTabsProps {
  herdData: HerdReportData[];
  startDate: string;
  endDate: string;
  selectedPropertyIds: string[];
}

export function AssetRegisterTabs({ herdData, startDate, endDate, selectedPropertyIds }: AssetRegisterTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  // Portfolio Movement is the default tab so the range filter's effect is
  // visible immediately; Livestock Assets is a reference view behind ?tab=livestock.
  const activeTab: TabId = tabParam === "livestock" ? "livestock" : "movement";

  const setActiveTab = useCallback((tab: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "movement") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const tabs = useMemo<{ id: TabId; label: string }[]>(() => [
    { id: "movement", label: "Portfolio Movement" },
    { id: "livestock", label: "Livestock Assets" },
  ], []);

  // Sliding pill indicator (matches existing Tabs component styling)
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const btn = buttonRefs.current.get(activeTab);
    if (!container || !btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setIndicator({ left: bRect.left - cRect.left, width: bRect.width });
    setReady(true);
  }, [activeTab]);

  useEffect(() => { measure(); }, [measure]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div>
      {/* Tab bar */}
      <div
        ref={containerRef}
        className="relative mb-4 flex gap-1 rounded-full bg-surface p-1"
        role="tablist"
        aria-label="Asset Register sections"
      >
        <div
          className={`absolute top-1 bottom-1 rounded-full bg-surface-high shadow-sm ${ready ? "transition-all duration-250 ease-out" : ""}`}
          style={{ left: indicator.left, width: indicator.width }}
          aria-hidden="true"
        />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => { if (el) buttonRefs.current.set(tab.id, el); }}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              activeTab === tab.id ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content. Render both but toggle visibility to preserve internal state
          (e.g. the Portfolio Movement period picker and loaded data) when switching tabs. */}
      <div role="tabpanel" hidden={activeTab !== "livestock"}>
        <LivestockAssetsSection herdData={herdData} />
      </div>
      <div role="tabpanel" hidden={activeTab !== "movement"}>
        <PortfolioMovementSection
          startDate={startDate}
          endDate={endDate}
          propertyFilter={selectedPropertyIds}
        />
      </div>
    </div>
  );
}
