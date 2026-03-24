'use client'

import { motion } from 'framer-motion'

const STATS = [
  { label: 'MLA Market Categories', value: '50+' },
  { label: 'Headquarters', value: 'Queensland' },
  { label: 'Launching', value: 'May 2026' },
]

export default function AboutAustralia() {
  return (
    <section className="relative border-y border-white/[0.04] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="text-sm font-medium uppercase tracking-wider text-brand">
            Made in Queensland
          </span>

          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Australian <span className="text-brand">Data.</span>
            <br className="hidden sm:block" />
            Australian <span className="text-brand">Markets.</span>
            <br className="hidden sm:block" />
            Australian <span className="text-brand">Producers.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary">
            Stockman&apos;s Wallet is built and operated in Queensland, Australia. We source
            our market data from Meat &amp; Livestock Australia, calculate freight on
            Australian roads, and design every feature for the conditions and categories
            that matter to Australian producers. From the Darling Downs to the Top End,
            this platform understands your country.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-8"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-brand sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-text-muted sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
