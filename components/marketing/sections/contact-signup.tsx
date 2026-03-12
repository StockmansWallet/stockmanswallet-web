'use client'

import { motion } from 'framer-motion'
import EmailForm from '@/components/marketing/ui/email-form'

export default function ContactSignup() {
  return (
    <section id="signup" className="relative overflow-hidden py-24 lg:py-32">
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="text-sm font-medium uppercase tracking-wider text-brand">Get Early Access</span>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Stop guessing.
            <br />
            <span className="bg-gradient-to-r from-brand via-brand-light to-brand bg-clip-text text-transparent">
              Start knowing.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base text-text-secondary">
            Join the waitlist for Australia&apos;s first livestock portfolio management platform. Real market data, real-time valuations, AI-powered insights.
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

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 flex flex-col items-center gap-2"
        >
          <p className="text-xs text-text-muted">
            Currently in beta on TestFlight. Launching soon on the App Store.
          </p>
          <a
            href="mailto:hello@stockmanswallet.com.au"
            className="text-xs text-brand transition-colors hover:text-brand-light"
          >
            hello@stockmanswallet.com.au
          </a>
        </motion.div>
      </div>
    </section>
  )
}
