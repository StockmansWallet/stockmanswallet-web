"use client";

import { motion } from "framer-motion";
import SectionCard from "@/components/marketing/ui/section-card";

const VALUES = [
  {
    title: "Built for the Bush",
    description:
      "Everything is designed around how Australian producers actually work. Stockman's Wallet is not a generic city made app applied to agriculture. It is purpose built from the paddock up.",
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </svg>
    ),
  },
  {
    title: "Numbers That Hold Up",
    description:
      "Valuations must be reliable, transparent, and grounded in reality. Live market data, breed premiums, and biological change all matter. The numbers should stand up when they are needed most.",
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
  },
  {
    title: "Your Hard Work, Realised",
    description:
      "Livestock value should be visible, understood, and usable in the real world. Better visibility supports better decisions, stronger reporting, and clearer recognition of the value created in the paddock.",
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    ),
  },
];

export default function AboutValues() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionCard
          className="px-6 py-12 sm:px-10 sm:py-14 lg:px-12 lg:py-16"
          glowPosition="78% 22%"
          glowSize="1100px 680px"
        >
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <span className="text-brand text-sm font-medium tracking-wider uppercase">
                Guiding Principles
              </span>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                What Guides Us
              </h2>
            </motion.div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-3">
              {VALUES.map((value, i) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group hover:ring-brand/25 relative overflow-hidden rounded-2xl bg-white/[0.04] p-8 ring-1 ring-white/[0.08] transition-all duration-300 ring-inset"
                >
                  {/* Hover glow */}
                  <div className="from-brand/[0.04] absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative">
                    <div className="border-brand/20 bg-brand/10 text-brand flex h-12 w-12 items-center justify-center rounded-xl border">
                      {value.icon}
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-white">{value.title}</h3>
                    <p className="text-text-secondary mt-2 text-sm leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
