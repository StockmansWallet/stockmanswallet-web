"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { sellHerd, type SellHerdData } from "@/app/(app)/dashboard/herds/sell-actions";
import Link from "next/link";
import { DollarSign, Package, Truck, FileText, AlertTriangle } from "lucide-react";

interface SellStockFormProps {
  herd: {
    id: string;
    name: string;
    breed: string;
    category: string;
    species: string;
    head_count: number;
    current_weight: number;
    selected_saleyard: string | null;
    additional_info: string | null;
    age_months: number;
  };
  suggestedPricePerKg: number;
  projectedWeight: number;
  priceSource: string;
}

export function SellStockForm({ herd, suggestedPricePerKg, projectedWeight, priceSource }: SellStockFormProps) {
  const [pricingType, setPricingType] = useState<"per_kg" | "per_head">("per_kg");
  const [pricePerKg, setPricePerKg] = useState(suggestedPricePerKg > 0 ? suggestedPricePerKg.toFixed(2) : "");
  const [pricePerHead, setPricePerHead] = useState("");
  const [headCount, setHeadCount] = useState(String(herd.head_count));
  const [saleType, setSaleType] = useState("");
  const [saleLocation, setSaleLocation] = useState(herd.selected_saleyard ?? "");
  const [saleDate, setSaleDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [freightCost, setFreightCost] = useState("");
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headSold = Math.max(0, Math.min(parseInt(headCount) || 0, herd.head_count));
  const isFullSale = headSold === herd.head_count;
  const weight = projectedWeight > 0 ? projectedWeight : herd.current_weight;

  const totalGrossValue = useMemo(() => {
    if (pricingType === "per_kg") {
      const ppk = parseFloat(pricePerKg) || 0;
      return Math.round(ppk * weight * headSold);
    } else {
      const pph = parseFloat(pricePerHead) || 0;
      return Math.round(pph * headSold);
    }
  }, [pricingType, pricePerKg, pricePerHead, weight, headSold]);

  const freight = parseFloat(freightCost) || 0;
  const netValue = Math.round(totalGrossValue - freight);

  const effectivePricePerKg = useMemo(() => {
    if (pricingType === "per_kg") return parseFloat(pricePerKg) || 0;
    const pph = parseFloat(pricePerHead) || 0;
    return weight > 0 ? pph / weight : 0;
  }, [pricingType, pricePerKg, pricePerHead, weight]);

  const isValid = headSold > 0 && (
    pricingType === "per_kg" ? (parseFloat(pricePerKg) || 0) > 0 : (parseFloat(pricePerHead) || 0) > 0
  );

  async function handleConfirmSale() {
    setSubmitting(true);
    setError(null);

    const data: SellHerdData = {
      herdId: herd.id,
      headCount: headSold,
      pricingType,
      pricePerKg: effectivePricePerKg,
      pricePerHead: pricingType === "per_head" ? parseFloat(pricePerHead) || 0 : null,
      averageWeight: weight,
      saleType: saleType || null,
      saleLocation: saleLocation || null,
      saleDate: new Date(saleDate).toISOString(),
      freightCost: freight,
      freightDistance: 0,
      notes: notes || null,
      totalGrossValue,
      netValue,
      isFullSale,
    };

    const result = await sellHerd(data);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      setShowConfirm(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stock and Date */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
              <Package className="h-3.5 w-3.5 text-brand" />
            </div>
            <CardTitle>Stock Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">Head to Sell</label>
              <input
                type="number"
                min={1}
                max={herd.head_count}
                value={headCount}
                onChange={(e) => setHeadCount(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
              <p className="mt-1 text-xs text-text-muted">
                {herd.head_count} available{!isFullSale && headSold > 0 ? ` (partial sale, ${herd.head_count - headSold} remaining)` : ""}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">Sale Date</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
              <DollarSign className="h-3.5 w-3.5 text-brand" />
            </div>
            <CardTitle>Pricing</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          {/* Pricing type toggle */}
          <div className="flex rounded-lg border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setPricingType("per_kg")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pricingType === "per_kg" ? "bg-brand text-white" : "text-text-muted hover:text-text-primary"
              }`}
            >
              Per Kilogram
            </button>
            <button
              type="button"
              onClick={() => setPricingType("per_head")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pricingType === "per_head" ? "bg-brand text-white" : "text-text-muted hover:text-text-primary"
              }`}
            >
              Per Head
            </button>
          </div>

          {pricingType === "per_kg" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">Price per kg ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
              {suggestedPricePerKg > 0 && (
                <p className="mt-1 text-xs text-text-muted">
                  Suggested: ${suggestedPricePerKg.toFixed(2)}/kg ({priceSource === "saleyard" ? "saleyard price" : "national average"})
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">Price per head ($)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={pricePerHead}
                onChange={(e) => setPricePerHead(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
          )}

          {/* Estimated total */}
          {totalGrossValue > 0 && (
            <div className="rounded-lg bg-brand/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-muted">Gross Value</span>
                <span className="text-lg font-bold tabular-nums text-brand">${totalGrossValue.toLocaleString()}</span>
              </div>
              {freight > 0 && (
                <>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm text-text-muted">Freight</span>
                    <span className="text-sm tabular-nums text-error">-${freight.toLocaleString()}</span>
                  </div>
                  <div className="mt-2 border-t border-white/10 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-muted">Net Value</span>
                      <span className="text-lg font-bold tabular-nums text-brand">${netValue.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}
              <p className="mt-1 text-xs text-text-muted">
                {headSold} head x {weight > 0 ? `${Math.round(weight)} kg x ` : ""}
                {pricingType === "per_kg" ? `$${(parseFloat(pricePerKg) || 0).toFixed(2)}/kg` : `$${(parseFloat(pricePerHead) || 0).toLocaleString()}/head`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
              <Truck className="h-3.5 w-3.5 text-brand" />
            </div>
            <CardTitle>Sale Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">Sale Type</label>
              <select
                value={saleType}
                onChange={(e) => setSaleType(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              >
                <option value="">Not specified</option>
                <option value="Saleyard">Saleyard</option>
                <option value="Private Sale">Private Sale</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">Sale Location</label>
              <input
                type="text"
                value={saleLocation}
                onChange={(e) => setSaleLocation(e.target.value)}
                placeholder="Saleyard or location name"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">Freight Cost ($)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={freightCost}
              onChange={(e) => setFreightCost(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand sm:max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
              <FileText className="h-3.5 w-3.5 text-brand" />
            </div>
            <CardTitle>Notes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional sale details, buyer info, etc."
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href={`/dashboard/herds/${herd.id}`}>
          <Button
            variant="ghost"
            className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
          >
            Cancel
          </Button>
        </Link>
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={!isValid}
        >
          {isFullSale ? "Record Sale" : `Sell ${headSold} Head`}
        </Button>
      </div>

      {/* Confirmation modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Sale" size="sm">
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            <strong>{isFullSale ? "Full sale" : "Partial sale"}</strong> of{" "}
            <strong>{headSold} head</strong> from <strong>{herd.name}</strong>.
          </p>
          <p>
            Gross value: <strong>${totalGrossValue.toLocaleString()}</strong>
            {freight > 0 ? ` (net $${netValue.toLocaleString()} after freight)` : ""}
          </p>
          {isFullSale && (
            <p className="text-warning">
              This herd will be marked as sold and moved to your sold herds list.
            </p>
          )}
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
            onClick={() => setShowConfirm(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirmSale} disabled={submitting}>
            {submitting ? "Recording..." : "Confirm Sale"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
