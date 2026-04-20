"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const SaleyardComparisonChart = dynamic(
  () => import("./saleyard-chart").then((m) => ({ default: m.SaleyardComparisonChart })),
  { ssr: false, loading: () => <div className="flex h-[320px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-text-muted" /></div> }
);

export function LazyChart({
  data,
}: {
  data: { name: string; portfolioValue: number; distanceKm: number | null }[];
}) {
  return <SaleyardComparisonChart data={data} />;
}
