"use client";

// Tabs wrapping the Asset Register's two primary sections: Livestock Assets and Portfolio Movement.
// Tab state is synced to the URL (?tab=movement) so it's shareable and survives refresh.
// The PDF export is unaffected - the PDF always contains both sections in sequence.

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { HerdReportData } from "@/lib/types/reports";
import { PageHeaderActionsPortal } from "@/components/ui/page-header-actions-portal";
import { LivestockAssetsSection } from "./livestock-assets-section";
import { PortfolioMovementSection } from "@/components/app/portfolio-movement-section";

type TabId = "livestock" | "movement";

interface AssetRegisterTabsProps {
  herdData: HerdReportData[];
  startDate: string;
  endDate: string;
  selectedPropertyIds: string[];
  children?: ReactNode;
}

export function AssetRegisterTabs({
  herdData,
  startDate,
  endDate,
  selectedPropertyIds,
  children,
}: AssetRegisterTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  // Portfolio Movement is the default tab so the range filter's effect is
  // visible immediately; Livestock Assets is a reference view behind ?tab=livestock.
  const activeTab: TabId = tabParam === "livestock" ? "livestock" : "movement";

  const setActiveTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "movement") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const tabs = useMemo<{ id: TabId; label: string }[]>(
    () => [
      { id: "movement", label: "Portfolio Movement" },
      { id: "livestock", label: "Livestock Assets" },
    ],
    []
  );

  return (
    <div>
      <PageHeaderActionsPortal>
        <div className="flex items-center gap-2">
          <AssetRegisterTabPills
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="header"
          />
          {children}
        </div>
      </PageHeaderActionsPortal>

      <div className="mb-4 lg:hidden">
        <AssetRegisterTabPills
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="body"
        />
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

function AssetRegisterTabPills({
  tabs,
  activeTab,
  onChange,
  variant,
}: {
  tabs: { id: TabId; label: string }[];
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  variant: "header" | "body";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [ready, setReady] = useState(false);
  const isHeader = variant === "header";

  const measure = useCallback(() => {
    const container = containerRef.current;
    const btn = buttonRefs.current.get(activeTab);
    if (!container || !btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const next = {
      left: Math.round(bRect.left - cRect.left),
      width: Math.round(bRect.width),
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

  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={containerRef}
      className={`relative flex gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-1 ${
        isHeader ? "h-9" : ""
      }`}
      role="tablist"
      aria-label="Asset Register sections"
    >
      <div
        className={`bg-reports/15 absolute top-1 bottom-1 rounded-full shadow-sm ${ready ? "transition-all duration-250 ease-out" : ""}`}
        style={{ left: indicator.left, width: indicator.width }}
        aria-hidden="true"
      />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            if (el) buttonRefs.current.set(tab.id, el);
          }}
          onClick={() => onChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`relative z-10 shrink-0 rounded-full font-medium whitespace-nowrap transition-colors duration-150 ${
            activeTab === tab.id ? "text-reports" : "text-text-muted hover:text-text-secondary"
          } ${isHeader ? "h-7 px-3 text-xs" : "flex-1 px-4 py-2 text-sm"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
