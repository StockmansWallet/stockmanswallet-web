"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    const result = await removeClient(connectionId);
    if (result?.error) {
      setRemoving(false);
      setShowConfirm(false);
    } else {
      router.push("/dashboard/advisor/clients");
    }
  }

  if (!showConfirm) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Remove Client
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
      <p className="text-xs text-red-400">
        Remove {clientName}? This cannot be undone.
      </p>
      <Button
        size="sm"
        onClick={handleRemove}
        disabled={removing}
        className="bg-red-600 text-white hover:bg-red-700"
      >
        {removing ? "Removing..." : "Confirm"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowConfirm(false)}
        disabled={removing}
      >
        Cancel
      </Button>
    </div>
  );
}
