"use client";

import { useMemo } from "react";
import { Layers, MapPinned, Tags } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { useDemoMode } from "@/components/app/demo-mode-provider";

type Props = {
  baseTotalHead: number;
  baseHerdCount: number;
  propertyCount: number;
};

export function PortfolioStatStripWithOverlay({
  baseTotalHead,
  baseHerdCount,
  propertyCount,
}: Props) {
  const { isDemoUser, localHerds } = useDemoMode();

  const { totalHead, herdCount } = useMemo(() => {
    if (!isDemoUser || localHerds.length === 0) {
      return { totalHead: baseTotalHead, herdCount: baseHerdCount };
    }
    const active = localHerds.filter((h) => !h.is_sold && !h.is_deleted);
    const addedHead = active.reduce((s, h) => s + (h.head_count ?? 0), 0);
    return {
      totalHead: baseTotalHead + addedHead,
      herdCount: baseHerdCount + active.length,
    };
  }, [isDemoUser, localHerds, baseTotalHead, baseHerdCount]);

  return (
    <div className="grid grid-cols-3 items-stretch gap-3 lg:gap-4">
      <StatCard
        icon={<Tags className="h-3.5 w-3.5" />}
        label="Head"
        value={totalHead.toLocaleString()}
      />
      <StatCard icon={<Layers className="h-3.5 w-3.5" />} label="Herds" value={String(herdCount)} />
      <StatCard
        icon={<MapPinned className="h-3.5 w-3.5" />}
        label="Properties"
        value={String(propertyCount)}
      />
    </div>
  );
}
