"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const LandValueChart = dynamic(
  () => import("./land-value-chart").then((m) => ({ default: m.LandValueChart })),
  { ssr: false, loading: () => <div className="flex h-[320px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-text-muted" /></div> }
);

export function LazyChart({
  data,
}: {
  data: { name: string; valuePerAcre: number }[];
}) {
  return <LandValueChart data={data} />;
}
