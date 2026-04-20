"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const PropertyComparisonChart = dynamic(
  () => import("./property-comparison-chart").then((m) => ({ default: m.PropertyComparisonChart })),
  { ssr: false, loading: () => <div className="flex h-[320px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-text-muted" /></div> }
);

export function LazyChart({
  data,
}: {
  data: { name: string; totalValue: number; headCount: number }[];
}) {
  return <PropertyComparisonChart data={data} />;
}
