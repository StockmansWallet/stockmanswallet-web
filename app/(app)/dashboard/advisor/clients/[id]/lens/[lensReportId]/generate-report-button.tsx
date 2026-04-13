"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { generateLensReport } from "../../lens-report-actions";

interface GenerateReportButtonProps {
  connectionId: string;
  lensReportId: string;
}

export function GenerateReportButton({
  connectionId,
  lensReportId,
}: GenerateReportButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateLensReport(connectionId, lensReportId);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <Button
      variant="advisor"
      size="sm"
      onClick={handleGenerate}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <FileText className="mr-1.5 h-3.5 w-3.5" />
      )}
      {isPending ? "Generating..." : "Generate Report"}
    </Button>
  );
}
