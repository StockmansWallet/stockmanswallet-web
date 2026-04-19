"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { AU_STATES } from "../_constants";

const OPTIONS = [{ value: "", label: "All AU" }, ...AU_STATES.map((s) => ({ value: s, label: s }))];

export function StateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("state") ?? "";

  const onChange = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("state", value);
      else next.delete("state");
      const q = next.toString();
      router.push(q ? `${pathname}?${q}` : pathname);
    },
    [params, pathname, router]
  );

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-surface p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value || "all"}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            current === o.value
              ? "bg-surface-high text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
