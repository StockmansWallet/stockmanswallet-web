"use client";

import { Radio } from "lucide-react";

export function StepChannel40({
  isVisible,
  onChange,
}: {
  isVisible: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Get on Channel 40
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-white/60">
          Channel 40 is the producer network inside Stockman&apos;s Wallet.
          Other producers can find you by searching Ch 40, see your basic
          details, and send a connection request.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!isVisible)}
        className="flex w-full items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.05]"
      >
        <div className="bg-brand/15 text-brand mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
          <Radio className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Searchable on Ch 40
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Off by default. Turn on to appear in Ch 40 search results.
          </p>
        </div>
        <div
          className={`relative mt-1 h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
            isVisible ? "bg-brand" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              isVisible ? "left-[22px]" : "left-0.5"
            }`}
          />
        </div>
      </button>

      <p className="text-xs text-white/45">
        You can flip this anytime in Settings → Privacy.
      </p>
    </div>
  );
}
