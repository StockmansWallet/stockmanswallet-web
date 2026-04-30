"use client";

import { motion } from "framer-motion";
import SectionCard from "@/components/marketing/ui/section-card";

const BEFORE_ITEMS = [
  "Manual tallies and handwritten records",
  "Delayed or second-hand market data",
  "Gut-feel sale timing",
  "Spreadsheets the bank can't read",
];

const AFTER_ITEMS = [
  "Live portfolio valuations updated daily",
  "Real-time market pricing",
  "AI-powered sell signals and timing analysis",
  "Bank-ready professional reports",
];

export default function AboutMission() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionCard
          className="px-6 py-12 sm:px-10 sm:py-14 lg:px-12 lg:py-16"
          glowPosition="50% 18%"
          glowSize="1100px 680px"
        >
          <div className="relative z-10">
            {/* Centred Intro */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-3xl text-center"
            >
              <span className="text-brand text-sm font-medium tracking-wider uppercase">
                The Problem
              </span>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                Billions in Livestock,
                <br />
                <span className="text-brand">Zero Financial Visibility</span>
              </h2>
              <p className="text-text-secondary mt-6 text-base leading-relaxed">
                Australia&apos;s livestock industry is valued at over $80 billion, yet most
                producers rely on mental arithmetic, handwritten tallies, and gut instinct to track
                what their animals are worth. Equity investors have portfolio trackers and real-time
                pricing feeds. Livestock producers get a notebook and a calculator.
              </p>
            </motion.div>

            {/* Two Column Before / After */}
            <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-2 sm:gap-6">
              {/* Before */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/[0.08] ring-inset sm:p-8"
              >
                <p className="text-text-muted mb-5 text-xs font-semibold tracking-wider uppercase">
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
                      <div className="bg-error/10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                        <svg
                          className="text-error h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </div>
                      <span className="text-text-secondary text-sm">{item}</span>
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
                className="bg-brand/[0.05] ring-brand/20 rounded-2xl p-6 ring-1 ring-inset sm:p-8"
              >
                <p className="text-brand mb-5 text-xs font-semibold tracking-wider uppercase">
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
                      <div className="bg-brand/10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                        <svg
                          className="text-brand h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-text-secondary text-sm">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
