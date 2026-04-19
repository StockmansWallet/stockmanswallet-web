"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedDemoData, clearDemoData, clearAllUserData } from "./demo-actions";

export function LoadDemoButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await seedDemoData();
          if (result?.error) {
            alert(`Failed to load demo data: ${result.error}`);
          } else {
            router.push("/dashboard");
          }
        })
      }
      disabled={pending}
      className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? "Loading demo data…" : "Load Demo Data"}
    </button>
  );
}

export function ClearDataButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (!confirm("This will remove the Doongara Station demo data. Your real data is unaffected.")) return;
        startTransition(async () => {
          const result = await clearDemoData();
          if (result?.error) {
            alert(`Failed to clear demo data: ${result.error}`);
          } else {
            router.push("/dashboard");
          }
        });
      }}
      disabled={pending}
      className="rounded-full bg-error/15 px-5 py-2.5 text-sm font-semibold text-error transition-all hover:bg-error/25 active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? "Clearing…" : "Clear Demo Data"}
    </button>
  );
}

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
