"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

interface AskBrangusButtonProps {
  prefill: string;
  label?: string;
}

/**
 * Navigates to the Brangus chat page with a URL-encoded prefill question.
 * The chat page reads the `prefill` search param and auto-sends it as the
 * user's first message once the portfolio store has loaded.
 */
export function AskBrangusButton({ prefill, label = "Ask Brangus" }: AskBrangusButtonProps) {
  const router = useRouter();

  const onClick = () => {
    const encoded = encodeURIComponent(prefill);
    router.push(`/dashboard/brangus/chat?prefill=${encoded}`);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
    >
      <Sparkles className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
