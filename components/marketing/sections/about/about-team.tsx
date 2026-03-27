'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { TEAM_MEMBERS } from '@/lib/marketing/constants'

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
            Three Founders, <span className="text-brand">One Mission</span>
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
              className="flex flex-col items-center rounded-2xl bg-white/[0.04] p-6 text-center sm:p-7"
            >
              {/* Avatar */}
              <Image
                src={member.image}
                alt={member.name}
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
              />

              <h3 className="mt-5 text-lg font-semibold text-white">{member.name}</h3>
              <p className="mt-1 text-sm font-medium text-brand">{member.role}</p>

              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {member.bio}
              </p>

              <a
                href={`mailto:${member.email}`}
                className="mt-auto pt-4 text-xs text-text-muted transition-colors hover:text-brand"
              >
                {member.email}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
