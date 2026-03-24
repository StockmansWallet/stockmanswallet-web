'use client'

import { motion } from 'framer-motion'
import LandingCard from '@/components/marketing/ui/landing-card'

const BEFORE_ITEMS = [
  'Manual tallies and handwritten records',
  'Delayed or second-hand market data',
  'Gut-feel sale timing',
  'Spreadsheets the bank can\'t read',
]

const AFTER_ITEMS = [
  'Live portfolio valuations updated daily',
  'Real-time MLA market pricing',
  'AI-powered sell signals and timing analysis',
  'Bank-ready professional reports',
]

export default function AboutMission() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Text Column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-medium uppercase tracking-wider text-brand">
              The Problem
            </span>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Billions in Livestock, Zero Financial Visibility
            </h2>

            <div className="mt-6 space-y-4 text-base leading-relaxed text-text-secondary">
              <p>
                Australia&apos;s livestock industry is valued at over $80 billion. Producers
                across the country manage herds worth hundreds of thousands &mdash; sometimes
                millions &mdash; of dollars. Yet most rely on mental arithmetic, handwritten
                tallies, and gut instinct to track what their animals are worth.
              </p>
              <p>
                Equity investors have portfolio trackers, real-time pricing feeds, and
                AI-driven analytics. Livestock producers get a notebook and a calculator.
                The information gap is staggering, and it costs producers real money every
                time they sell at the wrong moment, freight to the wrong yard, or undervalue
                their herd at the bank.
              </p>
              <p>
                We built Stockman&apos;s Wallet to close that gap. Live market data,
                intelligent valuation models, AI-powered timing analysis, and
                professional-grade reporting &mdash; all designed for the way producers
                actually work.
              </p>
            </div>
          </motion.div>

          {/* Card Column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <LandingCard level={2} className="space-y-6">
              <h3 className="text-center text-lg font-semibold text-white">
                From Guesswork to Intelligence
              </h3>

              {/* Before */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Before
                </p>
                {BEFORE_ITEMS.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-error/10">
                      <svg className="h-3 w-3 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="text-sm text-text-secondary">{item}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.06]" />

              {/* After */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  With Stockman&apos;s Wallet
                </p>
                {AFTER_ITEMS.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10">
                      <svg className="h-3 w-3 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-text-secondary">{item}</span>
                  </div>
                ))}
              </div>
            </LandingCard>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
