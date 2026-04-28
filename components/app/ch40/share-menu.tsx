"use client";

import { useState, useEffect, useRef } from "react";
import { Beef, TrendingUp, Plus, X, MapPin } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import type { MessageAttachment } from "@/lib/types/advisory";
import {
  listMyHerdsForShare,
  listMarketPricesForShare,
} from "@/app/(app)/dashboard/ch40/connections/[id]/actions";

interface ShareMenuProps {
  onAttach: (attachment: MessageAttachment) => void;
  disabled?: boolean;
}

type MenuMode = "closed" | "root" | "herds" | "prices";

interface HerdRow {
  id: string;
  name: string;
  species: string;
  breed: string;
  category: string;
  head_count: number;
  current_weight: number | null;
  initial_weight: number | null;
}

interface PriceRow {
  category: string;
  saleyard: string;
  price_per_kg: number;
  weight_range: string | null;
  breed: string | null;
  data_date: string;
}

export function ShareMenu({ onAttach, disabled }: ShareMenuProps) {
  const [mode, setMode] = useState<MenuMode>("closed");
  const [herds, setHerds] = useState<HerdRow[] | null>(null);
  const [prices, setPrices] = useState<PriceRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close root menu on outside click.
  useEffect(() => {
    if (mode !== "root") return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMode("closed");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [mode]);

  const openHerdPicker = async () => {
    setMode("herds");
    if (herds == null) {
      setLoading(true);
      const result = await listMyHerdsForShare();
      setHerds((result.herds as HerdRow[]) ?? []);
      setLoading(false);
    }
  };

  const openPricePicker = async () => {
    setMode("prices");
    if (prices == null) {
      setLoading(true);
      const result = await listMarketPricesForShare();
      setPrices((result.prices as PriceRow[]) ?? []);
      setLoading(false);
    }
  };

  const shareHerd = (h: HerdRow) => {
    onAttach({
      type: "herd",
      herd_id: h.id,
      name: h.name,
      species: h.species,
      breed: h.breed,
      category: h.category,
      head_count: h.head_count ?? 0,
      current_weight: h.current_weight,
      initial_weight: h.initial_weight,
      estimated_value: null,
    });
    setMode("closed");
  };

  const sharePrice = (p: PriceRow) => {
    onAttach({
      type: "price",
      category: p.category,
      saleyard: p.saleyard,
      price_per_kg: p.price_per_kg,
      weight_range: p.weight_range,
      breed: p.breed,
      data_date: p.data_date,
    });
    setMode("closed");
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMode(mode === "root" ? "closed" : "root")}
          disabled={disabled}
          aria-label="Attach a herd or market price"
          aria-expanded={mode === "root"}
          title="Attach a herd or market price"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all disabled:opacity-40 ${
            mode === "root"
              ? "border-ch40/30 bg-ch40/20 text-ch40-light"
              : "border-ch40/25 bg-ch40/15 text-ch40-light hover:bg-ch40/25 hover:text-ch40-light"
          }`}
        >
          {mode === "root" ? (
            <X className="h-5 w-5" aria-hidden="true" strokeWidth={2.5} />
          ) : (
            <Plus className="h-5 w-5" aria-hidden="true" strokeWidth={2.5} />
          )}
        </button>

        {mode === "root" && (
          <div className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-bg-alt shadow-xl">
            <button
              type="button"
              onClick={openHerdPicker}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ch40/15">
                <Beef className="h-4 w-4 text-ch40-light" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Share a herd</p>
                <p className="text-[11px] text-text-muted">A frozen snapshot of one of your herds</p>
              </div>
            </button>
            <button
              type="button"
              onClick={openPricePicker}
              className="flex w-full items-center gap-3 border-t border-white/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/15">
                <TrendingUp className="h-4 w-4 text-info" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Share a market price</p>
                <p className="text-[11px] text-text-muted">Latest saleyard or national price</p>
              </div>
            </button>
          </div>
        )}
      </div>

      <Modal open={mode === "herds"} onClose={() => setMode("closed")} title="Share a herd" size="md">
        {loading ? (
          <p className="py-8 text-center text-sm text-text-muted">Loading your herds...</p>
        ) : herds && herds.length > 0 ? (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {herds.map((h) => (
              <Card key={h.id} className="cursor-pointer bg-surface transition-all hover:bg-surface-low">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => shareHerd(h)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ch40/15">
                      <Beef className="h-4 w-4 text-ch40-light" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{h.name}</p>
                      <p className="truncate text-xs text-text-secondary">
                        {h.head_count.toLocaleString("en-AU")} head
                        {" \u00B7 "}
                        {h.breed} {h.category}
                      </p>
                    </div>
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-text-muted">
            You don&apos;t have any active herds to share yet.
          </p>
        )}
      </Modal>

      <Modal open={mode === "prices"} onClose={() => setMode("closed")} title="Share a market price" size="md">
        {loading ? (
          <p className="py-8 text-center text-sm text-text-muted">Loading prices...</p>
        ) : prices && prices.length > 0 ? (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {prices.map((p, i) => (
              <Card key={`${p.category}-${p.saleyard}-${i}`} className="cursor-pointer bg-surface transition-all hover:bg-surface-low">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => sharePrice(p)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/15">
                      <TrendingUp className="h-4 w-4 text-info" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {p.category}
                        {p.breed ? ` (${p.breed})` : ""}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {p.saleyard}
                        </span>
                        {p.weight_range && <span>{p.weight_range}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-info">
                        ${(p.price_per_kg / 100).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-text-muted">/kg</p>
                    </div>
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-text-muted">
            No recent market prices available.
          </p>
        )}
      </Modal>
    </>
  );
}
