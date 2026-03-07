"use client";

import { useState, useCallback } from "react";
import type { HerdWithValuation, SerializedPriceMaps, SaleyardCoverage } from "./page";
import { LogicPanel } from "./logic-panel";
import { ValuationTable } from "./valuation-table";
import { TestCalculator } from "./test-calculator";
import { SaleyardStatus } from "./saleyard-status";

interface Props {
  herds: HerdWithValuation[];
  priceMaps: SerializedPriceMaps;
  saleyardCoverage: SaleyardCoverage[];
}

export function ValuationValidator({ herds, priceMaps, saleyardCoverage }: Props) {
  const [activeTab, setActiveTab] = useState<"table" | "calculator" | "saleyards">("table");
  const [prefillHerdId, setPrefillHerdId] = useState<string | null>(null);

  const handleTestHerd = useCallback((herdId: string) => {
    setPrefillHerdId(herdId);
    setActiveTab("calculator");
  }, []);

  const totalNetValue = herds.reduce((sum, h) => sum + h.valuation.netValue, 0);
  const totalHead = herds.reduce((sum, h) => sum + (h.head_count ?? 0), 0);
  const fallbackCount = herds.filter((h) => h.valuation.priceSource === "fallback").length;
  const nationalCount = herds.filter((h) => h.valuation.priceSource === "national").length;
  const saleyardCount = herds.filter((h) => h.valuation.priceSource === "saleyard").length;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-surface-secondary px-4 py-3">
        <Stat label="Herds" value={herds.length.toString()} />
        <Divider />
        <Stat label="Total Head" value={totalHead.toLocaleString()} />
        <Divider />
        <Stat label="Portfolio Net Value" value={`$${Math.round(totalNetValue).toLocaleString()}`} accent />
        <Divider />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-muted">Price sources:</span>
          <Badge color="emerald" label={`${saleyardCount} saleyard`} />
          <Badge color="amber" label={`${nationalCount} national`} />
          {fallbackCount > 0 && <Badge color="red" label={`${fallbackCount} fallback`} />}
        </div>
      </div>

      {/* Logic panel */}
      <LogicPanel />

      {/* Tab switcher */}
      <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-surface-secondary p-1 w-fit">
        <TabButton active={activeTab === "table"} onClick={() => setActiveTab("table")}>
          Herd Breakdown
        </TabButton>
        <TabButton active={activeTab === "calculator"} onClick={() => setActiveTab("calculator")}>
          Test Calculator
        </TabButton>
        <TabButton active={activeTab === "saleyards"} onClick={() => setActiveTab("saleyards")}>
          Saleyard Status
        </TabButton>
      </div>

      {activeTab === "table" && <ValuationTable herds={herds} onTestHerd={handleTestHerd} />}
      {activeTab === "calculator" && (
        <TestCalculator
          priceMaps={priceMaps}
          saleyardCoverage={saleyardCoverage}
          herds={herds}
          prefillHerdId={prefillHerdId}
          onClearPrefill={() => setPrefillHerdId(null)}
        />
      )}
      {activeTab === "saleyards" && <SaleyardStatus />}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${accent ? "text-brand" : "text-text-primary"}`}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-4 w-px bg-white/[0.08]" />;
}

function Badge({ color, label }: { color: "emerald" | "amber" | "red"; label: string }) {
  const colors = {
    emerald: "bg-emerald-500/15 text-emerald-400",
    amber: "bg-amber-500/15 text-amber-400",
    red: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${colors[color]}`}>
      {label}
    </span>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-white/[0.08] text-text-primary"
          : "text-text-muted hover:text-text-primary hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}
