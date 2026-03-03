"use client";

import { useTransition } from "react";
import { seedDemoData, clearAllData } from "./demo-actions";

export function LoadDemoButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(async () => { await seedDemoData(); })}
      disabled={pending}
      className="rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? "Loading demo data…" : "Load Demo Data"}
    </button>
  );
}

export function ClearDataButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm("This will delete all your herds and properties. Are you sure?")) return;
        startTransition(async () => { await clearAllData(); });
      }}
      disabled={pending}
      className="rounded-2xl bg-red-500/15 px-5 py-2.5 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/25 active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? "Clearing…" : "Clear All Data"}
    </button>
  );
}
