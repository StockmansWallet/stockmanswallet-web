"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { broadcastToPeerConnections } from "@/app/(app)/dashboard/farmer-network/connections/broadcast-actions";

interface BroadcastButtonProps {
  recipientCount: number;
}

/**
 * Opens a composer that sends one message to every approved peer
 * connection at once. Shown at the top of the Connected section on the
 * My Connections page when the user has two or more connections - a
 * single-connection user would just DM them directly.
 */
export function BroadcastButton({ recipientCount }: BroadcastButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    const result = await broadcastToPeerConnections(trimmed);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setSuccess(result.recipientCount ?? recipientCount);
    setContent("");
    router.refresh();
  };

  const reset = () => {
    setOpen(false);
    setError(null);
    setSuccess(null);
    setContent("");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
        onClick={() => setOpen(true)}
      >
        <Megaphone className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Broadcast
      </Button>

      <Modal open={open} onClose={reset} title="Broadcast to your connections" size="md">
        {success != null ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Sent to <span className="font-semibold text-text-primary">{success}</span>{" "}
              connection{success === 1 ? "" : "s"}.
            </p>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={reset}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">
              This will send one message to each of your {recipientCount} approved
              connections. Each recipient sees it in their 1:1 chat and can reply to you
              privately. No one sees who else received it.
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="Write your broadcast message..."
              className="w-full resize-none rounded-xl border border-white/10 bg-surface-lowest p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-orange-500/40 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
            />
            <p className="text-[11px] text-text-muted">
              {content.length} / 5000
            </p>
            {error && (
              <p role="alert" className="text-xs text-error">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
                onClick={reset}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={loading || content.trim().length === 0}
              >
                <Megaphone className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {loading ? "Sending..." : `Send to ${recipientCount}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
