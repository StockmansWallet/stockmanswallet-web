'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TEAM_MEMBERS } from '@/lib/marketing/constants'
import LandingButton from '@/components/marketing/ui/landing-button'

export default function About() {
  return (
    <section id="about" className="relative py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-wider text-brand">About Us</span>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Built by Australians, for{' '}
            <br className="hidden sm:block" />
            Australian producers
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            We believe livestock producers deserve the same quality of financial tools available to equity investors. Real data, intelligent analysis, professional-grade reporting.
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
                className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10 sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]"
              />
              <p className="mt-2.5 text-sm font-medium text-white">{member.name}</p>
              <p className="text-xs text-text-muted">{member.role.replace('Chief ', '')}</p>
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
          <LandingButton variant="secondary" size="sm" href="/about">
            Learn more about us
          </LandingButton>
        </motion.div>
      </div>
    </section>
  )
}
