import { Badge } from "@/components/ui/badge";
import { Check, Clock } from "lucide-react";

/**
 * Status badge shown in the top-right of the Producer Profile header.
 * Pure presentation; no interactivity. Returns null when there's no status
 * to surface so the caller can reserve space without a visual element.
 */
export function ProducerConnectionStatusBadge({ status }: { status: string | null }) {
  if (status === "approved") {
    return (
      <Badge variant="success">
        <Check className="mr-1 h-3 w-3" aria-hidden="true" />
        Connected
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge variant="warning">
        <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
        Request Pending
      </Badge>
    );
  }

  return null;
}
