"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { deleteLensReport } from "../../lens-report-actions";

interface DeleteLensButtonProps {
  connectionId: string;
  lensReportId: string;
  lensName: string;
}

export function DeleteLensButton({
  connectionId,
  lensReportId,
  lensName,
}: DeleteLensButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Delete &quot;{lensName}&quot;?</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await deleteLensReport(connectionId, lensReportId);
              router.push(`/dashboard/advisor/clients/${connectionId}`);
            });
          }}
        >
          {isPending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="mr-1 h-3.5 w-3.5" />
          )}
          Delete
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="mr-1 h-3.5 w-3.5" />
      Delete
    </Button>
  );
}
