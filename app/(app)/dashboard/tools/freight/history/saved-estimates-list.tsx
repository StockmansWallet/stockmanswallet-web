"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Share2, Check, Trash2, DollarSign, Truck, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildFreightShareText } from "@/lib/freight/share-formatter";
import { deleteSavedFreightEstimate } from "../actions";

export interface SavedEstimate {
  id: string;
  originPropertyName: string;
  destinationName: string;
  herdName: string;
  categoryName: string;
  headCount: number;
  averageWeightKg: number;
  headsPerDeck: number;
  decksRequired: number;
  distanceKm: number;
  ratePerDeckPerKm: number;
  totalCost: number;
  costPerHead: number;
  costPerDeck: number;
  costPerKm: number;
  assumptionsSummary: string;
  categoryWarning: string | null;
  efficiencyPrompt: string | null;
  breederAutoDetectNotice: string | null;
  shortCartNotice: string | null;
  savedAt: string;
}

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString("en-AU")}`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export function SavedEstimatesList({ estimates }: { estimates: SavedEstimate[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [list, setList] = useState(estimates);
  const [shareCopiedId, setShareCopiedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleShare(estimate: SavedEstimate) {
    const text = buildFreightShareText({
      originName: estimate.originPropertyName,
      destinationName: estimate.destinationName,
      herdName: estimate.herdName,
      headCount: estimate.headCount,
      averageWeightKg: estimate.averageWeightKg,
      distanceKm: estimate.distanceKm,
      totalCost: estimate.totalCost,
      costPerHead: estimate.costPerHead,
      costPerDeck: estimate.costPerDeck,
      decksRequired: estimate.decksRequired,
      assumptions: estimate.assumptionsSummary,
    });
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Freight IQ Estimate", text });
        return;
      } catch {
        // Fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareCopiedId(estimate.id);
      setTimeout(() => setShareCopiedId((id) => (id === estimate.id ? null : id)), 2000);
    } catch {
      setError("Unable to copy to clipboard");
    }
  }

  function handleDelete(id: string) {
    setError(null);
    setPendingDeleteId(id);
    startTransition(async () => {
      const res = await deleteSavedFreightEstimate(id);
      setPendingDeleteId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      setList((rows) => rows.filter((r) => r.id !== id));
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-400" role="alert">{error}</p>
      )}
      {list.map((estimate) => {
        const isExpanded = expandedId === estimate.id;
        const isCopied = shareCopiedId === estimate.id;
        const isDeleting = isPending && pendingDeleteId === estimate.id;
        return (
          <Card key={estimate.id}>
            <CardContent className="p-0">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : estimate.id)}
                className="flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <span className="truncate">{estimate.originPropertyName}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                  <span className="truncate">{estimate.destinationName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                  {estimate.herdName && <span>{estimate.herdName}</span>}
                  <span>{estimate.headCount} head</span>
                  <span>{Math.round(estimate.distanceKm)} km</span>
                  <span className="ml-auto font-semibold text-sky-400">
                    {formatCurrency(estimate.totalCost)}
                    <span className="ml-1 text-[10px] font-medium text-text-muted">+GST</span>
                  </span>
                </div>
                <div className="text-[11px] text-text-muted">{formatDate(estimate.savedAt)}</div>
              </button>

              {isExpanded && (
                <div className="border-t border-white/[0.06] px-5 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <DetailStat icon={<DollarSign className="h-4 w-4" />} label="Total" value={formatCurrency(estimate.totalCost)} />
                    <DetailStat icon={<span className="text-xs font-bold">hd</span>} label="Per Head" value={formatCurrency(estimate.costPerHead)} />
                    <DetailStat icon={<Truck className="h-4 w-4" />} label="Per Deck" value={formatCurrency(estimate.costPerDeck)} />
                    <DetailStat icon={<Truck className="h-4 w-4" />} label="Decks" value={estimate.decksRequired.toString()} />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-text-muted">Assumptions</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">{estimate.assumptionsSummary}</p>
                  </div>

                  {estimate.efficiencyPrompt && (
                    <Alert type="success" message={estimate.efficiencyPrompt} />
                  )}
                  {estimate.shortCartNotice && (
                    <Alert type="info" message={estimate.shortCartNotice} />
                  )}
                  {estimate.categoryWarning && (
                    <Alert type="warning" message={estimate.categoryWarning} />
                  )}
                  {estimate.breederAutoDetectNotice && (
                    <Alert type="info" message={estimate.breederAutoDetectNotice} />
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
                      onClick={() => handleShare(estimate)}
                    >
                      {isCopied ? (
                        <><Check className="mr-1.5 h-4 w-4" /> Copied</>
                      ) : (
                        <><Share2 className="mr-1.5 h-4 w-4" /> Share</>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(estimate.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      {isDeleting ? "Removing..." : "Remove"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DetailStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-inset ring-white/[0.06]">
      <div className="flex items-center gap-1.5 text-text-muted">
        <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function Alert({ type, message }: { type: "warning" | "info" | "success"; message: string }) {
  const styles = {
    warning: { bg: "bg-amber-500/10 ring-amber-500/20", icon: <AlertTriangle className="h-4 w-4 text-amber-400" /> },
    info: { bg: "bg-blue-500/10 ring-blue-500/20", icon: <Info className="h-4 w-4 text-blue-400" /> },
    success: { bg: "bg-emerald-500/10 ring-emerald-500/20", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> },
  };
  const s = styles[type];
  return (
    <div className={`flex items-start gap-3 rounded-xl p-3 ring-1 ring-inset ${s.bg}`}>
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <p className="text-xs leading-relaxed text-text-secondary">{message}</p>
    </div>
  );
}
