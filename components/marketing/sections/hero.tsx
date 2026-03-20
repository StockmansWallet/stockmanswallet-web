'use client'

import { useRef } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { motion, useScroll, useTransform } from 'framer-motion'
import EmailForm from '@/components/marketing/ui/email-form'
import tallyAnimData from '@/public/animations/tally.json'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background" />

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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6"
            >
              <Lottie
                animationData={tallyAnimData}
                loop={false}
                className="h-[200px] w-auto"
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-[clamp(1.8rem,3.5vw,3rem)] font-semibold leading-[1.1] tracking-tight text-white"
            >
              Precision Valuation.
              <br />
              <span className="bg-gradient-to-br from-brand-light via-brand to-brand-dark bg-clip-text text-transparent">
                Driven by Intelligence.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 max-w-lg text-lg leading-relaxed text-text-secondary"
            >
              Master market shifts, track biological growth, and compare sale pathways with advanced industry intelligence. Stockman&apos;s Wallet gives producers and advisors the clarity to make more informed decisions.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-10 w-full max-w-md"
            >
              <EmailForm />
              <p className="mt-3 text-xs text-text-muted">
                Join the waitlist. We&apos;ll email you before launch with early access details.
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
              <span className="text-sm text-text-muted">Coming May 2026</span>
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

            {/* Floating insight card: Sell vs Hold (green) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.8 }}
              className="absolute left-4 top-[25%] z-20 hidden w-72 rounded-2xl p-5 shadow-2xl lg:block xl:-left-8"
              style={{ backgroundColor: 'rgba(124, 167, 73, 0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(124, 167, 73, 0.15)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15">
                  <svg className="h-4.5 w-4.5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Sell vs Hold</p>
                  <p className="text-[10px] text-text-muted">Test Herd 3</p>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-2xl font-bold text-success">+$85,025</p>
                <p className="text-[11px] text-text-muted">potential gain over 90 days</p>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-text-secondary">
                Test Herd 3 is worth $190,650 today. Holding 90 days projects to $275,675.
              </p>
            </motion.div>

            {/* Floating insight card: Freight IQ (blue) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 1.0 }}
              className="absolute right-4 top-[45%] z-20 hidden w-72 rounded-2xl p-5 shadow-2xl lg:block xl:-right-8"
              style={{ backgroundColor: 'rgba(19, 153, 236, 0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(19, 153, 236, 0.15)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1399EC]/15">
                  <svg className="h-4.5 w-4.5 text-[#64BBF5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h3.75L8.25 9h4.5m0 0l1.125 5.25M12.75 9h4.875c.621 0 1.125.504 1.125 1.125v3.375" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Freight IQ</p>
                  <p className="text-[10px] text-text-muted">87 Heifers to Emerald</p>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#64BBF5]">$5,958</p>
                <p className="text-[11px] text-text-muted">+ $596 GST</p>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-text-secondary">
                $68.48 per head, 662 km from Pure Produce to Emerald.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

    </section>
  )
}
