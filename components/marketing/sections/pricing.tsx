'use client'

import { motion } from 'framer-motion'
import { PRICING_TIERS } from '@/lib/marketing/constants'

export default function Pricing() {
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
            Start free. Upgrade when you need more power. No lock-in contracts.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`group relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
                tier.highlighted
                  ? 'border-brand/30 bg-brand/[0.04] shadow-[0_0_60px_rgba(217,118,47,0.08)]'
                  : 'border-white/[0.06] bg-bg-card-1 hover:border-white/[0.1]'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                  {tier.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                <p className="text-xs text-text-muted">{tier.subtitle}</p>
                <div className="mt-4">
                  {tier.price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">${tier.price}</span>
                      <span className="text-sm text-text-muted">/month</span>
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
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
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
                    ? 'bg-brand text-white hover:bg-brand-light'
                    : 'border border-white/10 text-white hover:bg-white/5'
                }`}
              >
                Join Waitlist
              </a>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center text-xs text-text-muted"
        >
          30-day free trial on all plans. Need more AI queries? Purchase top-up packs anytime. They never expire.
        </motion.p>
      </div>
    </section>
  )
}
