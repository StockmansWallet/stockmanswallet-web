"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Info, Ban, Flag, ShieldOff, UserMinus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import {
  blockUser,
  unblockUser,
  reportUser,
} from "./moderation-actions";
import { disconnectFarmer } from "@/app/(app)/dashboard/farmer-network/connections/[id]/actions";

interface ModerationMenuProps {
  targetUserId: string;
  targetName: string;
  alreadyBlocked: boolean;
  /**
   * When provided, the menu includes a Disconnect option that calls
   * disconnectFarmer on this connection id. Only makes sense on the
   * chat page (where a connection exists); omit on the directory
   * profile page where the viewer may not even be connected.
   */
  connectionIdForDisconnect?: string;
}

type Panel = "closed" | "root" | "block-confirm" | "report" | "unblock-confirm" | "disconnect-confirm";

const REPORT_REASONS: Array<{ value: "spam" | "abusive" | "impersonation" | "other"; label: string }> = [
  { value: "spam", label: "Spam or unwanted contact" },
  { value: "abusive", label: "Abusive or threatening behaviour" },
  { value: "impersonation", label: "Impersonation or fake account" },
  { value: "other", label: "Other" },
];

export function ModerationMenu({
  targetUserId,
  targetName,
  alreadyBlocked,
  connectionIdForDisconnect,
}: ModerationMenuProps) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("closed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<typeof REPORT_REASONS[number]["value"]>("spam");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panel !== "root") return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPanel("closed");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [panel]);

  const handleBlock = async () => {
    setLoading(true);
    setError(null);
    const result = await blockUser(targetUserId);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setPanel("closed");
    router.push("/dashboard/farmer-network");
    router.refresh();
  };

  const handleUnblock = async () => {
    setLoading(true);
    setError(null);
    const result = await unblockUser(targetUserId);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setPanel("closed");
    router.refresh();
  };

  const handleDisconnect = async () => {
    if (!connectionIdForDisconnect) return;
    setLoading(true);
    setError(null);
    const result = await disconnectFarmer(connectionIdForDisconnect);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setPanel("closed");
    router.push("/dashboard/farmer-network/connections");
    router.refresh();
  };

  const handleReport = async () => {
    setLoading(true);
    setError(null);
    const result = await reportUser(targetUserId, reportReason, reportDescription);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setReportSent(true);
  };

  const resetReport = () => {
    setPanel("closed");
    setReportReason("spam");
    setReportDescription("");
    setReportSent(false);
    setError(null);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setPanel(panel === "root" ? "closed" : "root")}
          aria-label="Profile actions"
          aria-expanded={panel === "root"}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-lowest text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>

        {panel === "root" && (
          <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-white/10 bg-bg-alt shadow-xl">
            {connectionIdForDisconnect && (
              <button
                type="button"
                onClick={() => setPanel("disconnect-confirm")}
                className="flex w-full items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-white/[0.04]"
              >
                <UserMinus className="h-4 w-4 text-text-muted" aria-hidden="true" />
                Disconnect
              </button>
            )}
            {alreadyBlocked ? (
              <button
                type="button"
                onClick={() => setPanel("unblock-confirm")}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-white/[0.04]"
              >
                <ShieldOff className="h-4 w-4 text-text-muted" aria-hidden="true" />
                Unblock
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPanel("block-confirm")}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-error transition-colors hover:bg-error/[0.06]"
              >
                <Ban className="h-4 w-4" aria-hidden="true" />
                Block producer
              </button>
            )}
            <button
              type="button"
              onClick={() => setPanel("report")}
              className="flex w-full items-center gap-2 border-t border-white/[0.06] px-3 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-white/[0.04]"
            >
              <Flag className="h-4 w-4 text-text-muted" aria-hidden="true" />
              Report producer
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={panel === "disconnect-confirm"}
        onClose={() => setPanel("closed")}
        onConfirm={handleDisconnect}
        title="Disconnect from producer"
        description={`Disconnect from ${targetName}? Chat access ends for both of you. You can reconnect later by sending a new connection request.`}
        confirmLabel="Disconnect"
        loading={loading}
      />

      <ConfirmModal
        open={panel === "block-confirm"}
        onClose={() => setPanel("closed")}
        onConfirm={handleBlock}
        title="Block producer"
        description={`Block ${targetName}? Any connection or pending request ends, and you won't see each other in the directory. You can unblock later from this profile.`}
        confirmLabel="Block"
        loading={loading}
      />

      <ConfirmModal
        open={panel === "unblock-confirm"}
        onClose={() => setPanel("closed")}
        onConfirm={handleUnblock}
        title="Unblock producer"
        description={`Unblock ${targetName}? They'll reappear in the directory and can send you a connection request again.`}
        confirmLabel="Unblock"
        confirmVariant="primary"
        loading={loading}
      />

      <Modal open={panel === "report"} onClose={resetReport} title={`Report ${targetName}`} size="md">
        {reportSent ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Thanks. The report has been filed and will be reviewed by the Stockman&apos;s Wallet team.
            </p>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={resetReport}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-text-muted">Reason</label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/[0.06] bg-surface-lowest px-3 py-2 transition-colors hover:bg-surface"
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reportReason === r.value}
                      onChange={() => setReportReason(r.value)}
                      className="accent-orange-500"
                    />
                    <span className="text-sm text-text-primary">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-text-muted">Details (optional)</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Describe what happened..."
                className="w-full resize-none rounded-xl border border-white/10 bg-surface-lowest p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-producer-network/40 focus:outline-none focus:ring-1 focus:ring-producer-network/20"
              />
            </div>
            {error && (
              <p role="alert" className="text-xs text-error">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
                onClick={resetReport}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleReport} disabled={loading}>
                <Flag className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {loading ? "Sending..." : "Submit Report"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
