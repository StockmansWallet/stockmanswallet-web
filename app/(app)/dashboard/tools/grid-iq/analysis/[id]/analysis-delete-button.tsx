"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AnalysisDeleteButton({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("grid_iq_analyses")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", analysisId);

      if (error) throw error;
      router.push("/dashboard/tools/grid-iq/library?tab=analyses");
      router.refresh();
    } catch {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-400">Delete this analysis?</span>
        <Button size="sm" variant="secondary" onClick={() => setShowConfirm(false)} disabled={isDeleting}>
          Cancel
        </Button>
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="border border-white/[0.08] bg-white/[0.04] text-text-muted hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
      onClick={() => setShowConfirm(true)}
    >
      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
      Delete
    </Button>
  );
}
