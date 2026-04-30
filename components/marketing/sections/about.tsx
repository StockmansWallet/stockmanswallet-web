"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { TEAM_MEMBERS } from "@/lib/marketing/constants";
import LandingButton from "@/components/marketing/ui/landing-button";
import SectionCard from "@/components/marketing/ui/section-card";

export default function About() {
  return (
    <section id="about" className="relative py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionCard
          className="px-6 py-12 text-center sm:px-10 sm:py-14 lg:px-12 lg:py-16"
          glowPosition="50% 18%"
          glowSize="980px 620px"
        >
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-brand text-sm font-medium tracking-wider uppercase">
                About Us
              </span>
              <h2 className="mt-3 text-3xl font-semibold text-balance text-white sm:text-4xl lg:text-5xl">
                Built by Australians,
                <br className="hidden sm:block" />
                <span className="text-brand">for Australian producers</span>
              </h2>
              <p className="text-text-secondary mx-auto mt-4 max-w-2xl text-base leading-relaxed">
                We believe livestock producers deserve the same quality of financial tools available
                to equity investors. Real data, intelligent analysis, professional-grade reporting.
              </p>
            </motion.div>

            {/* Team strip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-8 sm:mt-12 sm:flex-nowrap sm:gap-10"
            >
              {TEAM_MEMBERS.map((member, i) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={72}
                    height={72}
                    className="h-14 w-14 rounded-full object-cover sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]"
                  />
                  <p className="mt-2.5 text-sm font-medium text-white">{member.name}</p>
                  <p className="text-text-muted text-xs">{member.role.replace("Chief ", "")}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="mt-10 flex justify-center"
            >
              <LandingButton
                variant="secondary"
                size="md"
                href="/about"
                className="backdrop-blur-sm"
              >
                Learn more about us
              </LandingButton>
            </motion.div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
