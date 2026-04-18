"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import { UserMinus } from "lucide-react";
import { disconnectFarmer } from "./actions";

interface DisconnectButtonProps {
  connectionId: string;
  otherName: string;
}

export function DisconnectButton({ connectionId, otherName }: DisconnectButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    const result = await disconnectFarmer(connectionId);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.push("/dashboard/farmer-network/connections");
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        {error && (
          <p role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { setError(null); setOpen(true); }}
        >
          <UserMinus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Disconnect
        </Button>
      </div>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Disconnect from producer"
        description={`Disconnect from ${otherName}? Chat access ends for both of you. You can reconnect later by sending a new connection request.`}
        confirmLabel="Disconnect"
        loading={loading}
      />
    </>
  );
}
