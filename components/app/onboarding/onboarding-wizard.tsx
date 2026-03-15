"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepWelcome } from "./step-welcome";
import { StepAccountType } from "./step-account-type";
import { StepSetup } from "./step-setup";
import { StepSaleyard } from "./step-saleyard";
import { StepPreferences } from "./step-preferences";
import { StepComplete } from "./step-complete";
import { completeOnboarding, skipOnboarding, type OnboardingData } from "@/app/onboarding/actions";

const TOTAL_STEPS = 6;

export function OnboardingWizard({ userName }: { userName: string }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<Partial<OnboardingData>>({});

  function updateData(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function next() {
    // Skip saleyard step for advisors
    if (step === 2 && data.accountType === "advisor") {
      setStep(4); // Skip to preferences
    } else if (step === 3 && data.accountType === "advisor") {
      setStep(4);
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    }
  }

  function back() {
    if (step === 4 && data.accountType === "advisor") {
      setStep(2); // Skip back over saleyard
    } else {
      setStep((s) => Math.max(s - 1, 0));
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    await completeOnboarding(data as OnboardingData);
  }

  async function handleSkip() {
    setSubmitting(true);
    await skipOnboarding();
  }

  const stepContent = [
    <StepWelcome key="welcome" userName={userName} />,
    <StepAccountType key="type" value={data.accountType} onChange={(v) => updateData({ accountType: v })} />,
    <StepSetup key="setup" accountType={data.accountType} data={data} onChange={updateData} />,
    <StepSaleyard key="saleyard" value={data.preferredSaleyard} onChange={(v) => updateData({ preferredSaleyard: v })} />,
    <StepPreferences key="prefs" accountType={data.accountType} isDiscoverable={data.isDiscoverable} onChange={(v) => updateData({ isDiscoverable: v })} />,
    <StepComplete key="complete" accountType={data.accountType} />,
  ];

  const canProceed = (() => {
    switch (step) {
      case 0: return true; // Welcome
      case 1: return !!data.accountType;
      case 2: // Setup
        if (data.accountType === "farmer_grazier") return !!data.propertyName;
        if (data.accountType === "advisor") return !!data.companyName;
        return false;
      case 3: return true; // Saleyard is optional
      case 4: return true; // Preferences optional
      case 5: return true; // Complete
      default: return false;
    }
  })();

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
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
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
                <Button onClick={handleComplete} disabled={submitting} className="w-full">
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
