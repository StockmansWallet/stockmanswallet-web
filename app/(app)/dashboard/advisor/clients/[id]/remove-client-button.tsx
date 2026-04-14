"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import { removeClient } from "../actions";

export function RemoveClientButton({
  connectionId,
  clientName,
}: {
  connectionId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    setLoading(true);
    const result = await removeClient(connectionId);
    if (result?.error) {
      setLoading(false);
    } else {
      router.push("/dashboard/advisor/clients");
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="gap-1.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remove Client
      </Button>
      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleRemove}
        title="Remove Client"
        description={`This will remove ${clientName} from your clients and stop all data sharing. They will need to send a new request to reconnect.`}
        confirmLabel="Remove"
        loading={loading}
      />
    </>
  );
}
