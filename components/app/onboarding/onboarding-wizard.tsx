"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepWelcome } from "./step-welcome";
import { StepAccountType } from "./step-account-type";
import type { AccountType } from "./step-account-type";
import { StepSetup } from "./step-setup";
import { StepSaleyard } from "./step-saleyard";
import { StepPreferences } from "./step-preferences";
import { StepComplete } from "./step-complete";
import {
  completeOnboarding,
  skipOnboarding,
  type OnboardingData,
  type OnboardingProperty,
} from "@/app/onboarding/actions";

const TOTAL_STEPS = 6;

export function OnboardingWizard({ userName }: { userName: string }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Core state
  const [accountType, setAccountType] = useState<AccountType | undefined>();
  const [accountTypeRole, setAccountTypeRole] = useState("");
  const [displayName, setDisplayName] = useState(userName || "");

  // Producer state
  const [properties, setProperties] = useState<OnboardingProperty[]>([]);
  const [preferredSaleyard, setPreferredSaleyard] = useState<
    string | undefined
  >();

  // Advisor state
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [advisorRole, setAdvisorRole] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  // Preferences - producer
  const [isDiscoverableToAdvisors, setIsDiscoverableToAdvisors] =
    useState(false);
  const [isVisibleOnFarmerNetwork, setIsVisibleOnFarmerNetwork] =
    useState(false);

  // Preferences - advisor
  const [isListedInDirectory, setIsListedInDirectory] = useState(false);

  // Public profile
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bio, setBio] = useState("");

  function next() {
    // Skip saleyard step for advisors
    if (step === 2 && accountType === "advisor") {
      setStep(4); // Skip to preferences
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    }
  }

  function back() {
    if (step === 4 && accountType === "advisor") {
      setStep(2); // Skip back over saleyard
    } else {
      setStep((s) => Math.max(s - 1, 0));
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    const data: OnboardingData = {
      accountType: accountType!,
      displayName,
      properties,
      preferredSaleyard,
      companyName,
      businessType,
      advisorRole,
      businessAddress,
      accountTypeRole,
      isDiscoverableToAdvisors,
      isVisibleOnFarmerNetwork,
      isListedInDirectory,
      contactEmail,
      contactPhone,
      bio,
    };
    await completeOnboarding(data);
  }

  async function handleSkip() {
    setSubmitting(true);
    await skipOnboarding();
  }

  // Get primary property state for saleyard proximity
  const primaryPropertyState =
    properties.find((p) => p.isDefault)?.state || properties[0]?.state;

  const canProceed = (() => {
    switch (step) {
      case 0:
        return true; // Welcome
      case 1: {
        // Account type must be selected
        if (!accountType) return false;
        // If advisor, role must be selected
        if (accountType === "advisor" && !accountTypeRole) return false;
        return true;
      }
      case 2:
        // Setup
        if (accountType === "farmer_grazier") return properties.length > 0;
        if (accountType === "advisor")
          return !!(
            companyName &&
            businessType &&
            advisorRole &&
            businessAddress
          );
        return false;
      case 3:
        return true; // Saleyard is optional
      case 4:
        return true; // Preferences optional
      case 5:
        return true; // Complete
      default:
        return false;
    }
  })();

  const stepContent = [
    <StepWelcome key="welcome" />,
    <StepAccountType
      key="type"
      value={accountType}
      advisorRole={accountTypeRole}
      onChange={setAccountType}
      onAdvisorRoleChange={setAccountTypeRole}
    />,
    <StepSetup
      key="setup"
      accountType={accountType}
      displayName={displayName}
      properties={properties}
      companyName={companyName}
      businessType={businessType}
      advisorRole={advisorRole}
      businessAddress={businessAddress}
      onDisplayNameChange={setDisplayName}
      onPropertiesChange={setProperties}
      onCompanyNameChange={setCompanyName}
      onBusinessTypeChange={setBusinessType}
      onAdvisorRoleChange={setAdvisorRole}
      onBusinessAddressChange={setBusinessAddress}
    />,
    <StepSaleyard
      key="saleyard"
      value={preferredSaleyard}
      propertyState={primaryPropertyState}
      onChange={setPreferredSaleyard}
    />,
    <StepPreferences
      key="prefs"
      accountType={accountType}
      isDiscoverableToAdvisors={isDiscoverableToAdvisors}
      isVisibleOnFarmerNetwork={isVisibleOnFarmerNetwork}
      isListedInDirectory={isListedInDirectory}
      contactEmail={contactEmail}
      contactPhone={contactPhone}
      bio={bio}
      onDiscoverableToAdvisorsChange={setIsDiscoverableToAdvisors}
      onVisibleOnFarmerNetworkChange={setIsVisibleOnFarmerNetwork}
      onListedInDirectoryChange={setIsListedInDirectory}
      onContactEmailChange={setContactEmail}
      onContactPhoneChange={setContactPhone}
      onBioChange={setBio}
    />,
    <StepComplete
      key="complete"
      accountType={accountType}
      userName={displayName || userName}
    />,
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  i <= step ? "bg-brand" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <button
              onClick={handleSkip}
              disabled={submitting}
              className="text-xs text-text-muted transition-colors hover:text-text-primary"
            >
              Skip for now
            </button>
          )}
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8">
            {stepContent[step]}

            <div className="mt-8 flex items-center justify-between">
              {step > 0 && step < TOTAL_STEPS - 1 ? (
                <Button variant="ghost" onClick={back} disabled={submitting}>
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < TOTAL_STEPS - 1 ? (
                <Button onClick={next} disabled={!canProceed || submitting}>
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "Setting up..." : "Get Started"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
