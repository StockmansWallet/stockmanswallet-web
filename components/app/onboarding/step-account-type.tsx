"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";

export type AccountType = "producer" | "advisor";

const advisorRoles = [
  "Agribusiness Banker",
  "Insurer",
  "Livestock Agent",
  "Accountant",
  "Succession Planner",
];

const options: {
  value: AccountType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "producer",
    label: "Producer",
    description: "Manage your livestock and track property performance",
    icon: <IconCattleTags className="h-5 w-5" />,
  },
  {
    value: "advisor",
    label: "Rural Advisor",
    description: "Support clients with livestock portfolio insights",
    icon: <Users className="h-5 w-5" />,
  },
];

export function StepAccountType({
  value,
  advisorRole,
  onChange,
  onAdvisorRoleChange,
}: {
  value?: AccountType;
  advisorRole?: string;
  onChange: (v: AccountType) => void;
  onAdvisorRoleChange: (v: string) => void;
}) {
  const [showRolePicker, setShowRolePicker] = useState(value === "advisor");

  function handleTypeChange(type: AccountType) {
    onChange(type);
    setShowRolePicker(type === "advisor");
    if (type !== "advisor") {
      onAdvisorRoleChange("");
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary">
        How will you use Stockman&apos;s Wallet?
      </h2>

      <div className="mt-5 space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleTypeChange(opt.value)}
            className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
              value === opt.value
                ? "border-brand bg-brand/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <div
              className={`mt-0.5 ${value === opt.value ? "text-brand" : "text-text-muted"}`}
            >
              {opt.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {opt.label}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {opt.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {showRolePicker && (
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Your role
          </label>
          <select
            value={advisorRole ?? ""}
            onChange={(e) => onAdvisorRoleChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          >
            <option value="" disabled>
              Select your role
            </option>
            {advisorRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
