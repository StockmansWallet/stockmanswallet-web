"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import { Handshake, X } from "lucide-react";
import {
  sendProducerConnectionRequest,
  cancelProducerConnectionRequest,
} from "@/app/(app)/dashboard/producer-network/directory/actions";

interface ProducerConnectButtonProps {
  targetUserId: string;
  existingStatus: string | null;
  /**
   * ID of a pending connection this user sent. When non-null, the button
   * offers a "Cancel Request" action. Null when there is no pending request,
   * or when the pending request was sent BY the other party (only the target
   * can approve/deny those, on the Connections page).
   */
  pendingRequestIdIfSent: string | null;
}

/**
 * Action row for the Producer Profile page. Renders the appropriate
 * Connect / Cancel Request / Re-request button based on current connection
 * state. The status badge itself lives in the header via
 * ProducerConnectionStatusBadge, so this component focuses on the action.
 */
export function ProducerConnectButton({
  targetUserId,
  existingStatus,
  pendingRequestIdIfSent,
}: ProducerConnectButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(existingStatus);
  const [activePendingId, setActivePendingId] = useState<string | null>(pendingRequestIdIfSent);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Nothing to act on once we're connected; the badge in the header
  // communicates the state. Keeping this branch avoids rendering an
  // action row with no button.
  if (status === "approved") return null;

  const handleRequest = async () => {
    setLoading(true);
    setError(null);
    const result = await sendProducerConnectionRequest(targetUserId);
    if (result.error) {
      setError(result.error);
    } else {
      setStatus("pending");
      router.refresh();
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!activePendingId) return;
    setLoading(true);
    setError(null);
    const result = await cancelProducerConnectionRequest(activePendingId);
    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setStatus(null);
    setActivePendingId(null);
    setShowCancelConfirm(false);
    setLoading(false);
    router.refresh();
  };

  if (status === "pending") {
    return (
      <>
        <div className="flex flex-col items-end gap-2">
          {activePendingId ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { setError(null); setShowCancelConfirm(true); }}
              disabled={loading}
            >
              <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Cancel Request
            </Button>
          ) : (
            <p className="text-xs text-text-muted">
              Waiting for you to approve or decline their request on the Connections page.
            </p>
          )}
          {error && (
            <p role="alert" className="text-xs text-error">{error}</p>
          )}
        </div>

        <ConfirmModal
          open={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleCancel}
          title="Cancel connection request"
          description="Withdraw your pending connection request? You can send a new one later."
          confirmLabel="Cancel Request"
          loading={loading}
        />
      </>
    );
  }

  const isDeniedOrExpired = status === "denied" || status === "expired";
  const isRemoved = status === "removed";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant="primary"
        onClick={handleRequest}
        disabled={loading}
      >
        <Handshake className="mr-1.5 h-4 w-4" aria-hidden="true" />
        {loading
          ? "Sending..."
          : isDeniedOrExpired || isRemoved
          ? "Re-request Connection"
          : "Connect"}
      </Button>
      {isDeniedOrExpired && (
        <p className="text-xs text-text-muted">
          Previous request was {status}. You can send a new one.
        </p>
      )}
      {isRemoved && (
        <p className="text-xs text-text-muted">
          Previous connection was removed. You can send a new request.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-error">{error}</p>
      )}
    </div>
  );
}
