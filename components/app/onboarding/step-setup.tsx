import type { OnboardingData } from "@/app/onboarding/actions";

const australianStates = [
  "QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT",
];

export function StepSetup({
  accountType,
  data,
  onChange,
}: {
  accountType?: string;
  data: Partial<OnboardingData>;
  onChange: (partial: Partial<OnboardingData>) => void;
}) {
  if (accountType === "advisor") {
    return (
      <div>
        <h2 className="text-lg font-bold text-text-primary">Set up your practice</h2>
        <p className="mt-1 text-sm text-text-muted">
          Tell us about your advisory business.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Your Name
            </label>
            <input
              type="text"
              value={data.displayName ?? ""}
              onChange={(e) => onChange({ displayName: e.target.value })}
              placeholder="e.g. John Smith"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Company Name
            </label>
            <input
              type="text"
              value={data.companyName ?? ""}
              onChange={(e) => onChange({ companyName: e.target.value })}
              placeholder="e.g. Smith Rural Advisory"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary">Set up your property</h2>
      <p className="mt-1 text-sm text-text-muted">
        Add your first property. You can add more later.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Your Name
          </label>
          <input
            type="text"
            value={data.displayName ?? ""}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="e.g. John Smith"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Property Name
          </label>
          <input
            type="text"
            value={data.propertyName ?? ""}
            onChange={(e) => onChange({ propertyName: e.target.value })}
            placeholder="e.g. Willow Creek Station"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">State</label>
            <select
              value={data.state ?? "QLD"}
              onChange={(e) => onChange({ state: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              {australianStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">Region</label>
            <input
              type="text"
              value={data.region ?? ""}
              onChange={(e) => onChange({ region: e.target.value })}
              placeholder="e.g. Central West"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
