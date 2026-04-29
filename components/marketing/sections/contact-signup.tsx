"use client";

import { motion } from "framer-motion";
import LandingButton from "@/components/marketing/ui/landing-button";
import { useWaitlist } from "@/components/marketing/ui/waitlist-provider";

export default function ContactSignup() {
  const { openWaitlist } = useWaitlist();

  return (
    <section id="signup" className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="text-brand text-sm font-medium tracking-wider uppercase">
            Get Early Access
          </span>
          <h2 className="mt-4 text-2xl font-semibold text-balance text-white sm:text-3xl lg:text-5xl">
            The future of
            <br />
            <span className="text-brand">livestock valuation.</span>
          </h2>
          <p className="text-text-secondary mx-auto mt-6 max-w-lg text-base">
            Join the waitlist for Australia&apos;s first livestock portfolio management platform.
            Launching June 2026 on the App Store, with companion web access.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-10 flex justify-center"
        >
          <LandingButton size="sm" onClick={openWaitlist}>
            Join Waitlist
          </LandingButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 flex flex-col items-center gap-2"
        >
          <p className="text-text-muted max-w-sm text-xs leading-relaxed">
            We&apos;ll send you an email before launch with early access instructions. Founding
            members get exclusive pricing and priority onboarding.
          </p>
          <a
            href="mailto:hello@stockmanswallet.com.au"
            className="text-brand hover:text-brand-light text-xs transition-colors"
          >
            hello@stockmanswallet.com.au
          </a>
        </motion.div>
      </div>
    </section>
  );
}
