'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useInView } from 'framer-motion'

interface FeatureTab {
  id: string
  name: string
  tagline: string
  description: string
  color: string
  colorLight: string
  bullets: string[]
  mockup: string
  icon: React.ReactNode
}

const FEATURE_TABS: FeatureTab[] = [
  {
    id: 'dashboard',
    name: 'Portfolio Dashboard',
    tagline: 'Your herds at a glance',
    description: 'See your total livestock portfolio value update in real time. Live market data, performance charts, and capital concentration, all on one screen.',
    color: '#D9762F',
    colorLight: '#F4A871',
    bullets: ['Live market pricing', 'Performance charts with time-range scrubbing', 'Capital concentration breakdown'],
    mockup: '/images/mockup-dashboard.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: 'herds',
    name: 'Herd Management',
    tagline: 'Track every head',
    description: 'Add and manage herds as financial assets. Track head count, weight, daily weight gain, breeding details, and sell stock with full pricing analysis.',
    color: '#D9762F',
    colorLight: '#F4A871',
    bullets: ['Cattle, sheep, pigs, and goats', 'Breeding accruals and calving tracking', 'Weight gain projections with breed premiums'],
    mockup: '/images/mockup-herds.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    id: 'stockmaniq',
    name: 'Stockman IQ',
    tagline: 'AI capital intelligence',
    description: 'Ask questions in plain English about your herds. Get data-driven insights on the best sale month, optimal weight, and which market nets you the most after freight.',
    color: '#D9762F',
    colorLight: '#F4A871',
    bullets: ['9 insight templates from sell vs hold to calving forecasts', 'Voice input and output with Australian accent', 'Creates yard book events from conversation'],
    mockup: '/images/mockup-stockmaniq.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    id: 'freight',
    name: 'Freight IQ',
    tagline: 'Know the cost before you commit',
    description: 'Estimate transport costs using industry-standard loading densities and real driving distances. Compare markets net of freight to find the best return.',
    color: '#1399EC',
    colorLight: '#64BBF5',
    bullets: ['11 transport categories with weight escalation', 'Real driving distances via Apple Maps', 'Per head, per deck, and total cost breakdown'],
    mockup: '/images/mockup-freightiq.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h3.75L8.25 9h4.5m0 0l1.125 5.25M12.75 9h4.875c.621 0 1.125.504 1.125 1.125v3.375" />
      </svg>
    ),
  },
  {
    id: 'gridiq',
    name: 'Grid IQ',
    tagline: 'Market vs processor',
    description: 'Compare market prices against processor over-the-hooks grids. Upload grids via camera and let AI extract the data. Track kill sheets and realisation factors.',
    color: '#00B4A0',
    colorLight: '#33D4C0',
    bullets: ['AI grid extraction from photos and PDFs', 'Net market vs net processor comparison', 'Processor fit scoring and sell window indicator'],
    mockup: '/images/mockup-dashboard.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 12h7.5m-7.5 0c0 .621.504 1.125 1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" />
      </svg>
    ),
  },
]

const AUTO_ADVANCE_MS = 6000

export default function Features() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { once: false, amount: 0.3 })
  const feature = FEATURE_TABS[active]

  const advance = useCallback(() => {
    setActive((prev) => (prev + 1) % FEATURE_TABS.length)
  }, [])

  useEffect(() => {
    if (!inView || paused) return
    const timer = setInterval(advance, AUTO_ADVANCE_MS)
    return () => clearInterval(timer)
  }, [inView, paused, advance])

  function handleTabClick(i: number) {
    setActive(i)
    setPaused(true)
    // Resume auto-advance after 15s of no interaction
    setTimeout(() => setPaused(false), 15000)
  }

  return (
    <section ref={sectionRef} id="features" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-wider text-brand">Features</span>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Everything you need to manage{' '}
            <br className="hidden sm:block" />
            livestock as financial assets
          </h2>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 flex justify-center"
        >
          <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1.5">
            {FEATURE_TABS.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(i)}
                className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 cursor-pointer ${
                  active === i
                    ? 'text-white'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {active === i && (
                  <>
                    <motion.div
                      layoutId="featureTab"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: `${tab.color}15`, border: `1px solid ${tab.color}30` }}
                      transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
                    />
                    {!paused && (
                      <motion.div
                        key={`progress-${active}`}
                        className="absolute bottom-0 left-0 h-[2px] rounded-full"
                        style={{ background: tab.color }}
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
                      />
                    )}
                  </>
                )}
                <span className="relative z-10">{tab.icon}</span>
                <span className="relative z-10 hidden sm:inline">{tab.name}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Feature Content */}
        <div className="mt-16 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
            >
              <span
                className="text-sm font-medium uppercase tracking-wider"
                style={{ color: feature.colorLight }}
              >
                {feature.tagline}
              </span>
              <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                {feature.name}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-text-secondary">
                {feature.description}
              </p>
              <ul className="mt-6 space-y-3">
                {feature.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <svg
                      className="mt-0.5 h-5 w-5 shrink-0"
                      style={{ color: feature.color }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-text-secondary">{bullet}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          {/* Mockup */}
          <div className="relative flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-[240px] sm:w-[260px] lg:w-[280px]"
              >
                <Image
                  src={feature.mockup}
                  alt={`${feature.name} screenshot`}
                  width={390}
                  height={844}
                  className="w-full drop-shadow-[0_25px_60px_rgba(0,0,0,0.4)]"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
