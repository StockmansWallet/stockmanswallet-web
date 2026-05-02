"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { PRICING_TIERS } from "@/lib/marketing/constants";
import { ADVISOR_ENABLED } from "@/lib/feature-flags";
import SectionCard from "@/components/marketing/ui/section-card";

const ALL_TABS = [
  {
    id: "producer" as const,
    label: "Producers",
    colour: "#E78822",
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
    glow: "shadow-[0_0_60px_rgba(231,136,34,0.08)]",
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
    <section id="pricing" className="relative scroll-mt-[6.75rem]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionCard glowPosition="50% 16%" glowSize="1120px 700px">
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <span className="text-brand text-sm font-medium tracking-wider uppercase">
                Introductory Pricing
              </span>
              <h2 className="mt-3 text-3xl font-semibold text-balance text-white sm:text-4xl lg:text-5xl">
                Select your cut
              </h2>
              <p className="text-text-secondary mx-auto mt-4 max-w-xl text-base">
                From a single property to a sprawling enterprise, we've carved out a plan that fits.
                <br />
                Every plan starts with a 7-day free trial when the app launches.
              </p>
            </motion.div>

            {/* Tab Toggle - hidden when only one tab */}
            {TABS.length > 1 && (
              <div className="mt-10 flex justify-center">
                <div className="inline-flex gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] p-2 backdrop-blur-sm">
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
                            style={{
                              backgroundColor: tab.colour,
                              border: `1px solid ${tab.colour}`,
                            }}
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
                    ? "mx-auto max-w-5xl sm:grid-cols-2 lg:grid-cols-3"
                    : "mx-auto max-w-3xl sm:grid-cols-2"
                }`}
              >
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`group relative flex flex-col rounded-2xl p-4 transition-colors duration-300 sm:p-6 ${
                      tier.highlighted
                        ? `border ${accent.border} ${accent.cardBg} ${accent.glow}`
                        : "border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.07]"
                    }`}
                  >
                    {tier.badge && (
                      <div
                        className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full ${accent.bg} px-3 py-1 text-xs font-semibold text-white`}
                      >
                        {tier.badge}
                      </div>
                    )}

                    {tier.image && (
                      <div className="relative mb-2 flex h-32 items-center justify-center sm:h-40">
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 mx-auto h-full w-3/4 rounded-full opacity-40 blur-2xl"
                          style={{
                            background:
                              "radial-gradient(ellipse at center, rgba(231,136,34,0.45) 0%, transparent 65%)",
                          }}
                        />
                        <Image
                          src={tier.image}
                          alt=""
                          aria-hidden
                          width={512}
                          height={512}
                          quality={92}
                          sizes="(min-width: 1024px) 280px, (min-width: 640px) 240px, 200px"
                          className="relative h-full w-auto object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)]"
                        />
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className={`text-lg font-semibold ${accent.text}`}>{tier.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-white">{tier.subtitle}</p>
                      <div className="mt-4">
                        {tier.price !== null ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-white sm:text-3xl">
                              ${tier.price}
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
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
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
            <div className="text-text-muted mx-auto mt-10 grid max-w-3xl gap-x-10 gap-y-3 text-xs leading-relaxed sm:grid-cols-2">
              <p>
                <span className="font-semibold text-white/85">7-day free trial.</span> Every paid
                plan starts with a 7-day free trial when the app launches. Your subscription begins
                automatically at the end of the trial unless cancelled beforehand.
              </p>
              <p>
                <span className="font-semibold text-white/85">Usage limits.</span> Plan-based usage
                limits apply to Brangus and Freight IQ. Additional usage can be purchased if
                needed.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
