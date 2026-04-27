"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import { disconnectProducer } from "@/app/(app)/dashboard/producer-network/connections/[id]/actions";

interface ProducerConversationRemoveButtonProps {
  connectionId: string;
  targetName: string;
}

export function ProducerConversationRemoveButton({
  connectionId,
  targetName,
}: ProducerConversationRemoveButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    const result = await disconnectProducer(connectionId);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.push("/dashboard/producer-network");
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setError(null);
          setOpen(true);
        }}
        className="text-text-muted hover:text-error rounded-full p-1.5 transition-colors disabled:cursor-not-allowed"
        aria-label={`Remove conversation with ${targetName}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Remove conversation"
        description={`Disconnect from ${targetName}? Chat access ends for both of you. You can reconnect later by sending a new connection request.`}
        confirmLabel={loading ? "Removing..." : "Remove"}
        loading={loading}
      />

      {error && (
        <p role="alert" className="sr-only">
          {error}
        </p>
      )}
    </>
  );
}
