"use client";

import { useState } from "react";
import { seedDemoData } from "@/app/(app)/dashboard/settings/demo-actions";

export function LoadDemoDataButton() {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleLoad() {
    setLoading(true);
    setShowConfirm(false);
    await seedDemoData();
    // Page will revalidate and show the dashboard with data
  }

  if (showConfirm) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
        <p className="text-sm font-medium text-text-primary">Load Demo Data?</p>
        <p className="mt-1 text-xs text-text-muted">
          This will add a sample cattle station with 20 herds, sales records, yard book events, and more. You can remove it any time from Settings.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLoad}
            disabled={loading}
            className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Demo Data"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      disabled={loading}
      className="w-full rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-white/5 disabled:opacity-50"
    >
      {loading ? "Loading..." : "Load Demo Data"}
    </button>
  );
}
