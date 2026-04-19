"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { setPrimaryProcessor, clearPrimaryProcessor } from "../actions";

interface Props {
  processorId: string;
  initialIsPrimary: boolean;
}

export function PrimaryToggle({ processorId, initialIsPrimary }: Props) {
  const [isPrimary, setIsPrimary] = useState(initialIsPrimary);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !isPrimary;
    // Optimistic update, revert if the server action fails.
    setIsPrimary(next);
    startTransition(async () => {
      const result = next
        ? await setPrimaryProcessor(processorId)
        : await clearPrimaryProcessor(processorId);
      if (result.error) {
        setIsPrimary(!next);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all disabled:opacity-60 ${
        isPrimary
          ? "bg-teal/15 text-teal hover:bg-teal/25"
          : "bg-white/[0.04] text-text-muted hover:bg-white/[0.08] hover:text-text-primary"
      }`}
      title={
        isPrimary
          ? "This processor is your primary. Click to unset."
          : "Set as primary processor for Analyse flows"
      }
    >
      <Star
        className={`h-3.5 w-3.5 ${isPrimary ? "fill-teal" : ""}`}
      />
      {isPrimary ? "Primary" : "Set as Primary"}
    </button>
  );
}
