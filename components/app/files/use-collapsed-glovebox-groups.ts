import { useEffect, useState } from "react";

const STORAGE_KEY = "stockmanswallet.glovebox.collapsedGroups";

export function useCollapsedGloveboxGroups() {
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as unknown) : null;
      return Array.isArray(parsed)
        ? new Set(parsed.filter((id) => typeof id === "string"))
        : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(collapsedGroupIds)));
  }, [collapsedGroupIds]);

  const expandGroup = (groupId: string) => {
    setCollapsedGroupIds((current) => {
      const next = new Set(current);
      next.delete(groupId);
      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return { collapsedGroupIds, expandGroup, toggleGroup };
}
