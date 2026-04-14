"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { deleteNotification } from "./actions";

export function DeleteNotificationButton({ notificationId }: { notificationId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    await deleteNotification(notificationId);
    setLoading(false);
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="shrink-0 rounded-md p-1 text-text-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
      aria-label="Delete notification"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
