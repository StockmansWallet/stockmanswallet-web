"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import { Handshake, Check, Clock, X } from "lucide-react";
import {
  sendFarmerConnectionRequest,
  cancelFarmerConnectionRequest,
} from "@/app/(app)/dashboard/farmer-network/directory/actions";

interface FarmerConnectButtonProps {
  targetUserId: string;
  existingStatus: string | null;
  /**
   * ID of a pending connection this user sent. When non-null, the button
   * surface offers a "Cancel request" action alongside the pending badge.
   * Null when there is no pending request, or when the pending request was
   * sent BY the other party (only the target can approve/deny those).
   */
  pendingRequestIdIfSent: string | null;
}

export function FarmerConnectButton({
  targetUserId,
  existingStatus,
  pendingRequestIdIfSent,
}: FarmerConnectButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(existingStatus);
  const [activePendingId, setActivePendingId] = useState<string | null>(pendingRequestIdIfSent);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (status === "approved") {
    return (
      <Badge variant="success">
        <Check className="mr-1 h-3 w-3" />
        Connected
      </Badge>
    );
  }

  const handleRequest = async () => {
    setLoading(true);
    setError(null);
    const result = await sendFarmerConnectionRequest(targetUserId);
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
    const result = await cancelFarmerConnectionRequest(activePendingId);
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
        <div className="flex flex-col items-start gap-2">
          <Badge variant="warning">
            <Clock className="mr-1 h-3 w-3" />
            Request Pending
          </Badge>
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
            <p role="alert" className="text-xs text-red-400">{error}</p>
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
    <div>
      <Button
        variant="primary"
        onClick={handleRequest}
        disabled={loading}
      >
        <Handshake className="mr-1.5 h-4 w-4" />
        {loading
          ? "Sending..."
          : isDeniedOrExpired || isRemoved
          ? "Re-request Connection"
          : "Connect"}
      </Button>
      {isDeniedOrExpired && (
        <p className="mt-1 text-xs text-text-muted">
          Previous request was {status}. You can send a new one.
        </p>
      )}
      {isRemoved && (
        <p className="mt-1 text-xs text-text-muted">
          Previous connection was removed. You can send a new request.
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
