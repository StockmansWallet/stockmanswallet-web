'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

/* ── Mock client data for the dashboard preview ── */
const MOCK_CLIENTS = [
  { name: 'J. McAllister', property: 'Doongara Station', herds: 4, value: 1_842_500, change: 3.2 },
  { name: 'R. Patterson', property: 'Willow Creek', herds: 2, value: 726_300, change: -1.1 },
  { name: 'S. Thornton', property: 'Boonarga Downs', herds: 6, value: 3_105_800, change: 5.7 },
]

const SCENARIOS = ['Conservative', 'Base', 'Optimistic'] as const

/* ── Advisor features ── */
const ADVISOR_FEATURES = [
  {
    title: 'Advisor Lens',
    description: 'Private valuation overlays with precision sliders for breed premiums, weight gain, calving, and mortality.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: 'Client Management',
    description: 'Time-limited, read-only access windows. Clients share data, you provide professional oversight.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    title: 'Simulator Sandbox',
    description: 'Clone client data and test optimistic, base, and conservative scenarios without touching live valuations.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    title: 'Professional Reports',
    description: 'Branded valuation summaries, asset registers, and accounting reports. Share via email or export as PDF.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
]

function formatAUD(v: number) {
  return '$' + v.toLocaleString('en-AU')
}

/* ── Mock dashboard panel ── */
function AdvisorDashboard({ activeScenario }: { activeScenario: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E5C8C]/20">
            <svg className="h-3.5 w-3.5 text-[#2F8CD9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Advisor Dashboard</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[#1E5C8C]/15 px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2F8CD9]" />
          <span className="text-[11px] font-medium text-[#2F8CD9]">Lens Active</span>
        </div>
      </div>

      {/* Scenario toggle */}
      <div className="border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-0.5">
          {SCENARIOS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 rounded-md px-2 py-1.5 text-center text-[11px] font-medium transition-all ${
                i === activeScenario
                  ? 'bg-[#1E5C8C]/30 text-[#2F8CD9]'
                  : 'text-text-muted'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Client rows */}
      <div className="divide-y divide-white/[0.04]">
        {MOCK_CLIENTS.map((client) => (
          <div key={client.name} className="flex items-center gap-4 px-5 py-4">
            {/* Avatar */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-white/60">
              {client.name.split(' ').map(n => n[0]).join('')}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{client.name}</p>
              <p className="text-[11px] text-text-muted">{client.property} · {client.herds} herds</p>
            </div>

            {/* Value */}
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-white">{formatAUD(client.value)}</p>
              <p className={`text-[11px] font-medium tabular-nums ${client.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {client.change >= 0 ? '+' : ''}{client.change}%
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer summary */}
      <div className="border-t border-white/[0.06] bg-white/[0.02] px-5 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Total Portfolio (3 clients)</span>
          <span className="text-sm font-bold tabular-nums text-white">
            {formatAUD(MOCK_CLIENTS.reduce((sum, c) => sum + c.value, 0))}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ForAdvisors() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeScenario, setActiveScenario] = useState(1)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Cycle through scenarios for visual interest
  useEffect(() => {
    if (!isVisible) return
    const interval = setInterval(() => {
      setActiveScenario((prev) => (prev + 1) % SCENARIOS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [isVisible])

  return (
    <section id="advisors" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-wider" style={{ color: '#2F8CD9' }}>
            For Advisors
          </span>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Purpose-built for{' '}
            <br className="hidden sm:block" />
            <span style={{ color: '#2F8CD9' }}>rural professionals</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-text-secondary">
            Bankers, livestock agents, accountants, and insurers get dedicated tools to manage client portfolios with professional-grade analysis.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div ref={sectionRef} className="mt-16 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Mock dashboard */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <AdvisorDashboard activeScenario={activeScenario} />
          </motion.div>

          {/* Right: Feature list */}
          <div className="space-y-6">
            {ADVISOR_FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="group flex gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1E5C8C]/20 bg-[#1E5C8C]/10 text-[#2F8CD9] transition-colors group-hover:bg-[#1E5C8C]/20">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
