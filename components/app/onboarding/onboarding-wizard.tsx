"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Check } from "lucide-react";
import logoAnimData from "@/public/animations/StockmansLogoAnim.json";
import PageBackground from "@/components/marketing/ui/page-background";
import SectionCard from "@/components/marketing/ui/section-card";
import { StepProperty } from "./step-property";
import { StepSaleyard } from "./step-saleyard";
import { StepChannel40 } from "./step-channel40";
import { StepComplete } from "./step-complete";
import {
  completeOnboarding,
  type OnboardingData,
  type OnboardingProperty,
} from "@/app/onboarding/actions";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

// MVP: producer-only. Advisor onboarding lives behind ADVISOR_ENABLED. To
// re-enable: restore the StepAccountType + advisor branches in the step
// components and the completeOnboarding server action (see
// project_advisor_on_hold memory entry).
const ACCOUNT_TYPE = "producer" as const;

type StepDefinition = {
  key: string;
  title: string;
  description: string;
};

const STEPS: StepDefinition[] = [
  {
    key: "property",
    title: "Your property",
    description: "Tell us about your land",
  },
  {
    key: "saleyard",
    title: "Preferred saleyard",
    description: "Pick your home market",
  },
  {
    key: "channel40",
    title: "Channel 40",
    description: "Producer network",
  },
  {
    key: "done",
    title: "All set",
    description: "Welcome aboard",
  },
];

const TOTAL_STEPS = STEPS.length;

export function OnboardingWizard({ userName }: { userName: string }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [displayName, setDisplayName] = useState(userName || "");

  // Single property in onboarding. Users add more from Settings later.
  const [property, setProperty] = useState<OnboardingProperty>({
    name: "",
    state: "QLD",
    isDefault: true,
  });

  const [preferredSaleyard, setPreferredSaleyard] = useState<
    string | undefined
  >();

  const [isVisibleOnProducerNetwork, setIsVisibleOnProducerNetwork] =
    useState(false);

  function updateProperty(patch: Partial<OnboardingProperty>) {
    setProperty((prev) => ({ ...prev, ...patch }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleComplete() {
    setSubmitting(true);
    const data: OnboardingData = {
      accountType: ACCOUNT_TYPE,
      displayName,
      properties: property.name.trim() ? [property] : [],
      preferredSaleyard,
      // Advisor-only fields kept blank for the producer flow.
      companyName: "",
      businessType: "",
      advisorRole: "",
      businessAddress: "",
      accountTypeRole: "",
      // Advisor discoverability hidden from MVP (no advisors live yet).
      isDiscoverableToAdvisors: false,
      isVisibleOnProducerNetwork,
      isListedInDirectory: false,
      contactEmail: "",
      contactPhone: "",
      bio: "",
    };
    await completeOnboarding(data);
  }

  const canProceed = (() => {
    switch (step) {
      case 0:
        // Property step: need name + at least property name
        return displayName.trim().length > 0 && property.name.trim().length > 0;
      case 1:
        return true; // Saleyard optional
      case 2:
        return true; // Channel 40 optional
      case 3:
        return true; // Done
      default:
        return false;
    }
  })();

  const stepContent = [
    <StepProperty
      key="property"
      displayName={displayName}
      property={property}
      onDisplayNameChange={setDisplayName}
      onPropertyChange={updateProperty}
    />,
    <StepSaleyard
      key="saleyard"
      value={preferredSaleyard}
      propertyState={property.state}
      onChange={setPreferredSaleyard}
    />,
    <StepChannel40
      key="channel40"
      isVisible={isVisibleOnProducerNetwork}
      onChange={setIsVisibleOnProducerNetwork}
    />,
    <StepComplete key="done" userName={displayName || userName} />,
  ];

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <>
      <PageBackground />
      <main className="fixed inset-0 z-10 overflow-y-auto">
        <div className="mx-auto flex min-h-screen w-full max-w-[34rem] items-center justify-center px-5 py-6 sm:px-6 sm:py-10 lg:max-w-[64rem] lg:px-8 lg:py-14">
          <SectionCard className="w-full">
            <div className="relative z-[2] flex w-full flex-col gap-y-8 lg:flex-row lg:items-stretch lg:gap-x-12 lg:gap-y-0">
              {/* Left column: logo + step list */}
              <div className="flex w-full flex-col items-center gap-y-6 text-center lg:w-[18rem] lg:flex-shrink-0 lg:items-start lg:text-left">
                <div className="mx-auto w-full max-w-[8rem] drop-shadow-[0_8px_30px_rgba(0,0,0,0.28)] sm:max-w-[9rem] lg:mx-0 lg:max-w-[7.5rem]">
                  <Lottie
                    animationData={logoAnimData}
                    loop={false}
                    className="h-auto w-full"
                  />
                </div>

                <ol className="w-full space-y-2">
                  {STEPS.map((s, i) => (
                    <StepRow
                      key={s.key}
                      number={i + 1}
                      title={s.title}
                      description={s.description}
                      state={
                        i < step ? "done" : i === step ? "current" : "upcoming"
                      }
                      // Allow jumping back to any completed step. Forward
                      // navigation stays gated by Continue (so we can keep
                      // running canProceed validation).
                      onClick={
                        i < step && !submitting ? () => setStep(i) : undefined
                      }
                    />
                  ))}
                </ol>
              </div>

              {/* Right column: active form + nav */}
              <div className="flex w-full flex-1 flex-col lg:min-h-[28rem]">
                <div className="flex-1">{stepContent[step]}</div>

                <div className="mt-8 flex items-center justify-between gap-3">
                  {step > 0 && !isLastStep ? (
                    <button
                      type="button"
                      onClick={back}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-white disabled:opacity-60"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {!isLastStep ? (
                    <button
                      type="button"
                      onClick={next}
                      disabled={!canProceed || submitting}
                      className="bg-brand hover:bg-brand-light flex h-10 items-center justify-center rounded-full px-6 text-sm font-medium text-white transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleComplete}
                      disabled={submitting}
                      className="bg-brand hover:bg-brand-light flex h-10 w-full items-center justify-center rounded-full px-6 text-sm font-medium text-white transition-colors active:scale-[0.99] disabled:opacity-60"
                    >
                      {submitting ? "Setting up..." : "Get started"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </main>
    </>
  );
}

function StepRow({
  number,
  title,
  description,
  state,
  onClick,
}: {
  number: number;
  title: string;
  description: string;
  state: "done" | "current" | "upcoming";
  onClick?: () => void;
}) {
  const isDone = state === "done";
  const isCurrent = state === "current";
  const isClickable = !!onClick;

  const baseClasses = `flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
    isCurrent ? "bg-brand/10 ring-brand/30 ring-1" : ""
  } ${isClickable ? "hover:bg-white/[0.04] cursor-pointer" : ""}`;

  const inner = (
    <>
      <div
        className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
          isDone
            ? "bg-brand text-white"
            : isCurrent
              ? "bg-brand text-white"
              : "bg-white/10 text-white/55"
        }`}
      >
        {isDone ? <Check className="h-3.5 w-3.5" /> : number}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            isCurrent || isDone ? "text-white" : "text-white/55"
          }`}
        >
          {title}
        </p>
        <p
          className={`text-xs ${isCurrent ? "text-white/70" : "text-white/40"}`}
        >
          {description}
        </p>
      </div>
    </>
  );

  if (isClickable) {
    return (
      <li>
        <button type="button" onClick={onClick} className={baseClasses}>
          {inner}
        </button>
      </li>
    );
  }

  return <li className={baseClasses}>{inner}</li>;
}
