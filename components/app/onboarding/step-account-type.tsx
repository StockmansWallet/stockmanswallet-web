import { Users, Tractor } from "lucide-react";

type AccountType = "farmer_grazier" | "advisor";

const options: { value: AccountType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "farmer_grazier",
    label: "Farmer / Grazier",
    description: "Track herds, valuations, and manage your operation.",
    icon: <Tractor className="h-5 w-5" />,
  },
  {
    value: "advisor",
    label: "Advisor",
    description: "Manage clients, analyse portfolios, and provide advisory services.",
    icon: <Users className="h-5 w-5" />,
  },
];

export function StepAccountType({
  value,
  onChange,
}: {
  value?: AccountType;
  onChange: (v: AccountType) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary">What best describes you?</h2>
      <p className="mt-1 text-sm text-text-muted">
        This determines your default view and available features.
      </p>

      <div className="mt-5 space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
              value === opt.value
                ? "border-brand bg-brand/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <div className={`mt-0.5 ${value === opt.value ? "text-brand" : "text-text-muted"}`}>
              {opt.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{opt.label}</p>
              <p className="mt-0.5 text-xs text-text-muted">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
