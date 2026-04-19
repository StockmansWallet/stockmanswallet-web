"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { RangePicker, sliceToRange, type RangeValue } from "./range-picker";
import { MLA_CATEGORIES, type CategoryTimelineRow } from "../_constants";

// Maps each MLA category to one of the 8 categorical chart tokens.
// Orange is reserved for the primary series on single-line charts, so here
// we skip chart-1 and start from chart-2 for the first category.
const CATEGORY_COLOURS: Record<string, string> = {
  "Grown Steer": "var(--color-chart-2)",
  "Grown Heifer": "var(--color-chart-4)",
  "Grown Bull": "var(--color-chart-7)",
  "Yearling Steer": "var(--color-chart-6)",
  "Yearling Heifer": "var(--color-chart-8)",
  "Weaner Steer": "var(--color-chart-3)",
  "Heifer": "var(--color-violet-light)",
  "Cows": "var(--color-chart-5)",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatAxisDate(iso: string, showYear: boolean): string {
  const [y, m] = iso.split("-");
  return showYear ? `${MONTH_NAMES[parseInt(m) - 1]} ${y.slice(2)}` : MONTH_NAMES[parseInt(m) - 1];
}

function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

interface Props {
  data: CategoryTimelineRow[];
  height?: number;
}

function Tip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number | null; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload
    .filter((p) => p.value != null)
    .sort((a, b) => (b.value as number) - (a.value as number));
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg bg-chart-tooltip-bg px-3 py-2 text-xs shadow-lg ring-1 ring-chart-tooltip-border">
      <p className="text-text-muted">{label ? formatFullDate(label) : ""}</p>
      {rows.map((p, i) => (
        <p key={i} className="mt-0.5 font-semibold tabular-nums" style={{ color: p.color }}>
          {p.name}: ${(p.value as number).toFixed(2)}/kg
        </p>
      ))}
    </div>
  );
}

export function CategoryTimelineChart({ data, height = 240 }: Props) {
  const [range, setRange] = useState<RangeValue>({ key: "1Y" });
  const sliced = useMemo(() => sliceToRange(data, range), [data, range]);

  const showYearOnAxis = useMemo(() => {
    if (sliced.length < 2) return true;
    return sliced[0].week_date.slice(0, 4) !== sliced[sliced.length - 1].week_date.slice(0, 4);
  }, [sliced]);

  const chartData = useMemo(
    () => sliced.map((row) => ({ ...row, label: formatAxisDate(row.week_date, showYearOnAxis) })),
    [sliced, showYearOnAxis]
  );

  if (chartData.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-text-muted">
        No price data for this range.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <RangePicker value={range} onChange={setRange} />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
          <XAxis
            dataKey="week_date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-chart-axis)", fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={40}
            tickFormatter={(iso: string) => formatAxisDate(iso, showYearOnAxis)}
          />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-chart-axis)", fontSize: 11 }}
            width={56}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<Tip />} />
          <Legend
            verticalAlign="bottom"
            align="center"
            height={32}
            iconType="plainline"
            wrapperStyle={{ fontSize: 11, color: "var(--color-text-secondary)", paddingTop: 8 }}
          />
          {MLA_CATEGORIES.map((cat) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              name={cat}
              stroke={CATEGORY_COLOURS[cat] ?? "var(--color-markets)"}
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 3.5, fill: CATEGORY_COLOURS[cat] ?? "var(--color-markets)", strokeWidth: 0 }}
              connectNulls
              isAnimationActive
              animationDuration={600}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
