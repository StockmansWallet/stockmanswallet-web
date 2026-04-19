"use client";

import { useEffect } from "react";
import { markNotificationsReadByTypes } from "@/app/(app)/dashboard/notifications/actions";
import { useSidebarNotifications } from "./sidebar-notifications-provider";

interface MarkNotificationsReadProps {
  // When the user is on a page owning these notification types, any unread
  // notifications of these types are marked read. Covers both initial
  // landing and notifications that arrive while the user is on the page.
  types: string[];
}

export function MarkNotificationsRead({ types }: MarkNotificationsReadProps) {
  const { counts } = useSidebarNotifications();
  const typesKey = types.join(",");
  const unread = types.reduce((sum, t) => sum + (counts[t] ?? 0), 0);

  useEffect(() => {
    if (unread > 0) {
      void markNotificationsReadByTypes(typesKey.split(","));
    }
  }, [unread, typesKey]);

  return null;
}
