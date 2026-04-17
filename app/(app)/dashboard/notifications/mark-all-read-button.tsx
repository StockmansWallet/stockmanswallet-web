"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";
import { markAllAsRead } from "./actions";

export function MarkAllReadButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await markAllAsRead();
    setLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
      onClick={handleClick}
      disabled={loading}
    >
      <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
      {loading ? "..." : "Mark all read"}
    </Button>
  );
}
