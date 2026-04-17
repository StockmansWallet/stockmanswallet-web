"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Check, X } from "lucide-react";
import { acceptClientRequest, declineClientRequest } from "@/app/(app)/dashboard/advisor/clients/actions";

interface PendingRequestCardProps {
  connectionId: string;
  clientName: string;
  clientCompany?: string;
  clientState?: string;
  createdAt: string;
}

export function PendingRequestCard({
  connectionId,
  clientName,
  clientCompany,
  clientState,
  createdAt,
}: PendingRequestCardProps) {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState<"accepted" | "declined" | null>(null);

  const timeAgo = getRelativeTime(createdAt);

  if (resolved === "accepted") {
    return (
      <Card className="bg-green-500/5">
        <CardContent className="flex items-center gap-3 p-4">
          <Check className="h-5 w-5 text-green-400" />
          <p className="text-sm font-medium text-green-400">
            {clientName} accepted. They are now a connected client.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (resolved === "declined") {
    return (
      <Card className="bg-white/[0.02] opacity-60">
        <CardContent className="flex items-center gap-3 p-4">
          <X className="h-5 w-5 text-text-muted" />
          <p className="text-sm text-text-muted">Request from {clientName} declined.</p>
        </CardContent>
      </Card>
    );
  }

  const handleAccept = async () => {
    setLoading(true);
    const result = await acceptClientRequest(connectionId);
    if (!result.error) setResolved("accepted");
    setLoading(false);
  };

  const handleDecline = async () => {
    setLoading(true);
    const result = await declineClientRequest(connectionId);
    if (!result.error) setResolved("declined");
    setLoading(false);
  };

  return (
    <Card className="bg-amber-500/[0.03]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              <span className="text-sm font-bold text-amber-400">
                {clientName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{clientName}</p>
              <div className="mt-0.5 flex items-center gap-2">
                {clientCompany && (
                  <span className="text-xs text-text-secondary">{clientCompany}</span>
                )}
                {clientState && (
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <MapPin className="h-3 w-3" />
                    {clientState}
                  </span>
                )}
                <span className="text-xs text-text-muted">{timeAgo}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="border border-white/[0.08] bg-white/[0.04] text-xs text-text-muted hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
              onClick={handleDecline}
              disabled={loading}
            >
              Decline
            </Button>
            <Button
              variant="teal"
              size="sm"
              onClick={handleAccept}
              disabled={loading}
            >
              {loading ? "..." : "Accept"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
