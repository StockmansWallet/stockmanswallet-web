'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

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
    name: 'Dashboard',
    tagline: 'Your herds at a glance',
    description: 'View your total livestock portfolio in one place. Track live market-linked pricing, monitor performance over time, and understand where your capital is concentrated across the herd.',
    color: '#D9762F',
    colorLight: '#F4A871',
    bullets: [
      'See your total livestock portfolio value update in real time',
      'Track live market-linked pricing across every herd',
      'Monitor performance over time with interactive charts',
      'Understand capital concentration across herd groups and properties',
      'Get a clear financial snapshot of your entire operation at a glance',
    ],
    mockup: '/images/mockup-dashboard.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: 'herds',
    name: 'Herd Valuation',
    tagline: 'Live financial assets',
    description: 'Turn each herd into a live financial asset. Market-linked valuations reflect breed premiums, daily weight gain, breeding activity, and projected biological change, so your balance sheet keeps pace with the paddock.',
    color: '#D9762F',
    colorLight: '#F4A871',
    bullets: [
      'Add and manage herds as financial assets within your portfolio',
      'Match each herd to live market data with breed premium adjustments',
      'Capture core herd inputs including headcount, weight, age, and class',
      'Track breeding activity, calving rates, and pre-birth accruals across relevant herds',
      'Apply growth and mortality assumptions to project changing herd values over time',
    ],
    mockup: '/images/mockup-herds.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    id: 'reports',
    name: 'Reports',
    tagline: 'Bank-ready in one tap',
    description: 'Generate professional reports your bank manager, accountant, or advisor can actually use. Asset registers, sales summaries, and branded valuation reports, filtered by date range and property, exported as PDF or shared via email.',
    color: '#D4A053',
    colorLight: '#E8C07A',
    bullets: [
      'Build asset registers with full herd-by-herd valuations and price source tracking',
      'Generate accountant-ready summaries with portfolio overview, composition, and sales history',
      'Filter by date range and property for precise reporting periods',
      'Export branded PDF reports or share directly via email',
      'Track sales performance with gross, freight, and net breakdowns',
    ],
    mockup: '/images/mockup-dashboard.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    id: 'advisory',
    name: 'Advisory Hub',
    tagline: 'Your portfolio, your terms',
    description: 'Give your banker, agent, accountant, or insurer a window into your portfolio, on your terms. Advisors request time-limited access, you approve or deny, and they get read-only tools purpose-built for professional analysis.',
    color: '#B0657A',
    colorLight: '#CC8E9F',
    bullets: [
      'Grant time-limited, read-only portfolio access to trusted advisors',
      'Approve or deny access requests with a 3-day approval window',
      'Advisors get dedicated tools including valuation overlays and scenario modelling',
      'Browse a directory of advisors by role, company, and region',
      'Keep full control and revoke access at any time',
    ],
    mockup: '/images/mockup-dashboard.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    id: 'yardbook',
    name: 'Yard Book',
    tagline: 'Your digital run sheet',
    description: 'Your digital run sheet. Track every mustering, vet visit, breeding event, maintenance job, and personal reminder in one place, with colour-coded categories, recurring schedules, and horizon-based grouping so nothing falls through the cracks.',
    color: '#87B11B',
    colorLight: '#A3CC3D',
    bullets: [
      'Create events across five categories: Health, Mustering, Maintenance, Breeding, and Admin',
      'Set recurring schedules and reminder offsets so you are always ahead',
      'Link events to one or more herds for full operational context',
      'View tasks grouped by horizon: Overdue, Today, Next 7 Days, Next 30, and beyond',
      'Mark items complete and track progress across your operation',
    ],
    mockup: '/images/mockup-dashboard.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    id: 'freight',
    name: 'Freight IQ',
    tagline: 'Know the cost before you commit',
    description: 'Estimate transport costs before you commit cattle to market. Industry-standard loading densities, real driving distances, and full cost breakdowns so you can compare markets net of freight and find the best return.',
    color: '#1399EC',
    colorLight: '#64BBF5',
    bullets: [
      '11 transport categories with weight-based escalation pricing',
      'Real driving distances calculated via Apple Maps',
      'Per-head, per-deck, and total cost breakdown including GST',
      'Save estimates for future reference and side-by-side comparison',
      'Feed results into Grid IQ for net-of-freight market vs processor analysis',
    ],
    mockup: '/images/mockup-freightiq.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h3.75L8.25 9h4.5m0 0l1.125 5.25M12.75 9h4.875c.621 0 1.125.504 1.125 1.125v3.375" />
      </svg>
    ),
  },
  {
    id: 'network',
    name: 'Producer Network',
    tagline: 'Connect with your region',
    description: 'Connect with other producers in your region. Build a trusted peer network to share operational insights, compare notes on markets and conditions, and collaborate on the challenges only another farmer understands.',
    color: '#7C6DD8',
    colorLight: '#A094E8',
    bullets: [
      'Browse a directory of producers and send connection requests',
      'Build a permanent network of trusted peers across your region',
      'Message connections directly with thread-based chat',
      'Share insights on markets, conditions, and service providers',
      'Control your visibility and opt in or out of the producer directory',
    ],
    mockup: '/images/mockup-dashboard.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    id: 'gridiq',
    name: 'Grid IQ',
    tagline: 'Market vs processor',
    description: 'Compare the saleyard against the processor before you sell. Upload grids via photo or PDF, let AI extract the data, build a test consignment from your portfolio, and see which channel nets the best return. Then track kill sheets to sharpen future decisions.',
    color: '#00B4A0',
    colorLight: '#33D4C0',
    bullets: [
      'AI-powered grid extraction from photos, PDFs, and spreadsheets',
      'Net market vs net processor comparison including freight',
      'Processor fit scoring and sell window indicator per category',
      'Post-kill analysis with Grid Capture Ratio, Realisation Factor, and Kill Score',
      'Build a kill sheet library that improves your predictions over time',
    ],
    mockup: '/images/mockup-dashboard.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 12h7.5m-7.5 0c0 .621.504 1.125 1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" />
      </svg>
    ),
  },
  {
    id: 'markets',
    name: 'Markets',
    tagline: 'Live market intelligence',
    description: 'Live MLA market data at your fingertips. National indicators, saleyard category prices, and trend signals, updated daily so you can time your decisions with confidence.',
    color: '#E8594E',
    colorLight: '#F08070',
    bullets: [
      'National price indicators for beef cattle, sheep, pigs, and goats with trend signals',
      'Saleyard category prices aggregated across Australian markets',
      'Track price movements over time by category and region',
      'Spot trends early with up, down, and flat market signals',
      'Data feeds directly into your portfolio valuations and insight engine',
    ],
    mockup: '/images/mockup-dashboard.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    id: 'insights',
    name: 'Insights',
    tagline: 'AI-powered decisions',
    description: 'Your AI stock advisor evaluates your portfolio every day against live market conditions and surfaces the calls that matter. Sell vs hold, optimal timing, weight targets, best market, price sensitivity, and calving forecasts.',
    color: '#D9762F',
    colorLight: '#F4A871',
    bullets: [
      'Daily AI evaluation of your portfolio against current market data',
      'Sell vs hold analysis with projected gains over 30, 60, and 90 days',
      'Optimal sale month identification based on historical seasonal pricing',
      'Calving forecasts tracking gestation progress and expected calf value',
      'Yard Book alerts surfacing overdue and upcoming tasks',
    ],
    mockup: '/images/mockup-stockmaniq.png',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
]

export default function Features() {
  const [active, setActive] = useState(0)
  const feature = FEATURE_TABS[active]

  function goPrev() {
    setActive((prev) => (prev - 1 + FEATURE_TABS.length) % FEATURE_TABS.length)
  }

  function goNext() {
    setActive((prev) => (prev + 1) % FEATURE_TABS.length)
  }

  return (
    <section id="features" className="relative py-24 lg:py-32">
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
                onClick={() => setActive(i)}
                className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 cursor-pointer ${
                  active === i
                    ? 'text-white'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {active === i && (
                  <motion.div
                    layoutId="featureTab"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: `${tab.color}15`, border: `1px solid ${tab.color}30` }}
                    transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
                  />
                )}
                <span className="relative z-10">{tab.icon}</span>
                <span className="relative z-10 hidden sm:inline">{tab.name}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Feature Content */}
        <div className="relative mt-16">
          {/* Prev / Next Arrows */}
          <button
            onClick={goPrev}
            aria-label="Previous feature"
            className="absolute -left-2 top-1/2 z-20 hidden -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-text-muted backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white lg:-left-14 lg:flex"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={goNext}
            aria-label="Next feature"
            className="absolute -right-2 top-1/2 z-20 hidden -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-text-muted backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white lg:-right-14 lg:flex"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
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

                {/* Mobile prev/next */}
                <div className="mt-8 flex items-center gap-3 lg:hidden">
                  <button
                    onClick={goPrev}
                    aria-label="Previous feature"
                    className="flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-text-muted transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <span className="text-xs tabular-nums text-text-muted">
                    {active + 1} / {FEATURE_TABS.length}
                  </span>
                  <button
                    onClick={goNext}
                    aria-label="Next feature"
                    className="flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-text-muted transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
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
      </div>
    </section>
  )
}
