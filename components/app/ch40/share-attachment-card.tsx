"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  Beef,
  CalendarDays,
  Download,
  FileText,
  Loader2,
  MapPin,
  MessageCircle,
  Scale,
  TrendingUp,
} from "lucide-react";
import { getCh40SharedFileDownloadUrl } from "@/app/(app)/dashboard/ch40/connections/[id]/actions";
import type { MessageAttachment } from "@/lib/types/advisory";

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ShareAttachmentCard({
  attachment,
  connectionId,
}: {
  attachment: MessageAttachment;
  connectionId?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openSharedFile() {
    if (attachment.type !== "file" || !connectionId || downloading) return;
    setDownloading(true);
    setError(null);
    const result = await getCh40SharedFileDownloadUrl(connectionId, attachment.file_id);
    setDownloading(false);

    if ("error" in result) {
      setError(result.error ?? "Could not open file");
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = result.signedUrl;
    anchor.download = result.filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  if (attachment.type === "herd") {
    return (
      <div className="mt-2 min-w-0 overflow-hidden rounded-xl border border-ch40/20 bg-ch40/[0.045] shadow-sm shadow-black/10">
        <div className="flex items-start gap-3 border-b border-white/[0.06] px-3 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ch40/15 ring-1 ring-ch40/15">
            <Beef className="h-4 w-4 text-ch40-light" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ch40-light">
              Shared herd
            </span>
            <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
              {attachment.name}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {attachment.head_count.toLocaleString("en-AU")} head
              {" \u00B7 "}
              {[attachment.breed, attachment.category].filter(Boolean).join(" ")}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-white/[0.06] text-[11px]">
          <HerdMetric
            icon={<Scale className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Average weight"
            value={
              attachment.current_weight != null && attachment.current_weight > 0
                ? `${Math.round(attachment.current_weight)} kg`
                : "Not recorded"
            }
          />
          <HerdMetric
            icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Estimated value"
            value={
              attachment.estimated_value != null && attachment.estimated_value > 0
                ? formatCurrency(attachment.estimated_value)
                : "Not recorded"
            }
          />
          <HerdMetric
            icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Property"
            value={
              attachment.property_name
                ? `${attachment.property_name}${attachment.property_state ? `, ${attachment.property_state}` : ""}`
                : "Not recorded"
            }
          />
          <HerdMetric
            icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Updated"
            value={attachment.last_updated ? formatDate(attachment.last_updated) : "Not recorded"}
          />
        </div>
      </div>
    );
  }

  if (attachment.type === "price") {
    return (
      <div className="mt-2 flex min-w-0 items-start gap-3 rounded-xl border border-info/20 bg-info/[0.04] p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/15">
          <TrendingUp className="h-4 w-4 text-info" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-info">
            Shared market price
          </span>
          <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
            {attachment.category}
            {attachment.breed ? ` (${attachment.breed})` : ""}
          </p>
          <p className="mt-1 text-lg font-bold text-info">
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

  if (attachment.type === "brangus_chat") {
    return (
      <div className="mt-2 flex min-w-0 items-start gap-3 rounded-xl border border-brangus/20 bg-brangus/[0.04] p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brangus/15">
          <MessageCircle className="h-4 w-4 text-brangus" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brangus">
            Shared Brangus chat
          </span>
          <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
            {attachment.title}
          </p>
          {attachment.preview && (
            <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
              {attachment.preview}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (attachment.type === "file") {
    return (
      <div className="mt-2 flex min-w-0 items-start gap-3 rounded-xl border border-ch40/20 bg-ch40/[0.04] p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ch40/15">
          <FileText className="h-4 w-4 text-ch40-light" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ch40-light">
            Shared file
          </span>
          <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
            {attachment.title}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
            {attachment.kind && <span className="capitalize">{attachment.kind}</span>}
            {attachment.size_bytes != null && <span>{formatBytes(attachment.size_bytes)}</span>}
            {attachment.mime_type && <span className="truncate">{attachment.mime_type}</span>}
          </div>
          {connectionId && (
            <button
              type="button"
              onClick={openSharedFile}
              disabled={downloading}
              className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-full border border-ch40/20 bg-ch40/12 px-3 text-[11px] font-semibold text-ch40-light transition-colors hover:bg-ch40/18 disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-3 w-3" aria-hidden="true" />
              )}
              {downloading ? "Opening" : "Open file"}
            </button>
          )}
          {error && <p className="mt-1 text-[11px] text-warning">{error}</p>}
        </div>
      </div>
    );
  }

  // Debug: TypeScript exhaustiveness guard - if MessageAttachment grows a new
  // variant, the type system flags this branch instead of silently rendering
  // the wrong card. Prior version fell through to the price card for any
  // unknown type which is how iOS-only attachments showed as "$NaN/kg".
  const _exhaustive: never = attachment;
  void _exhaustive;
  return null;
}

function HerdMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 bg-surface/80 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-text-primary">{value}</p>
    </div>
  );
}
