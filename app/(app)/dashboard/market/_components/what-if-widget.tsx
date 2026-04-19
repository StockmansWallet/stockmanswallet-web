"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import type { CategorySummary } from "../_constants";

interface WhatIfWidgetProps {
  summaries: CategorySummary[];
}

export function WhatIfWidget({ summaries }: WhatIfWidgetProps) {
  const [categorySlug, setCategorySlug] = useState<string>(summaries[0]?.slug ?? "");
  const [weight, setWeight] = useState<string>("450");
  const [head, setHead] = useState<string>("1");

  const selected = useMemo(
    () => summaries.find((s) => s.slug === categorySlug) ?? null,
    [summaries, categorySlug]
  );

  const avg4w = useMemo(() => {
    if (!selected) return null;
    const last4 = selected.sparkline.slice(-4);
    if (last4.length === 0) return null;
    return last4.reduce((s, p) => s + p.avg_price, 0) / last4.length;
  }, [selected]);

  const avg12w = useMemo(() => {
    if (!selected) return null;
    const last12 = selected.sparkline;
    if (last12.length === 0) return null;
    return last12.reduce((s, p) => s + p.avg_price, 0) / last12.length;
  }, [selected]);

  const headN = Math.max(1, parseFloat(head) || 0);
  const kgN = Math.max(0, parseFloat(weight) || 0);
  const totalKg = headN * kgN;

  const format = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  if (!selected) return null;

  const latestGross = selected.latest_price * totalKg;
  const avg4wGross = avg4w != null ? avg4w * totalKg : null;
  const avg12wGross = avg12w != null ? avg12w * totalKg : null;

  return (
    <div className="rounded-2xl bg-surface-lowest p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
          <Calculator className="h-3.5 w-3.5 text-brand" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">What-if calculator</h2>
          <p className="text-xs text-text-muted">Indicative gross at current and recent averages.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-text-muted">Category</span>
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-white/5 focus:ring-brand"
          >
            {summaries.map((s) => (
              <option key={s.slug} value={s.slug}>{s.category}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-text-muted">Head</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={head}
            onChange={(e) => setHead(e.target.value)}
            className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-sm text-text-primary tabular-nums outline-none ring-1 ring-white/5 focus:ring-brand"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-text-muted">Weight (kg/hd)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="10"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-sm text-text-primary tabular-nums outline-none ring-1 ring-white/5 focus:ring-brand"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ResultRow label="At latest" price={selected.latest_price} gross={latestGross} format={format} highlight />
        <ResultRow label="4-wk avg" price={avg4w} gross={avg4wGross} format={format} />
        <ResultRow label="12-wk avg" price={avg12w} gross={avg12wGross} format={format} />
      </div>

      <p className="mt-3 text-[11px] text-text-muted">
        Uses saleyard averages for the selected category. Does not account for breed premiums, grid adjustments, or freight.
      </p>
    </div>
  );
}

function ResultRow({
  label,
  price,
  gross,
  format,
  highlight,
}: {
  label: string;
  price: number | null;
  gross: number | null;
  format: (v: number) => string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl px-3.5 py-2.5 ${highlight ? "bg-brand/10 ring-1 ring-brand/30" : "bg-surface"}`}>
      <p className="text-[11px] text-text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">
        {gross != null ? format(gross) : "-"}
      </p>
      <p className="text-[11px] text-text-muted tabular-nums">
        {price != null ? `$${price.toFixed(2)}/kg` : "no data"}
      </p>
    </div>
  );
}
