"use client";

import { useState } from "react";
import { Plus, Home, Check, X } from "lucide-react";
import type { OnboardingProperty } from "@/app/onboarding/actions";

const australianStates = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"];

const businessTypes = [
  "Bank / Financial Institution",
  "Insurance Company",
  "Livestock Agency",
  "Accounting Firm",
  "Advisory / Consulting Firm",
  "Other",
];

// ── Property Form Modal ─────────────────────────────────────────────────────

function AddPropertyModal({
  isFirst,
  onSave,
  onCancel,
}: {
  isFirst: boolean;
  onSave: (property: OnboardingProperty) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [pic, setPic] = useState("");
  const [size, setSize] = useState("");
  const [sizeUnit, setSizeUnit] = useState<"ha" | "ac">("ha");
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("QLD");
  const [postcode, setPostcode] = useState("");
  const [isDefault, setIsDefault] = useState(isFirst);

  const canSave = name.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      pic: pic.trim() || undefined,
      size: size ? parseFloat(size) : undefined,
      sizeUnit,
      address: address.trim() || undefined,
      suburb: suburb.trim() || undefined,
      state,
      postcode: postcode.trim() || undefined,
      isDefault,
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">Add Property</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-text-muted hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Property Details */}
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Property Details
        </p>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">
            Property Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Willow Creek Station"
            autoCapitalize="words"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              PIC Number
            </label>
            <input
              type="text"
              value={pic}
              onChange={(e) => setPic(e.target.value.toUpperCase())}
              placeholder="e.g. QABC1234"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Size
            </label>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
              <div className="flex overflow-hidden rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setSizeUnit("ha")}
                  className={`px-2.5 py-2 text-xs font-medium transition-colors ${
                    sizeUnit === "ha"
                      ? "bg-brand text-white"
                      : "bg-white/5 text-text-muted hover:text-text-primary"
                  }`}
                >
                  ha
                </button>
                <button
                  type="button"
                  onClick={() => setSizeUnit("ac")}
                  className={`px-2.5 py-2 text-xs font-medium transition-colors ${
                    sizeUnit === "ac"
                      ? "bg-brand text-white"
                      : "bg-white/5 text-text-muted hover:text-text-primary"
                  }`}
                >
                  ac
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Property Address */}
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Property Address
        </p>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">
            Street Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 123 Station Road"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">
            Suburb / Town
          </label>
          <input
            type="text"
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            placeholder="e.g. Everton Hills"
            autoCapitalize="words"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              {australianStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Postcode
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="e.g. 4053"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Primary Property */}
        {!isFirst && (
          <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5">
            <span className="text-sm text-text-secondary">
              Set as Primary Property
            </span>
            <button
              type="button"
              onClick={() => setIsDefault(!isDefault)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isDefault ? "bg-brand" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  isDefault ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        )}

        {isFirst && (
          <p className="flex items-center gap-1.5 text-xs text-brand">
            <Check className="h-3.5 w-3.5" />
            This will be your primary property
          </p>
        )}

        <p className="text-[10px] text-text-muted">
          Your primary property is used as the default for new herds.
        </p>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          Add Property
        </button>
      </div>
    </div>
  );
}

// ── Producer Setup ──────────────────────────────────────────────────────────

function ProducerSetup({
  displayName,
  properties,
  onDisplayNameChange,
  onPropertiesChange,
}: {
  displayName: string;
  properties: OnboardingProperty[];
  onDisplayNameChange: (v: string) => void;
  onPropertiesChange: (v: OnboardingProperty[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);

  function handleAddProperty(property: OnboardingProperty) {
    // If this property is set as default, clear default on others
    let updated = [...properties];
    if (property.isDefault) {
      updated = updated.map((p) => ({ ...p, isDefault: false }));
    }
    updated.push(property);
    onPropertiesChange(updated);
    setShowForm(false);
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary">Your Properties</h2>
      <p className="mt-1 text-sm text-text-muted">
        Add your property to get started. Your first property is automatically
        set as your primary.
      </p>

      <div className="mt-5 space-y-4">
        {/* Display Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Your Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="e.g. John Smith"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
        </div>

        {/* Property List */}
        {properties.length > 0 && (
          <div className="space-y-2">
            {properties.map((prop, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <Home className="h-4 w-4 flex-shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium uppercase text-text-primary">
                      {prop.name}
                    </p>
                    {prop.isDefault && (
                      <span className="flex-shrink-0 rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                        Primary
                      </span>
                    )}
                  </div>
                  {(prop.suburb || prop.state) && (
                    <p className="text-xs text-text-muted">
                      {[prop.suburb, prop.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <Check className="h-4 w-4 flex-shrink-0 text-brand" />
              </div>
            ))}
          </div>
        )}

        {/* Add Property Form or Button */}
        {showForm ? (
          <AddPropertyModal
            isFirst={properties.length === 0}
            onSave={handleAddProperty}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-text-muted transition-colors hover:border-brand hover:text-brand"
          >
            <Plus className="h-4 w-4" />
            {properties.length === 0
              ? "Add Your Property"
              : "Add Another Property"}
          </button>
        )}

        {/* Hint text */}
        <p className="text-xs text-text-muted">
          {properties.length === 0
            ? "You need at least one property to continue"
            : "You can manage properties later in Settings"}
        </p>
      </div>
    </div>
  );
}

// ── Advisor Setup ───────────────────────────────────────────────────────────

function AdvisorSetup({
  displayName,
  companyName,
  businessType,
  advisorRole,
  businessAddress,
  onDisplayNameChange,
  onCompanyNameChange,
  onBusinessTypeChange,
  onAdvisorRoleChange,
  onBusinessAddressChange,
}: {
  displayName: string;
  companyName: string;
  businessType: string;
  advisorRole: string;
  businessAddress: string;
  onDisplayNameChange: (v: string) => void;
  onCompanyNameChange: (v: string) => void;
  onBusinessTypeChange: (v: string) => void;
  onAdvisorRoleChange: (v: string) => void;
  onBusinessAddressChange: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary">Your Business</h2>
      <p className="mt-1 text-sm text-text-muted">
        Tell us about your organisation
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Your Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="e.g. John Smith"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Business Type
          </label>
          <select
            value={businessType}
            onChange={(e) => onBusinessTypeChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          >
            <option value="" disabled>
              Select Business Type
            </option>
            {businessTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Company Name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="e.g. Smith Rural Advisory"
            autoCapitalize="words"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Your Role
          </label>
          <input
            type="text"
            value={advisorRole}
            onChange={(e) => onAdvisorRoleChange(e.target.value)}
            placeholder="e.g. Account Manager, Advisor, Agent"
            autoCapitalize="words"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Business Address
          </label>
          <input
            type="text"
            value={businessAddress}
            onChange={(e) => onBusinessAddressChange(e.target.value)}
            placeholder="e.g. 123 Main Street, Brisbane QLD 4000"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
          />
        </div>
      </div>
    </div>
  );
}

// ── Exported Component ──────────────────────────────────────────────────────

export function StepSetup({
  accountType,
  displayName,
  properties,
  companyName,
  businessType,
  advisorRole,
  businessAddress,
  onDisplayNameChange,
  onPropertiesChange,
  onCompanyNameChange,
  onBusinessTypeChange,
  onAdvisorRoleChange,
  onBusinessAddressChange,
}: {
  accountType?: string;
  displayName: string;
  properties: OnboardingProperty[];
  companyName: string;
  businessType: string;
  advisorRole: string;
  businessAddress: string;
  onDisplayNameChange: (v: string) => void;
  onPropertiesChange: (v: OnboardingProperty[]) => void;
  onCompanyNameChange: (v: string) => void;
  onBusinessTypeChange: (v: string) => void;
  onAdvisorRoleChange: (v: string) => void;
  onBusinessAddressChange: (v: string) => void;
}) {
  if (accountType === "advisor") {
    return (
      <AdvisorSetup
        displayName={displayName}
        companyName={companyName}
        businessType={businessType}
        advisorRole={advisorRole}
        businessAddress={businessAddress}
        onDisplayNameChange={onDisplayNameChange}
        onCompanyNameChange={onCompanyNameChange}
        onBusinessTypeChange={onBusinessTypeChange}
        onAdvisorRoleChange={onAdvisorRoleChange}
        onBusinessAddressChange={onBusinessAddressChange}
      />
    );
  }

  return (
    <ProducerSetup
      displayName={displayName}
      properties={properties}
      onDisplayNameChange={onDisplayNameChange}
      onPropertiesChange={onPropertiesChange}
    />
  );
}
