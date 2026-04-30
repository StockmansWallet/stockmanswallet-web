'use client'

import { motion } from 'framer-motion'

const BEFORE_ITEMS = [
  'Manual tallies and handwritten records',
  'Delayed or second-hand market data',
  'Gut-feel sale timing',
  'Spreadsheets the bank can\'t read',
]

const AFTER_ITEMS = [
  'Live portfolio valuations updated daily',
  'Real-time market pricing',
  'AI-powered sell signals and timing analysis',
  'Bank-ready professional reports',
]

export default function AboutMission() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Centred Intro */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="text-sm font-medium uppercase tracking-wider text-brand">
            The Problem
          </span>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Billions in Livestock,
            <br />
            <span className="text-brand">Zero Financial Visibility</span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            Australia&apos;s livestock industry is valued at over $80 billion, yet most
            producers rely on mental arithmetic, handwritten tallies, and gut instinct to
            track what their animals are worth. Equity investors have portfolio trackers
            and real-time pricing feeds. Livestock producers get a notebook and a calculator.
          </p>
        </motion.div>

        {/* Two Column Before / After */}
        <div className="mx-auto mt-16 grid max-w-3xl gap-8 sm:grid-cols-2 sm:gap-12">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Before
            </p>
            <div className="space-y-3.5">
              {BEFORE_ITEMS.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.2 + i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-error/10">
                    <svg className="h-3 w-3 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-sm text-text-secondary">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-brand">
              With Stockman&apos;s Wallet
            </p>
            <div className="space-y-3.5">
              {AFTER_ITEMS.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.35 + i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10">
                    <svg className="h-3 w-3 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-text-secondary">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
