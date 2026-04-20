"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearAllUserData } from "./data-management-actions";

export function ClearAllDataButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (!confirm("This will permanently delete ALL your herds, records, and data from the cloud. Your account will remain active. This affects both this web app and the iOS app.")) return;
        if (!confirm("Are you sure? This cannot be undone.")) return;
        startTransition(async () => {
          const result = await clearAllUserData();
          if (result?.error) {
            alert(`Failed to clear data: ${result.error}`);
          } else {
            router.push("/dashboard");
          }
        });
      }}
      disabled={pending}
      className="rounded-full bg-error/15 px-5 py-2.5 text-sm font-semibold text-error transition-all hover:bg-error/25 active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? "Clearing all data…" : "Clear All Data"}
    </button>
  );
}
