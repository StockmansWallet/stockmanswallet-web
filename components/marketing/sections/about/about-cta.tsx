"use client";

import { motion } from "framer-motion";
import LandingButton from "@/components/marketing/ui/landing-button";
import { useWaitlist } from "@/components/marketing/ui/waitlist-provider";

export default function AboutCTA() {
  const { openWaitlist } = useWaitlist();

  return (
    <section className="relative py-24 lg:py-32">
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="text-brand text-sm font-medium tracking-wider uppercase">Join Us</span>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Be Part of the Future of
            <br />
            <span className="text-brand">Australian Livestock.</span>
          </h2>
          <p className="text-text-secondary mx-auto mt-6 max-w-lg text-base">
            Join the waitlist for early access. Founding members receive exclusive pricing and
            priority onboarding when we launch in May 2026.
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

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-text-muted mt-6 text-xs"
        >
          Questions? Reach out at{" "}
          <a
            href="mailto:hello@stockmanswallet.com.au"
            className="text-brand hover:text-brand-light transition-colors"
          >
            hello@stockmanswallet.com.au
          </a>
        </motion.p>
      </div>
    </section>
  );
}
