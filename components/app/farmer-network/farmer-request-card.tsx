"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, MapPin } from "lucide-react";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import { approveFarmerRequest, denyFarmerRequest } from "@/app/(app)/dashboard/farmer-network/connections/actions";

interface FarmerRequestCardProps {
  request: {
    id: string;
    requester_user_id: string;
    requester_name: string;
    requester_company: string;
    created_at: string;
  };
}

export function FarmerRequestCard({ request }: FarmerRequestCardProps) {
  const [loading, setLoading] = useState<"approve" | "deny" | null>(null);
  const [showDenyConfirm, setShowDenyConfirm] = useState(false);

  const handleApprove = async () => {
    setLoading("approve");
    await approveFarmerRequest(request.id);
    setLoading(null);
  };

  const handleDeny = async () => {
    setLoading("deny");
    await denyFarmerRequest(request.id);
    setLoading(null);
    setShowDenyConfirm(false);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                <Handshake className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {request.requester_name}
                </p>
                {request.requester_company && (
                  <p className="text-xs text-text-secondary">{request.requester_company}</p>
                )}
                <p className="mt-1 text-[10px] text-text-muted">
                  Sent {new Date(request.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="border border-white/[0.08] bg-white/[0.04] text-xs text-text-muted hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => setShowDenyConfirm(true)}
                disabled={loading !== null}
              >
                Decline
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                disabled={loading !== null}
              >
                {loading === "approve" ? "..." : "Accept"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmModal
        open={showDenyConfirm}
        onClose={() => setShowDenyConfirm(false)}
        onConfirm={handleDeny}
        title="Decline Request"
        description={`This will decline ${request.requester_name}'s connection request. They will be notified.`}
        confirmLabel="Decline"
        loading={loading === "deny"}
      />
    </>
  );
}
