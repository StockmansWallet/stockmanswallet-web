"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { toggleYardBookItemComplete } from "../actions";

export function ToggleCompleteButton({
  id,
  isCompleted,
}: {
  id: string;
  isCompleted: boolean;
}) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    await toggleYardBookItemComplete(id, !isCompleted);
    setToggling(false);
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleToggle}
      disabled={toggling}
    >
      {isCompleted ? (
        <>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          {toggling ? "Updating..." : "Mark Incomplete"}
        </>
      ) : (
        <>
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
          {toggling ? "Updating..." : "Mark Complete"}
        </>
      )}
    </Button>
  );
}
