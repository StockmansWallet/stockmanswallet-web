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
          className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
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
      className="border border-white/[0.08] bg-white/[0.04] text-text-muted hover:border-error/30 hover:bg-error/10 hover:text-error"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="mr-1 h-3.5 w-3.5" />
      Delete
    </Button>
  );
}
