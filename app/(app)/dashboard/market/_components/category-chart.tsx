"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { RangePicker, sliceToRange, type RangeValue } from "./range-picker";
import type { WeeklyPoint } from "../_constants";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateLabel(iso: string, showYear: boolean): string {
  const [y, m, d] = iso.split("-");
  if (showYear) return `${MONTH_NAMES[parseInt(m) - 1]} ${y.slice(2)}`;
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1]}`;
}

function fullDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

interface CategoryChartProps {
  series: WeeklyPoint[];
  herdReferencePrice?: number | null;
  herdReferenceLabel?: string;
  defaultRange?: RangeValue;
  showSeasonalBand?: boolean;
  historicalSeries?: WeeklyPoint[];
  height?: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number | null; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-chart-tooltip-bg px-3 py-2 text-xs shadow-lg ring-1 ring-chart-tooltip-border">
      <p className="text-text-muted">{label}</p>
      {payload.map((p, i) => (
        p.value != null ? (
          <p key={i} className="mt-0.5 font-semibold tabular-nums text-white" style={{ color: p.color }}>
            {p.name}: ${p.value.toFixed(2)}/kg
          </p>
        ) : null
      ))}
    </div>
  );
}

export function CategoryChart({
  series,
  herdReferencePrice,
  herdReferenceLabel,
  defaultRange = { key: "1Y" },
  showSeasonalBand,
  historicalSeries,
  height = 260,
}: CategoryChartProps) {
  const [range, setRange] = useState<RangeValue>(defaultRange);

  const sliced = useMemo(() => sliceToRange(series, range), [series, range]);

  const showYearOnAxis = useMemo(() => {
    if (sliced.length < 2) return false;
    return sliced[0].week_date.slice(0, 4) !== sliced[sliced.length - 1].week_date.slice(0, 4);
  }, [sliced]);

  const chartData = useMemo(() => {
    // Build seasonal band: for each point, find same month-day avg from historical years
    let seasonalMap: Map<string, { low: number; high: number; avg: number }> | null = null;
    if (showSeasonalBand && historicalSeries && historicalSeries.length > 0) {
      const byMonth = new Map<string, number[]>();
      for (const h of historicalSeries) {
        const mm = h.week_date.slice(5, 7);
        const arr = byMonth.get(mm) ?? [];
        arr.push(h.avg_price);
        byMonth.set(mm, arr);
      }
      seasonalMap = new Map();
      for (const [mm, arr] of byMonth) {
        arr.sort((a, b) => a - b);
        const lowIdx = Math.floor(arr.length * 0.1);
        const highIdx = Math.ceil(arr.length * 0.9) - 1;
        const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
        seasonalMap.set(mm, {
          low: arr[Math.max(0, lowIdx)],
          high: arr[Math.min(arr.length - 1, highIdx)],
          avg,
        });
      }
    }

    return sliced.map((p) => {
      const mm = p.week_date.slice(5, 7);
      const band = seasonalMap?.get(mm);
      return {
        date: p.week_date,
        label: formatDateLabel(p.week_date, showYearOnAxis),
        fullLabel: fullDateLabel(p.week_date),
        value: p.avg_price,
        seasonalLow: band?.low,
        seasonalRange: band ? band.high - band.low : undefined,
      };
    });
  }, [sliced, showYearOnAxis, showSeasonalBand, historicalSeries]);

  const { min, max, last } = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0, last: 0 };
    const values = chartData.map((c) => c.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      last: values[values.length - 1],
    };
  }, [chartData]);

  if (series.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-text-muted">
        No data available.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted">Latest</p>
          <p className="text-xl font-semibold tabular-nums text-text-primary">
            ${last.toFixed(2)}<span className="text-sm font-normal text-text-muted">/kg</span>
          </p>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="mkt-value-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
          {showSeasonalBand && (
            <>
              <Area
                type="monotone"
                dataKey="seasonalLow"
                stackId="band"
                stroke="transparent"
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="seasonalRange"
                stackId="band"
                stroke="transparent"
                fill="color-mix(in srgb, var(--color-chart-neutral) 20%, transparent)"
                isAnimationActive={false}
                name="5yr band"
              />
            </>
          )}
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
            tick={{ fill: "var(--color-chart-axis)", fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-chart-axis)", fontSize: 11 }}
            width={56}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} labelFormatter={(_, payload) => {
            const p = payload?.[0]?.payload as { fullLabel?: string } | undefined;
            return p?.fullLabel ?? "";
          }} />
          {min !== max && (
            <>
              <ReferenceLine y={max} stroke="var(--color-chart-reference)" strokeDasharray="4 4" label={{ value: `High $${max.toFixed(2)}`, position: "insideTopRight", fill: "var(--color-chart-axis)", fontSize: 10 }} />
              <ReferenceLine y={min} stroke="var(--color-chart-reference)" strokeDasharray="4 4" label={{ value: `Low $${min.toFixed(2)}`, position: "insideBottomRight", fill: "var(--color-chart-axis)", fontSize: 10 }} />
            </>
          )}
          {herdReferencePrice != null && (
            <ReferenceLine
              y={herdReferencePrice}
              stroke="var(--color-indigo)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              label={{
                value: herdReferenceLabel ?? `Your herd $${herdReferencePrice.toFixed(2)}`,
                position: "insideLeft",
                fill: "var(--color-indigo)",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            name="Avg $/kg"
            stroke="var(--color-brand)"
            strokeWidth={2.25}
            fill="url(#mkt-value-grad)"
            dot={false}
            activeDot={{ r: 4, fill: "var(--color-brand)", strokeWidth: 0 }}
            isAnimationActive
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
