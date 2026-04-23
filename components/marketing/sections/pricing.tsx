"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PRICING_TIERS } from "@/lib/marketing/constants";
import { ADVISOR_ENABLED } from "@/lib/feature-flags";

const ALL_TABS = [
  {
    id: "producer" as const,
    label: "Producers",
    colour: "#FF8000",
    icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  },
  {
    id: "advisor" as const,
    label: "Advisors",
    colour: "#2F8CD9",
    icon: "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0",
  },
];

// Advisor pricing tab hidden when feature flag is off
const TABS = ADVISOR_ENABLED ? ALL_TABS : ALL_TABS.filter((t) => t.id !== "advisor");

const ACCENT = {
  producer: {
    text: "text-brand",
    bg: "bg-brand",
    bgHover: "hover:bg-brand-light",
    bgDark: "bg-brand-dark",
    bgDarkHover: "hover:bg-brand",
    border: "border-brand/30",
    cardBg: "bg-brand/[0.04]",
    glow: "shadow-[0_0_60px_rgba(216,150,61,0.08)]",
    check: "text-brand",
  },
  advisor: {
    text: "text-[#2F8CD9]",
    bg: "bg-[#2F8CD9]",
    bgHover: "hover:bg-[#4AA0E6]",
    bgDark: "bg-[#2b4fa8]",
    bgDarkHover: "hover:bg-[#2F8CD9]",
    border: "border-[#2F8CD9]/30",
    cardBg: "bg-[#2F8CD9]/[0.04]",
    glow: "shadow-[0_0_60px_rgba(47,140,217,0.08)]",
    check: "text-[#2F8CD9]",
  },
};

export default function Pricing() {
  const [activeTab, setActiveTab] = useState<"producer" | "advisor">("producer");
  const tiers = PRICING_TIERS.filter((t) => t.category === activeTab);
  const accent = ACCENT[activeTab];

  return (
    <section id="pricing" className="relative py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-brand text-sm font-medium tracking-wider uppercase">Pricing</span>
          <h2 className="mt-3 text-3xl font-semibold text-balance text-white sm:text-4xl lg:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="text-text-secondary mx-auto mt-4 max-w-xl text-base">
            {ADVISOR_ENABLED
              ? "Plans for producers and advisors. All plans include a 21-day free trial."
              : "All plans include a 21-day free trial."}
          </p>
        </motion.div>

        {/* Tab Toggle - hidden when only one tab */}
        {TABS.length > 1 && (
          <div className="mt-10 flex justify-center">
            <div className="inline-flex gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] p-2 backdrop-blur-sm">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="focus-visible:ring-brand relative cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-300 focus-visible:ring-2 focus-visible:outline-none"
                    style={{
                      color: isActive ? "#fff" : tab.colour,
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="pricingTab"
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: tab.colour, border: `1px solid ${tab.colour}` }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
                      />
                    )}
                    {!isActive && (
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{ border: `1px solid ${tab.colour}40` }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                      </svg>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className={`mt-12 grid gap-4 sm:gap-6 ${
              activeTab === "producer"
                ? "mx-auto max-w-3xl sm:grid-cols-2"
                : "mx-auto max-w-3xl sm:grid-cols-2"
            }`}
          >
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`group relative flex flex-col rounded-2xl p-4 backdrop-blur-md transition-colors duration-300 sm:p-6 ${
                  tier.highlighted
                    ? `border ${accent.border} ${accent.cardBg} ${accent.glow}`
                    : "border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.06]"
                }`}
              >
                {tier.badge && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full ${accent.bg} px-3 py-1 text-xs font-semibold text-white`}
                  >
                    {tier.badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${accent.text}`}>{tier.name}</h3>
                  <p className="text-text-muted text-xs">{tier.subtitle}</p>
                  <div className="mt-4">
                    {tier.price !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white sm:text-3xl">
                          A${tier.price}
                        </span>
                        <span className="text-text-muted text-sm">/month + GST</span>
                      </div>
                    ) : tier.priceLabel ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white sm:text-3xl">
                          {tier.priceLabel}
                        </span>
                      </div>
                    ) : (
                      <p className="text-brand-light text-lg font-semibold">Coming Soon</p>
                    )}
                  </div>
                  <p className="text-text-muted mt-2 text-xs">{tier.description}</p>
                </div>

                <ul className="flex-1 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f.name} className="flex items-start gap-2.5">
                      {f.included ? (
                        <svg
                          aria-hidden="true"
                          className={`mt-0.5 h-4 w-4 shrink-0 ${accent.check}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg
                          aria-hidden="true"
                          className="text-text-quaternary mt-0.5 h-4 w-4 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                        </svg>
                      )}
                      <span
                        className={`text-xs ${f.included ? "text-text-secondary" : "text-text-muted"}`}
                      >
                        {f.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Notes */}
        <div className="mx-auto mt-12 max-w-2xl space-y-4">
          <div className="rounded-2xl bg-white/[0.03] p-5 backdrop-blur-sm">
            <h4 className="text-sm font-semibold text-white">21-Day Free Trial</h4>
            <p className="text-text-muted mt-1 text-xs leading-relaxed">
              21-day free trial included. Paid subscription begins automatically at the end of the
              trial unless cancelled beforehand.
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] p-5 backdrop-blur-sm">
            <h4 className="text-brand text-sm font-semibold">Usage Limits</h4>
            <p className="text-text-muted mt-1 text-xs leading-relaxed">
              Plan-based usage limits apply to Brangus and Freight IQ. Additional usage can be
              purchased if needed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
