"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCheck, Trash2 } from "lucide-react";
import { markAllAsRead, deleteAllNotifications } from "./actions";

export function NotificationActionsBar({
  hasUnread,
  totalCount,
}: {
  hasUnread: boolean;
  totalCount: number;
}) {
  const [markingRead, setMarkingRead] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    await markAllAsRead();
    setMarkingRead(false);
  };

  const handleClearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setClearing(true);
    await deleteAllNotifications();
    setClearing(false);
    setConfirmClear(false);
  };

  return (
    <div className="flex items-center gap-2">
      {hasUnread && (
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
          onClick={handleMarkAllRead}
          disabled={markingRead}
        >
          <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
          {markingRead ? "..." : "Mark all read"}
        </Button>
      )}
      {totalCount > 0 && (
        <Button
          variant={confirmClear ? "destructive" : "ghost"}
          size="sm"
          className={confirmClear ? "" : "border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"}
          onClick={handleClearAll}
          onBlur={() => setConfirmClear(false)}
          disabled={clearing}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {clearing ? "..." : confirmClear ? "Confirm clear" : "Clear all"}
        </Button>
      )}
    </div>
  );
}
