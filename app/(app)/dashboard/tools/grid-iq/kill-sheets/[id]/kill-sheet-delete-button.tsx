"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function KillSheetDeleteButton({
  killSheetId,
}: {
  killSheetId: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("kill_sheet_records")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", killSheetId);

      if (error) throw error;
      router.push("/dashboard/tools/grid-iq/library?tab=kill-sheets");
      router.refresh();
    } catch {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-400">Delete this kill sheet?</span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Confirm"
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-text-muted hover:text-red-400"
      onClick={() => setShowConfirm(true)}
    >
      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
      Delete
    </Button>
  );
}
