"use client";

import { useState, useCallback } from "react";
import { Table2, FlaskConical, MapPin, BookOpen } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"table" | "calculator" | "saleyards" | "logic">("table");
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
      {/* Summary strip + Net Value cards */}
      <div className="flex items-stretch gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-surface-secondary px-4 py-3">
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
        <div className="flex gap-2">
          <HeroCard label="Net Value" value={`$${Math.round(totalNetValue).toLocaleString()}`} />
          <HeroCard label="Per Head" value={totalHead > 0 ? `$${Math.round(totalNetValue / totalHead).toLocaleString()}` : "-"} />
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-surface-secondary p-1 w-fit">
        <TabButton active={activeTab === "table"} onClick={() => setActiveTab("table")} icon={Table2}>
          Herd Breakdown
        </TabButton>
        <TabButton active={activeTab === "calculator"} onClick={() => setActiveTab("calculator")} icon={FlaskConical}>
          Test Calculator
        </TabButton>
        <TabButton active={activeTab === "saleyards"} onClick={() => setActiveTab("saleyards")} icon={MapPin}>
          Saleyard Status
        </TabButton>
        <TabButton active={activeTab === "logic"} onClick={() => setActiveTab("logic")} icon={BookOpen}>
          Calculation Logic
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
      {activeTab === "logic" && <LogicPanel />}
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

function HeroCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-center rounded-xl border border-brand/20 bg-brand/[0.04] px-5 py-3 min-w-[120px]">
      <p className="text-[10px] text-text-muted mb-0.5">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-brand">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children, icon: Icon }: { active: boolean; onClick: () => void; children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-rose-500/15 text-rose-400"
          : "text-text-muted hover:text-text-primary hover:bg-white/[0.04]"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
