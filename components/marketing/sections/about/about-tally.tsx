"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import tallyAnimData from "@/public/animations/tally.json";
import SectionCard from "@/components/marketing/ui/section-card";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function AboutTally() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionCard
          className="px-6 py-12 sm:px-10 sm:py-14 lg:px-12 lg:py-16"
          glowPosition="22% 30%"
          glowSize="1100px 700px"
        >
          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Lottie Animation Column */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="flex items-center justify-center"
            >
              <div className="relative">
                {/* Subtle glow behind the animation */}
                <div
                  className="absolute inset-0 -m-8 rounded-full blur-3xl"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(216,150,61,0.08) 0%, transparent 70%)",
                  }}
                />
                <Lottie
                  animationData={tallyAnimData}
                  loop={false}
                  className="relative h-[200px] w-auto sm:h-[240px] lg:h-[280px]"
                />
              </div>
            </motion.div>

            {/* Text Column */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span className="text-brand text-sm font-medium tracking-wider uppercase">
                The Logomark
              </span>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                The <span className="text-brand">Tally</span>
              </h2>

              <div className="text-text-secondary mt-6 space-y-4 text-base leading-relaxed">
                <p>
                  The tally mark is one of humanity&apos;s oldest technologies. From notched bones
                  dating back 43,000 years to the five-bar gate scratched into a stockyard rail, it
                  represents the most fundamental act of record-keeping: one mark, one thing
                  counted, one responsibility acknowledged.
                </p>
                <p>
                  In Australian pastoral life, the tally is everywhere. Scratched into fenceposts
                  during musters. Carved into drafting-gate rails as cattle run through the race.
                  Pencilled into the yard book that every stockman carries or even Milwaukee penned
                  onto a pair of Wrangler jeans.{" "}
                  <span className="text-white/80">&ldquo;What&apos;s the tally?&rdquo;</span> is the
                  most fundamental question in stockwork, and the one that tells you whether the job
                  is done.
                </p>
                <p>
                  Old station yards carry decades of these marks layered into the timber. Each set
                  of five lines, four uprights crossed by a diagonal mirroring the shape of a
                  stockyard gate itself, is a record of animals seen, counted, and accounted for.
                  The five-bar tally is not just a number. It&apos;s an act of stewardship.
                </p>
                <p>
                  We chose it as our logomark because Stockman&apos;s Wallet is doing the same thing
                  stockmen have always done: keeping count of what&apos;s in your care. The tool has
                  changed, from a fencepost to a phone, but the purpose hasn&apos;t. Every
                  valuation, every insight, every report starts with the same ancient question.{" "}
                  <span className="text-white/80 italic">What&apos;s the tally?</span>
                </p>
              </div>
            </motion.div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
