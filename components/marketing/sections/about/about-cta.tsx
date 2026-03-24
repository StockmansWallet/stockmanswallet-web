'use client'

import { motion } from 'framer-motion'
import EmailForm from '@/components/marketing/ui/email-form'

export default function AboutCTA() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="text-sm font-medium uppercase tracking-wider text-brand">
            Join Us
          </span>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Be Part of the Future of
            <br />
            <span className="bg-gradient-to-r from-brand via-brand-light to-brand bg-clip-text text-transparent">
              Australian Livestock.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base text-text-secondary">
            Join the waitlist for early access. Founding members receive exclusive pricing
            and priority onboarding when we launch in May 2026.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-10 flex max-w-md justify-center"
        >
          <EmailForm size="large" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 text-xs text-text-muted"
        >
          Questions? Reach out at{' '}
          <a
            href="mailto:hello@stockmanswallet.com.au"
            className="text-brand transition-colors hover:text-brand-light"
          >
            hello@stockmanswallet.com.au
          </a>
        </motion.p>
      </div>
    </section>
  )
}
