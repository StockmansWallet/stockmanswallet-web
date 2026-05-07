"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2, Radio, Send } from "lucide-react";
import {
  listGloveboxCh40Recipients,
  shareGloveboxFileToCh40,
  type GloveboxCh40Recipient,
} from "@/app/(app)/dashboard/tools/files/actions";
import { UserAvatar } from "@/components/app/user-avatar";
import { Modal } from "@/components/ui/modal";
import type { GloveboxFileRow } from "@/lib/glovebox/files";

export function GloveboxCh40ShareDialog({
  file,
  open,
  onClose,
}: {
  file: GloveboxFileRow;
  open: boolean;
  onClose: () => void;
}) {
  const [recipients, setRecipients] = useState<GloveboxCh40Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listGloveboxCh40Recipients().then((result) => {
      if (cancelled) return;
      setRecipients(result.recipients);
      setError(result.error ?? null);
      setIsLoading(false);
      setSent(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectedCount = selectedIds.size;
  const canShare = selectedCount > 0 && !isPending && !isLoading;
  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const allSelected = recipients.length > 0 && selectedCount === recipients.length;

  const toggle = (connectionId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(connectionId)) next.delete(connectionId);
      else next.add(connectionId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(recipients.map((recipient) => recipient.connectionId)));
  };

  const clearSelected = () => {
    setSelectedIds(new Set());
  };

  const share = () => {
    if (!canShare) return;
    startTransition(async () => {
      setError(null);
      const result = await shareGloveboxFileToCh40({
        fileId: file.id,
        connectionIds: selectedArray,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSent(true);
      setSelectedIds(new Set());
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Share to Ch 40" size="md">
      <div className="space-y-4">
        <div className="border-brand/15 bg-brand/8 flex items-center gap-3 rounded-lg border p-3">
          <div className="bg-brand/15 text-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Radio className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-text-primary truncate text-sm font-semibold">{file.title}</p>
            <p className="text-text-muted truncate text-xs">{file.original_filename}</p>
          </div>
        </div>

        {error && (
          <div className="border-danger/20 bg-danger/10 text-danger rounded-lg border px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {sent && (
          <div className="border-success/20 bg-success/10 text-success flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            File shared to Ch 40.
          </div>
        )}

        {isLoading ? (
          <div className="text-text-muted flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
        ) : recipients.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-text-muted text-xs">
                {selectedCount} of {recipients.length} selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={allSelected}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearSelected}
                  disabled={selectedCount === 0}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
              {recipients.map((recipient) => {
                const selected = selectedIds.has(recipient.connectionId);
                return (
                  <button
                    key={recipient.connectionId}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(recipient.connectionId)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                      selected
                        ? "border-ch40/35 bg-ch40/15"
                        : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                    }`}
                  >
                    <UserAvatar
                      name={recipient.name}
                      avatarUrl={recipient.avatarUrl}
                      sizeClass="h-10 w-10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary truncate text-sm font-semibold">
                        {recipient.name}
                      </p>
                      <p className="text-text-muted truncate text-xs">
                        {[recipient.company, recipient.location].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {selected ? (
                      <CheckCircle2 className="text-ch40 h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5 text-white/35" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-8 text-center">
            <p className="text-text-primary text-sm font-semibold">No Ch 40 connections yet</p>
            <p className="text-text-muted mt-1 text-sm">
              Connect with producers on Ch 40, then share Glovebox files with them here.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/[0.08]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={share}
            disabled={!canShare}
            className="bg-ch40 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            Share{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
        </div>
      </div>
    </Modal>
  );
}
