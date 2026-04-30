"use client";

import { motion } from "framer-motion";
import SectionCard from "@/components/marketing/ui/section-card";

const STATS = [
  { label: "Market Categories", value: "50+" },
  { label: "Headquarters", value: "Queensland" },
  { label: "App Launch", value: "June '26" },
];

export default function AboutAustralia() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionCard
          className="px-6 py-12 sm:px-10 sm:py-14 lg:px-12 lg:py-16"
          glowPosition="22% 24%"
          glowSize="1100px 680px"
        >
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="mx-auto max-w-3xl text-center"
            >
              <span className="text-brand text-sm font-medium tracking-wider uppercase">
                Made in Queensland
              </span>

              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                Australian <span className="text-brand">Data.</span>
                <br className="hidden sm:block" />
                Australian <span className="text-brand">Markets.</span>
                <br className="hidden sm:block" />
                Australian <span className="text-brand">Producers.</span>
              </h2>

              <p className="text-text-secondary mx-auto mt-6 max-w-2xl text-base leading-relaxed">
                Stockman&apos;s Wallet is built and operated in Queensland, Australia. We source our
                market data from Australian saleyards, calculate freight on Australian roads, and
                design every feature for the conditions and categories that matter to Australian
                producers. From the pastures of Tasmania to the stations of the Top End,
                Stockman&apos;s Wallet understands your country.
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
                  <p className="text-brand text-3xl font-bold tabular-nums sm:text-4xl">
                    {stat.value}
                  </p>
                  <p className="text-text-muted mt-2 text-xs font-medium tracking-wide uppercase sm:text-[13px]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
