'use client'

import { motion } from 'framer-motion'

export default function AboutHero() {
  return (
    <section className="relative py-32 lg:py-40">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 1200px 800px at 50% 30%, rgba(217,118,47,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="text-sm font-medium uppercase tracking-wider text-brand">
            Our Story
          </span>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Capital Intelligence for{' '}
            <span className="bg-gradient-to-br from-brand-light via-brand to-brand-dark bg-clip-text text-transparent">
              Australian Agriculture
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
            Founded on a simple observation: livestock producers manage millions of
            dollars in biological assets, yet lack the financial tools that equity
            investors take for granted. Stockman&apos;s Wallet changes that.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
