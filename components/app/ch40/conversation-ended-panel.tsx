"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/app/user-avatar";
import { sendProducerConnectionRequest } from "@/app/(app)/dashboard/ch40/directory/actions";

interface ConversationEndedPanelProps {
  otherUserId: string;
  otherName: string;
  otherCompany?: string | null;
  avatarUrl?: string | null;
  /**
   * Underlying connection_requests.status of the now-ended row. Drives
   * the headline so the user understands whether they were disconnected,
   * timed out, or had a request declined.
   */
  endedStatus: "removed" | "expired" | "denied";
}

const HEADLINE: Record<ConversationEndedPanelProps["endedStatus"], (name: string) => string> = {
  removed: (name) => `${name} disconnected`,
  expired: (name) => `Your connection with ${name} expired`,
  denied: (name) => `${name} declined your request`,
};

const BODY: Record<ConversationEndedPanelProps["endedStatus"], string> = {
  removed:
    "The chat is closed for both of you. You can send a new connection request to reopen it.",
  expired:
    "Connection access has lapsed. You can send a new connection request to reopen it.",
  denied:
    "You can send another connection request later if you'd like to try again.",
};

export function ConversationEndedPanel({
  otherUserId,
  otherName,
  otherCompany,
  avatarUrl,
  endedStatus,
}: ConversationEndedPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReHail = async () => {
    setLoading(true);
    setError(null);
    const result = await sendProducerConnectionRequest(otherUserId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    // Leave the dead-URL chat slot. The hub root surfaces the new pending
    // request in the Awaiting Response rail; bouncing there avoids the
    // closure panel sticking around for a connection that no longer
    // describes the latest state.
    router.push("/dashboard/ch40");
    router.refresh();
  };

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <UserAvatar
          name={otherName}
          avatarUrl={avatarUrl ?? null}
          sizeClass="h-16 w-16"
        />
        <h2 className="text-text-primary mt-4 text-lg font-semibold">
          {HEADLINE[endedStatus](otherName)}
        </h2>
        {otherCompany && (
          <p className="text-text-secondary mt-0.5 text-sm">{otherCompany}</p>
        )}
        <p className="text-text-muted mt-3 text-sm">{BODY[endedStatus]}</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button variant="primary" onClick={handleReHail} disabled={loading}>
            <Handshake className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {loading ? "Sending..." : "Re-request Connection"}
          </Button>
          {error && (
            <p role="alert" className="text-error text-xs">
              {error}
            </p>
          )}
          <Link
            href="/dashboard/ch40"
            className="text-text-secondary hover:text-text-primary text-xs font-medium transition-colors"
          >
            Back to Ch 40
          </Link>
        </div>
      </div>
    </div>
  );
}
