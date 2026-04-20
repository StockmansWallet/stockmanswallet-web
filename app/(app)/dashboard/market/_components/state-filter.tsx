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
    <>
      {OPTIONS.map((o) => {
        const isActive = current === o.value;
        return (
          <button
            key={o.value || "all"}
            type="button"
            onClick={() => onChange(o.value)}
            className={`inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-xs font-medium transition-all ${
              isActive
                ? "bg-markets/15 text-markets"
                : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text-secondary"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </>
  );
}
