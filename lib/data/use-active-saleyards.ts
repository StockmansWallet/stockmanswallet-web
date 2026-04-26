"use client";

// React hook wrapping fetchActiveSaleyards for client components. Returns the
// current active set, defaulting to an empty set while loading. Callers should
// pass the result to filterActive(); when the set is empty, filterActive falls
// back to the full list so the picker is never blank during the initial load.

import { useEffect, useState } from "react";
import { fetchActiveSaleyards } from "./active-saleyards";

export function useActiveSaleyards(): Set<string> {
  const [activeSet, setActiveSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetchActiveSaleyards().then((set) => {
      if (!cancelled) setActiveSet(set);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return activeSet;
}
