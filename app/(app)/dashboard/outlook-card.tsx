"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { PortfolioChart, PortfolioChartRangePicker } from "./portfolio-chart";

type DateRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "All";

interface OutlookCardProps {
  data: { date: string; value: number }[];
}

export function OutlookCard({ data }: OutlookCardProps) {
  const [range, setRange] = useState<DateRange>("All");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
              <Wallet className="h-3.5 w-3.5 text-brand" />
            </div>
            <div>
              <CardTitle>Outlook</CardTitle>
              <p className="mt-1 text-xs text-text-muted">Portfolio value over time</p>
            </div>
          </div>
          <PortfolioChartRangePicker range={range} onRangeChange={setRange} />
        </div>
      </CardHeader>
      <CardContent>
        <PortfolioChart data={data} range={range} />
      </CardContent>
    </Card>
  );
}
