"use client";

import { UserCheck, Users, ListFilter } from "lucide-react";

// ── Toggle Row ──────────────────────────────────────────────────────────────

function ToggleRow({
  icon,
  label,
  subtitle,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="flex-shrink-0 text-text-muted">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ── Public Profile Fields ───────────────────────────────────────────────────

function PublicProfileFields({
  contactEmail,
  contactPhone,
  bio,
  aboutPlaceholder,
  onEmailChange,
  onPhoneChange,
  onBioChange,
}: {
  contactEmail: string;
  contactPhone: string;
  bio: string;
  aboutPlaceholder: string;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onBioChange: (v: string) => void;
}) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div>
        <p className="text-sm font-medium text-text-primary">
          Your Public Profile
        </p>
        <p className="text-xs text-text-muted">
          These details are visible to people who find you
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">
          Contact Email
        </label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="email@example.com"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">
          Contact Phone
        </label>
        <input
          type="tel"
          value={contactPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="04XX XXX XXX"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">
          About You
        </label>
        <textarea
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          placeholder={aboutPlaceholder}
          rows={3}
          maxLength={255}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
        />
      </div>

      <p className="text-[10px] text-text-muted">
        You can update these later in Settings.
      </p>
    </div>
  );
}

// ── Exported Component ──────────────────────────────────────────────────────

export function StepPreferences({
  accountType,
  isDiscoverableToAdvisors,
  isVisibleOnProducerNetwork,
  isListedInDirectory,
  contactEmail,
  contactPhone,
  bio,
  onDiscoverableToAdvisorsChange,
  onVisibleOnProducerNetworkChange,
  onListedInDirectoryChange,
  onContactEmailChange,
  onContactPhoneChange,
  onBioChange,
}: {
  accountType?: string;
  isDiscoverableToAdvisors: boolean;
  isVisibleOnProducerNetwork: boolean;
  isListedInDirectory: boolean;
  contactEmail: string;
  contactPhone: string;
  bio: string;
  onDiscoverableToAdvisorsChange: (v: boolean) => void;
  onVisibleOnProducerNetworkChange: (v: boolean) => void;
  onListedInDirectoryChange: (v: boolean) => void;
  onContactEmailChange: (v: string) => void;
  onContactPhoneChange: (v: string) => void;
  onBioChange: (v: string) => void;
}) {
  const isAdvisor = accountType === "advisor";
  const showProfile = isAdvisor
    ? isListedInDirectory
    : isDiscoverableToAdvisors || isVisibleOnProducerNetwork;

  if (isAdvisor) {
    return (
      <div>
        <h2 className="text-lg font-bold text-text-primary">
          Directory Listing
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Let producers find you in the Advisor Directory
        </p>

        <div className="mt-5 space-y-2">
          <ToggleRow
            icon={<ListFilter className="h-5 w-5" />}
            label="Listed in Advisor Directory"
            subtitle="Appear in the Advisory Hub Advisor Directory for producers to find you"
            checked={isListedInDirectory}
            onChange={onListedInDirectoryChange}
          />
        </div>

        {showProfile && (
          <PublicProfileFields
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            bio={bio}
            aboutPlaceholder="Tell producers about your experience and services..."
            onEmailChange={onContactEmailChange}
            onPhoneChange={onContactPhoneChange}
            onBioChange={onBioChange}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary">
        Network & Visibility
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Choose how others can find you on the platform
      </p>

      <div className="mt-5 space-y-2">
        <ToggleRow
          icon={<UserCheck className="h-5 w-5" />}
          label="Discoverable to Advisors"
          subtitle="Allow advisors to find your property in their search"
          checked={isDiscoverableToAdvisors}
          onChange={onDiscoverableToAdvisorsChange}
        />
        <ToggleRow
          icon={<Users className="h-5 w-5" />}
          label="Visible on Ch 40"
          subtitle="Other producers can discover and connect with you"
          checked={isVisibleOnProducerNetwork}
          onChange={onVisibleOnProducerNetworkChange}
        />
      </div>

      {showProfile && (
        <PublicProfileFields
          contactEmail={contactEmail}
          contactPhone={contactPhone}
          bio={bio}
          aboutPlaceholder="Tell others about your operation..."
          onEmailChange={onContactEmailChange}
          onPhoneChange={onContactPhoneChange}
          onBioChange={onBioChange}
        />
      )}
    </div>
  );
}
