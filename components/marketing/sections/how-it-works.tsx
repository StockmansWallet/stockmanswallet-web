'use client'

import { motion } from 'framer-motion'

const STEPS = [
  {
    number: '01',
    title: 'Add your herds',
    description: 'Enter your livestock details: species, breed, head count, and weight. Import from CSV or add manually.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Get real-time valuations',
    description: 'Live market data prices your herds automatically with breeding accruals and weight gain projections.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Make smarter decisions',
    description: 'AI-powered insights tell you when to sell, where to sell, and what you will net after freight.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 lg:py-32">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-wider text-brand">How It Works</span>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Three steps to capital clarity
          </h2>
        </motion.div>

        <div className="relative mt-20">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-brand/30 via-brand/10 to-transparent lg:block" />

          <div className="space-y-16 lg:space-y-24">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, delay: i * 0.15 }}
                className={`flex flex-col items-center gap-8 lg:flex-row ${
                  i % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Content */}
                <div className={`flex-1 ${i % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                  <div className={`inline-flex items-center gap-3 ${i % 2 === 0 ? 'lg:flex-row-reverse' : ''}`}>
                    <span className="text-sm font-bold text-brand">{step.number}</span>
                    <h3 className="text-xl font-semibold text-white sm:text-2xl">{step.title}</h3>
                  </div>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-text-secondary">
                    {step.description}
                  </p>
                </div>

                {/* Center node */}
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brand shadow-[0_0_40px_rgba(217,118,47,0.15)]">
                  {step.icon}
                </div>

                {/* Spacer for layout balance */}
                <div className="hidden flex-1 lg:block" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Valuation formula */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-20 max-w-2xl rounded-2xl border border-brand/10 bg-brand/[0.03] p-8 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-light">Valuation Engine</p>
          <p className="mt-4 font-mono text-sm leading-loose text-white sm:text-base">
            Livestock Value = Physical Value + Breeding Accrual + Daily Weight Gain - Mortality
          </p>
          <p className="mt-4 text-sm text-text-muted">
            Powered by live Australian market data, weight gain projections, and breeding cycle calculations.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
