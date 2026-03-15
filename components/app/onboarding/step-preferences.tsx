import { Eye, EyeOff } from "lucide-react";

export function StepPreferences({
  accountType,
  isDiscoverable,
  onChange,
}: {
  accountType?: string;
  isDiscoverable?: boolean;
  onChange: (v: boolean) => void;
}) {
  const isAdvisor = accountType === "advisor";

  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary">Discoverability</h2>
      <p className="mt-1 text-sm text-text-muted">
        {isAdvisor
          ? "Allow producers to find you in the advisor directory."
          : "Allow advisors to find you in the producer directory."}
      </p>

      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
            isDiscoverable === true
              ? "border-brand bg-brand/10"
              : "border-white/10 bg-white/[0.02] hover:border-white/20"
          }`}
        >
          <Eye className={`mt-0.5 h-5 w-5 ${isDiscoverable === true ? "text-brand" : "text-text-muted"}`} />
          <div>
            <p className="text-sm font-medium text-text-primary">Discoverable</p>
            <p className="mt-0.5 text-xs text-text-muted">
              {isAdvisor
                ? "Producers can find and connect with you."
                : "Advisors can find and connect with you."}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
            isDiscoverable === false
              ? "border-brand bg-brand/10"
              : "border-white/10 bg-white/[0.02] hover:border-white/20"
          }`}
        >
          <EyeOff className={`mt-0.5 h-5 w-5 ${isDiscoverable === false ? "text-brand" : "text-text-muted"}`} />
          <div>
            <p className="text-sm font-medium text-text-primary">Private</p>
            <p className="mt-0.5 text-xs text-text-muted">
              Your profile will not appear in any directory.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
