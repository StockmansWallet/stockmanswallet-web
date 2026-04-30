"use client";

import { motion } from "framer-motion";
import SectionCard from "@/components/marketing/ui/section-card";

export default function AboutHero() {
  return (
    <section className="relative pt-28">
      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionCard
          className="px-6 py-12 text-center sm:px-10 sm:py-16 lg:px-12 lg:py-20"
          glowPosition="50% 22%"
          glowSize="1200px 720px"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative z-10 mx-auto max-w-3xl"
          >
            <span className="text-brand text-sm font-medium tracking-wider uppercase">
              Our Story
            </span>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
              Capital Intelligence
              <br />
              <span className="text-brand">for Australian Agriculture</span>
            </h1>

            <p className="text-text-secondary mx-auto mt-6 max-w-2xl text-lg leading-relaxed">
              Founded on a simple observation: livestock producers manage millions of dollars in
              biological assets, yet lack the financial tools that equity investors take for
              granted. Stockman&apos;s Wallet changes that.
            </p>
          </motion.div>
        </SectionCard>
      </div>
    </section>
  );
}
