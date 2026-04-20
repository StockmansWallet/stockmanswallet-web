import { Eye } from "lucide-react";

/**
 * Banner shown at the top of the app when signed in as the public demo account.
 * Signals that writes won't persist (RLS blocks them) so users understand why
 * local edits seem to "undo" themselves on the next refresh.
 */
export function DemoModeBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-brand px-3 py-2 text-center text-xs font-medium text-white">
      <Eye className="h-3.5 w-3.5 shrink-0" />
      <span>
        Demo mode — changes won&apos;t save. Sign up for your own account to get started.
      </span>
    </div>
  );
}
