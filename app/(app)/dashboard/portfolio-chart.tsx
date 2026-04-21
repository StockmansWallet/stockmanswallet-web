"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  value: number;
}

interface ChartPoint {
  label: string;
  value: number | null;
}

interface PortfolioChartProps {
  data: DataPoint[];
}

type DateRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "All";

const DATE_RANGES: DateRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "All"];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/** Format YYYY-MM-DD to "29 Mar" or "29/03/25" when showYear is true. */
function formatDateLabel(dateStr: string, showYear = false): string {
  const [y, m, d] = dateStr.split("-");
  if (showYear) return `${parseInt(d)}/${parseInt(m)}/${y.slice(2)}`;
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1]}`;
}

/** Add N days to a YYYY-MM-DD string, returning a new YYYY-MM-DD string. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00"); // noon avoids DST edge cases
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Subtract N days from a YYYY-MM-DD string. */
function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number | null }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry || entry.value == null) return null;

  const isToday = label === "Today";

  return (
    <div className="bg-chart-tooltip-bg ring-chart-tooltip-border rounded-lg px-3 py-2 text-xs shadow-lg ring-1">
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">{label}</span>
        {isToday && (
          <span className="bg-brand/20 text-brand rounded px-1 py-0.5 text-[9px] font-medium">
            Today
          </span>
        )}
      </div>
      <p className="mt-0.5 font-semibold text-white tabular-nums">
        ${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

/** Range config: days to look back and step between ticks. */
function rangeConfig(range: DateRange): { days: number | null; stepDays: number } {
  switch (range) {
    case "1D":
      return { days: 1, stepDays: 1 };
    case "1W":
      return { days: 7, stepDays: 1 };
    case "1M":
      return { days: 30, stepDays: 1 };
    case "3M":
      return { days: 90, stepDays: 3 };
    case "6M":
      return { days: 180, stepDays: 6 };
    case "1Y":
      return { days: 365, stepDays: 12 };
    case "All":
      return { days: null, stepDays: 3 };
  }
}

/**
 * Build a time axis by stepping through dates from start to end.
 * Each tick gets the value from the nearest data point (if within range),
 * otherwise null. Uses pure string date math to avoid timezone issues.
 */
function buildTimeAxis(
  data: DataPoint[],
  startDateStr: string,
  todayStr: string,
  stepDays: number,
  showYear: boolean
): ChartPoint[] {
  // Build value lookup
  const valueMap = new Map<string, number>();
  for (const d of data) {
    valueMap.set(d.date, d.value);
  }

  const result: ChartPoint[] = [];
  let cursor = startDateStr;

  while (cursor <= todayStr) {
    const isToday = cursor === todayStr;

    // Look for exact match or nearest within step range
    let value: number | null = valueMap.get(cursor) ?? null;
    if (value === null) {
      // Check nearby dates within half the step
      const halfStep = Math.max(Math.floor(stepDays / 2), 1);
      for (let offset = 1; offset <= halfStep; offset++) {
        const before = subtractDays(cursor, offset);
        const after = addDays(cursor, offset);
        if (valueMap.has(before)) {
          value = valueMap.get(before)!;
          break;
        }
        if (valueMap.has(after) && after <= todayStr) {
          value = valueMap.get(after)!;
          break;
        }
      }
    }

    result.push({
      label: isToday ? "Today" : formatDateLabel(cursor, showYear),
      value,
    });

    cursor = addDays(cursor, stepDays);
  }

  // Ensure "Today" is always the last point
  if (result.length === 0 || result[result.length - 1].label !== "Today") {
    result.push({
      label: "Today",
      value: valueMap.get(todayStr) ?? null,
    });
  }

  return result;
}

export function PortfolioChartRangePicker({
  range,
  onRangeChange,
}: {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}) {
  return <SlidingRangePill range={range} onRangeChange={onRangeChange} />;
}

function SlidingRangePill({
  range,
  onRangeChange,
}: {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<DateRange, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const btn = buttonRefs.current.get(range);
    if (!container || !btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setIndicator({ left: bRect.left - cRect.left, width: bRect.width });
    setReady(true);
  }, [range]);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-1 rounded-full bg-white/[0.04] p-0.5"
    >
      <div
        aria-hidden="true"
        className={`bg-brand/20 absolute top-0.5 bottom-0.5 rounded-full ${ready ? "transition-all duration-250 ease-out" : ""}`}
        style={{ left: indicator.left, width: indicator.width }}
      />
      {DATE_RANGES.map((r) => (
        <button
          key={r}
          ref={(el) => {
            if (el) buttonRefs.current.set(r, el);
          }}
          onClick={() => onRangeChange(r)}
          aria-pressed={range === r}
          className={`relative z-10 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            range === r ? "text-brand" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export function PortfolioChart({ data, range }: PortfolioChartProps & { range?: DateRange }) {
  const [internalRange, setInternalRange] = useState<DateRange>("All");
  const activeRange = range ?? internalRange;

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data.length) return [];

    const todayStr = data[data.length - 1].date;
    const { days, stepDays } = rangeConfig(activeRange);

    let startStr: string;
    if (days === null) {
      startStr = data[0].date;
    } else {
      startStr = subtractDays(todayStr, days);
    }

    // For "All", calculate step based on total span
    let actualStep = stepDays;
    const startMs = new Date(startStr + "T12:00:00").getTime();
    const endMs = new Date(todayStr + "T12:00:00").getTime();
    const totalDays = Math.round((endMs - startMs) / 86_400_000);
    if (days === null) {
      actualStep = Math.max(Math.round(totalDays / 12), 1);
    }

    // Show year suffix on labels when the range crosses a year boundary
    const showYear = startStr.slice(0, 4) !== todayStr.slice(0, 4);

    return buildTimeAxis(data, startStr, todayStr, actualStep, showYear);
  }, [data, activeRange]);

  const { minVal, maxVal } = useMemo(() => {
    const values = chartData.map((p) => p.value).filter((v): v is number => v !== null);
    if (values.length === 0) return { minVal: 0, maxVal: 0 };
    return { minVal: Math.min(...values), maxVal: Math.max(...values) };
  }, [chartData]);

  if (!data.length) return null;

  return (
    <div>
      {/* Inline range selector fallback when not controlled externally */}
      {range === undefined && (
        <div className="mb-3 flex justify-center">
          <SlidingRangePill range={activeRange} onRangeChange={setInternalRange} />
        </div>
      )}

      <ResponsiveContainer key={activeRange} width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval={0}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tick={(props: any) => {
              const { x, y, payload, index } = props;
              const total = chartData.length;
              const isFirst = index === 0;
              const isLast = index === total - 1;
              // Show ~5-6 labels max: always first + last, evenly spaced in between.
              // Skip the label just before "Today" if it would overlap.
              const step = Math.max(Math.ceil(total / 6), 1);
              const tooCloseToLast = !isLast && total - 1 - index < step / 2;
              const isVisible = isFirst || isLast || (index % step === 0 && !tooCloseToLast);
              if (!isVisible) return <g />;
              return (
                <text
                  x={x}
                  y={y + 12}
                  fill="var(--color-chart-axis)"
                  fontSize={11}
                  textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
                >
                  {payload.value}
                </text>
              );
            }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-chart-axis)", fontSize: 11 }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          {minVal !== maxVal && (
            <>
              <ReferenceLine y={maxVal} stroke="var(--color-chart-grid)" strokeDasharray="4 4" />
              <ReferenceLine y={minVal} stroke="var(--color-chart-grid)" strokeDasharray="4 4" />
            </>
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-brand)"
            strokeWidth={2.5}
            fill="url(#valueGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "var(--color-brand)", strokeWidth: 0 }}
            connectNulls
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
