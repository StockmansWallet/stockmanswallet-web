'use client'

import { motion } from 'framer-motion'
import { TEAM_MEMBERS } from '@/lib/marketing/constants'
import LandingCard from '@/components/marketing/ui/landing-card'

const EXTENDED_BIOS: Record<string, string> = {
  'Luke St. George':
    'Leading the vision for capital intelligence in Australian agriculture. Luke brings years of experience in agribusiness and a deep understanding of the challenges facing Australian livestock producers. His mission is to ensure every producer has access to the financial tools they deserve.',
  'Mil Jayaratne':
    'Driving operations and strategy to bring Stockman\u2019s Wallet to market. Mil\u2019s background in business operations and strategic planning ensures the platform delivers real value from day one. He oversees go-to-market strategy, partnerships, and business development.',
  'Leon Ernst':
    'Building the technology that powers intelligent livestock valuation. Leon architects the platform from end to end \u2014 from real-time market data pipelines and AI-powered analytics to the native iOS experience. He\u2019s driven by the belief that great software should feel invisible.',
}

export default function AboutTeam() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-wider text-brand">
            The Team
          </span>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Three Founders, One Mission
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            We&apos;re a Queensland-based team with deep roots in agriculture, technology,
            and business strategy.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
          {TEAM_MEMBERS.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <LandingCard className="flex h-full flex-col items-center text-center">
                {/* Avatar */}
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-brand/15 bg-brand/10">
                  <span className="text-2xl font-bold text-brand">
                    {member.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-semibold text-white">{member.name}</h3>
                <p className="mt-1 text-sm font-medium text-brand">{member.role}</p>

                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {EXTENDED_BIOS[member.name] ?? member.bio}
                </p>

                <a
                  href={`mailto:${member.email}`}
                  className="mt-auto pt-4 text-xs text-text-muted transition-colors hover:text-brand"
                >
                  {member.email}
                </a>
              </LandingCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
