'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PRICING_TIERS } from '@/lib/marketing/constants'

const TABS = [
  { id: 'producer' as const, label: 'Producers' },
  { id: 'advisor' as const, label: 'Advisors' },
]

const ACCENT = {
  producer: {
    text: 'text-brand',
    bg: 'bg-brand',
    bgHover: 'hover:bg-brand-light',
    border: 'border-brand/30',
    cardBg: 'bg-brand/[0.04]',
    glow: 'shadow-[0_0_60px_rgba(217,118,47,0.08)]',
    check: 'text-brand',
  },
  advisor: {
    text: 'text-[#2F8CD9]',
    bg: 'bg-[#2F8CD9]',
    bgHover: 'hover:bg-[#4AA0E6]',
    border: 'border-[#2F8CD9]/30',
    cardBg: 'bg-[#2F8CD9]/[0.04]',
    glow: 'shadow-[0_0_60px_rgba(47,140,217,0.08)]',
    check: 'text-[#2F8CD9]',
  },
}

export default function Pricing() {
  const [activeTab, setActiveTab] = useState<'producer' | 'advisor'>('producer')
  const tiers = PRICING_TIERS.filter((t) => t.category === activeTab)
  const accent = ACCENT[activeTab]

  return (
    <section id="pricing" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-wider text-brand">Pricing</span>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-text-secondary">
            Plans for producers and advisors. All plans include a 30-day free trial.
          </p>
        </motion.div>

        {/* Tab Toggle */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative cursor-pointer rounded-xl px-6 py-2.5 text-sm font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="pricingTab"
                    className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/[0.1]"
                    transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className={`mt-12 grid gap-6 ${
              activeTab === 'producer'
                ? 'sm:grid-cols-2 lg:grid-cols-3'
                : 'mx-auto max-w-3xl sm:grid-cols-2'
            }`}
          >
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`group relative flex flex-col rounded-2xl p-6 transition-all duration-300 ${
                  tier.highlighted
                    ? `border ${accent.border} ${accent.cardBg} ${accent.glow}`
                    : 'bg-white/[0.04] hover:bg-white/[0.06]'
                }`}
              >
                {tier.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full ${accent.bg} px-3 py-1 text-xs font-semibold text-white`}>
                    {tier.badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${accent.text}`}>{tier.name}</h3>
                  <p className="text-xs text-text-muted">{tier.subtitle}</p>
                  <div className="mt-4">
                    {tier.price !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-white">A${tier.price}</span>
                        <span className="text-sm text-text-muted">/month + GST</span>
                      </div>
                    ) : tier.priceLabel ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-white">{tier.priceLabel}</span>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold text-brand-light">Coming Soon</p>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-text-muted">{tier.description}</p>
                </div>

                <ul className="flex-1 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f.name} className="flex items-start gap-2.5">
                      {f.included ? (
                        <svg className={`mt-0.5 h-4 w-4 shrink-0 ${accent.check}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-text-quaternary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                        </svg>
                      )}
                      <span className={`text-xs ${f.included ? 'text-text-secondary' : 'text-text-muted'}`}>
                        {f.name}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#signup"
                  className={`mt-6 flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                    tier.highlighted
                      ? `${accent.bg} text-white ${accent.bgHover}`
                      : 'border border-white/10 text-white hover:bg-white/5'
                  }`}
                >
                  Join Waitlist
                </a>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Notes */}
        <div className="mx-auto mt-12 max-w-2xl space-y-4">
          <div className="rounded-2xl bg-white/[0.03] p-5">
            <h4 className="text-sm font-semibold text-white">30-Day Free Trial</h4>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              All plans include a 30-day free trial. You will not be charged until your trial ends.
              Cancel anytime before the end of the trial to avoid charges.
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] p-5">
            <h4 className="text-sm font-semibold text-brand">Founding Member Pricing</h4>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Eligible early launch users will receive founding member pricing for the first 12 months
              of their paid subscription. We will let you know in advance before any pricing changes
              take effect after that period.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
