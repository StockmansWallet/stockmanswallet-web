import { Beef, TrendingUp, MapPin } from "lucide-react";
import type { MessageAttachment } from "@/lib/types/advisory";

const SPECIES_EMOJI: Record<string, string> = {
  Cattle: "\uD83D\uDC04",
  Sheep: "\uD83D\uDC0F",
  Pig: "\uD83D\uDC16",
  Goat: "\uD83D\uDC10",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ShareAttachmentCard({ attachment }: { attachment: MessageAttachment }) {
  if (attachment.type === "herd") {
    return (
      <div className="mt-2 flex min-w-0 items-start gap-3 rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
          <Beef className="h-4 w-4 text-orange-400" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400">
              Shared herd
            </span>
            <span aria-hidden="true" className="text-xs">
              {SPECIES_EMOJI[attachment.species] ?? ""}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
            {attachment.name}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {attachment.head_count.toLocaleString("en-AU")} head
            {" \u00B7 "}
            {attachment.breed} {attachment.category}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
            {attachment.current_weight != null && attachment.current_weight > 0 && (
              <span>Avg {Math.round(attachment.current_weight)} kg</span>
            )}
            {attachment.estimated_value != null && attachment.estimated_value > 0 && (
              <span className="font-medium text-emerald-400">
                ~{formatCurrency(attachment.estimated_value)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Price attachment
  return (
    <div className="mt-2 flex min-w-0 items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15">
        <TrendingUp className="h-4 w-4 text-sky-400" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
          Shared market price
        </span>
        <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
          {attachment.category}
          {attachment.breed ? ` (${attachment.breed})` : ""}
        </p>
        <p className="mt-1 text-lg font-bold text-sky-400">
          ${(attachment.price_per_kg / 100).toFixed(2)}
          <span className="ml-0.5 text-[11px] font-medium text-text-muted">/kg</span>
        </p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {attachment.saleyard}
          </span>
          {attachment.weight_range && <span>{attachment.weight_range}</span>}
          <span>{formatDate(attachment.data_date)}</span>
        </div>
      </div>
    </div>
  );
}
