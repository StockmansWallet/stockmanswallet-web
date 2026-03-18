'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import EmailForm from '@/components/marketing/ui/email-form'

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  const phoneY = useTransform(scrollYProgress, [0, 1], [0, 80])
  const textY = useTransform(scrollYProgress, [0, 1], [0, -40])

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex min-h-[100dvh] items-center overflow-hidden"
    >
      {/* Background image */}
      <Image
        src="/images/landing-bg.webp"
        alt=""
        fill
        priority
        className="absolute inset-0 object-cover opacity-20"
      />

      {/* Dark overlay to keep text readable - more transparent at top so image shows through */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />

      {/* Subtle top-left radial gradient - centre pushed far off-screen so only the soft tail is visible */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 2200px 2200px at -500px -500px, rgba(217,118,47,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Noise texture to eliminate gradient banding */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          opacity: 0.1,
        }}
      />

      {/* Content */}
      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Text Column */}
          <motion.div
            style={{ y: textY }}
            className="flex flex-col items-start"
          >
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-sm font-medium tracking-wide text-brand-light"
            >
              Intelligent Livestock Valuation
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-5 text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[1.05] tracking-tight text-white"
            >
              Know what your
              <br />
              livestock are worth.
              <br />
              <span className="bg-gradient-to-br from-brand-light via-brand to-brand-dark bg-clip-text text-transparent">
                Every day.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 max-w-md text-lg leading-relaxed text-text-secondary"
            >
              Live saleyard market data. Real-time herd valuations. AI-powered capital timing intelligence for Australian producers and rural advisors.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-10 w-full max-w-md"
            >
              <EmailForm />
              <p className="mt-3 text-xs text-text-muted">
                Join the waitlist. Free early access for founding members.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-8 flex items-center gap-4"
            >
              <Image
                src="/images/download-on-app-store.svg"
                alt="Download on the App Store"
                width={120}
                height={40}
                className="h-10 w-auto opacity-60 transition-opacity hover:opacity-100"
              />
              <span className="text-xs text-text-muted">iPhone, iOS 18.0+</span>
            </motion.div>
          </motion.div>

          {/* Phone Column */}
          <motion.div
            style={{ y: phoneY }}
            className="relative flex items-center justify-center"
          >
            {/* Phone mockup */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-[260px] sm:w-[280px] lg:w-[300px]"
            >
              <Image
                src="/images/mockup-dashboard.png"
                alt="Stockman's Wallet app dashboard"
                width={390}
                height={844}
                className="w-full"
                priority
              />
            </motion.div>

            {/* Floating card: Portfolio Value */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.8 }}
              className="absolute -left-4 top-12 z-20 hidden w-52 rounded-2xl glass p-4 shadow-2xl lg:block xl:-left-20"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Portfolio Value</p>
              <p className="mt-1 text-2xl font-semibold text-white">$1.52M</p>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5">
                <svg className="h-3 w-3 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l5-5 3 3 4-4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11h4v4" />
                </svg>
                <span className="text-[11px] font-semibold text-success">+6.3%</span>
              </div>
            </motion.div>

            {/* Floating card: AI Insight */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 1.0 }}
              className="absolute -right-4 bottom-28 z-20 hidden w-56 rounded-2xl glass p-4 shadow-2xl lg:block xl:-right-16"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/20">
                  <svg className="h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-light">Stockman IQ</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                Optimal sale window: <span className="font-semibold text-white">October</span> at <span className="font-semibold text-white">520kg</span>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

    </section>
  )
}
