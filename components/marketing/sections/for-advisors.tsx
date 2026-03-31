'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BLUE = '#2F8CD9'
const BLUE_DARK = '#1E5C8C'

function formatAUD(v: number) {
  return '$' + v.toLocaleString('en-AU')
}

/* ═══════════════════════════════════════════════════════
   Panel 0: Advisor Lens
   Based on: advisor-lens-panel.tsx
   Shows baseline/adjusted/shaded values + assumption sliders
   ═══════════════════════════════════════════════════════ */
function LensPanel() {
  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-[#2F8CD9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs font-semibold text-white">Advisor Lens</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-medium text-emerald-400">Active</span>
        </div>
      </div>

      {/* Three value cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Baseline', value: '$1,842,500', sub: "Client's value" },
          { label: 'Adjusted', value: '$1,716,200', sub: '-6.9%' },
          { label: 'Shaded', value: '$1,544,580', sub: '10% shading' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl bg-white/[0.04] p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{card.label}</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-white">{card.value}</p>
            <p className="mt-0.5 text-[10px] text-text-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Assumption overrides */}
      <div className="rounded-xl bg-white/[0.04] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Assumption Overrides</p>
        <div className="space-y-3">
          {[
            { label: 'Breed Premium', value: '-2.5%', baseline: '0%', pct: 35 },
            { label: 'Daily Weight Gain', value: '0.8 kg', baseline: '1.0 kg', pct: 60 },
            { label: 'Calving Rate', value: '82%', baseline: '88%', pct: 72 },
            { label: 'Mortality Rate', value: '3.5%', baseline: '2.0%', pct: 25 },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted">Baseline: {item.baseline}</span>
                  <span className="text-xs font-semibold tabular-nums text-white">{item.value}</span>
                </div>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[#2F8CD9]/50" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shading slider - bar shows retained value (90% = 10% shading) */}
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
        <span className="text-xs text-text-secondary">Shading</span>
        <div className="relative flex-1">
          <div className="h-1.5 rounded-full bg-white/[0.06]">
            <div className="h-full w-[90%] rounded-full bg-[#2F8CD9]" />
          </div>
          <div className="absolute left-[90%] top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#2F8CD9] bg-surface-primary" />
        </div>
        <span className="rounded-md bg-[#1E5C8C]/20 px-2 py-0.5 text-xs font-semibold tabular-nums text-[#2F8CD9]">10%</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Panel 1: Client Management
   Based on: advisor clients page + permission-banner
   Shows client list with status badges and stats
   ═══════════════════════════════════════════════════════ */
function ClientPanel() {
  const clients = [
    { name: 'J. McAllister', property: 'Doongara Station, QLD', herds: 4, status: 'sharing' as const },
    { name: 'R. Patterson', property: 'Willow Creek, NSW', herds: 2, status: 'pending' as const },
    { name: 'S. Thornton', property: 'Boonarga Downs, QLD', herds: 6, status: 'sharing' as const },
    { name: 'M. Douglas', property: 'Doongara North, QLD', herds: 3, status: 'expired' as const },
  ]

  const statusStyles = {
    sharing: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Data Shared' },
    pending: { bg: 'bg-[#2F8CD9]/15', text: 'text-[#2F8CD9]', label: 'Pending' },
    expired: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Expired' },
  }

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Clients', value: '4', icon: '👤' },
          { label: 'Sharing Data', value: '2', icon: '🟢' },
          { label: 'Pending', value: '1', icon: '🔵' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-white/[0.04] p-3 text-center">
            <p className="text-lg font-bold text-white">{stat.value}</p>
            <p className="mt-0.5 text-[10px] text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Client list */}
      <div className="overflow-hidden rounded-xl bg-white/[0.04]">
        <div className="border-b border-white/[0.06] px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Your Clients</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {clients.map((client) => {
            const style = statusStyles[client.status]
            return (
              <div key={client.name} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-white/60">
                  {client.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white">{client.name}</p>
                  <p className="text-[10px] text-text-muted">{client.property} · {client.herds} herds</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Panel 2: Simulator Sandbox
   Based on: simulator-content.tsx + simulator-property-detail
   Shows sandbox mode with editable assumptions
   ═══════════════════════════════════════════════════════ */
function SimulatorPanel() {
  return (
    <div className="space-y-3">
      {/* Simulation mode banner */}
      <div className="flex items-center gap-2 rounded-xl bg-[#FF5722]/10 border border-[#FF5722]/20 px-4 py-2.5">
        <svg className="h-4 w-4 text-[#FF5722]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF5722]">Simulation Mode</span>
        <span className="ml-auto text-[10px] text-[#FF5722]/70">Changes do not affect live data</span>
      </div>

      {/* Sandbox property */}
      <div className="overflow-hidden rounded-xl bg-white/[0.04]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">Doongara Station</p>
              <span className="rounded bg-[#FF5722]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#FF5722]">Sandbox</span>
            </div>
            <p className="mt-0.5 text-[10px] text-text-muted">4 herds · 186 head</p>
          </div>
        </div>

        {/* Herd with editable assumptions */}
        <div className="border-b border-white/[0.04] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">Angus Steers</p>
              <p className="text-[10px] text-text-muted">42 head · Grown Steer · 520 kg</p>
            </div>
            <p className="text-xs font-semibold tabular-nums text-white">{formatAUD(189_420)}</p>
          </div>

          {/* Editable fields */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: 'Head Count', value: '42' },
              { label: 'Weight (kg)', value: '520' },
              { label: 'DWG (kg/day)', value: '1.0' },
              { label: 'Mortality %', value: '2.0' },
            ].map((field) => (
              <div key={field.label} className="rounded-lg bg-white/[0.04] px-3 py-2">
                <p className="text-[9px] text-text-muted">{field.label}</p>
                <p className="mt-0.5 text-xs font-semibold tabular-nums text-white">{field.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Second herd row */}
        <div className="border-b border-white/[0.04] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">Hereford Breeders</p>
              <p className="text-[10px] text-text-muted">68 head · Breeder Cow · 480 kg</p>
            </div>
            <p className="text-xs font-semibold tabular-nums text-white">{formatAUD(272_680)}</p>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">Angus Weaners</p>
              <p className="text-[10px] text-text-muted">76 head · Weaner Steer · 220 kg</p>
            </div>
            <p className="text-xs font-semibold tabular-nums text-white">{formatAUD(112_480)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Panel 3: Professional Reports
   Based on: client-report-tab.tsx
   Shows report header + financial overview + asset register
   ═══════════════════════════════════════════════════════ */
function ReportsPanel() {
  return (
    <div className="space-y-3">
      {/* Report header */}
      <div className="rounded-xl bg-white/[0.04] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Advisor Valuation Justification</p>
            <p className="mt-0.5 text-[10px] text-text-muted">J. McAllister · Doongara Station</p>
          </div>
          <span className="rounded-md bg-[#1E5C8C]/20 px-2 py-0.5 text-[10px] font-medium text-[#2F8CD9]">Bank Copy</span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-text-muted">
          <span>Period: 01 Jan - 31 Mar 2026</span>
          <span>·</span>
          <span>Prepared by R. Webb, Senior Ag Lender</span>
        </div>
      </div>

      {/* Valuation comparison */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/[0.04] p-3 text-center">
          <p className="text-[10px] text-text-muted">Producer Value</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-white">$1,842,500</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] p-3 text-center">
          <p className="text-[10px] text-text-muted">Advisor Adjusted</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-[#2F8CD9]">$1,544,580</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] p-3 text-center">
          <p className="text-[10px] text-text-muted">Variance</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-amber-400">-16.2%</p>
        </div>
      </div>

      {/* Advisor adjustments table */}
      <div className="overflow-hidden rounded-xl bg-white/[0.04]">
        <div className="border-b border-white/[0.06] px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Advisor Adjustments Applied</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-text-muted">
                <th className="px-4 py-2 text-left font-medium">Assumption</th>
                <th className="px-2 py-2 text-right font-medium">Producer</th>
                <th className="px-2 py-2 text-right font-medium">Advisor</th>
                <th className="px-4 py-2 text-right font-medium">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {[
                { assumption: 'Breed Premium', producer: '0%', advisor: '-2.5%', impact: '-$46,063' },
                { assumption: 'Daily Weight Gain', producer: '1.0 kg', advisor: '0.8 kg', impact: '-$31,240' },
                { assumption: 'Calving Rate', producer: '88%', advisor: '82%', impact: '-$22,150' },
                { assumption: 'Mortality Rate', producer: '2.0%', advisor: '3.5%', impact: '-$14,217' },
                { assumption: 'Shading (10%)', producer: 'N/A', advisor: '10%', impact: '-$184,250' },
              ].map((row) => (
                <tr key={row.assumption} className="text-white/80">
                  <td className="px-4 py-2 font-medium">{row.assumption}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row.producer}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-[#2F8CD9]">{row.advisor}</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums text-amber-400">{row.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advisor notes */}
      <div className="rounded-xl bg-white/[0.04] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Advisor Notes</p>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary italic">
          &ldquo;Adjusted DWG to 0.8 kg/day based on current seasonal conditions and pasture quality. Breed premium reduced to reflect local market demand for crossbreds. Calving rate lowered due to first-calf heifers in the breeder herd. 10% shading applied per bank policy for lending security margin.&rdquo;
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Feature definitions with panels
   ═══════════════════════════════════════════════════════ */
const ADVISOR_FEATURES = [
  {
    title: 'Advisor Lens',
    description: 'Apply private valuation overlays. Adjust breed premiums, weight gain, calving rates, and mortality. Add shading to stress-test portfolio values.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    panel: <LensPanel />,
  },
  {
    title: 'Client Management',
    description: 'Grant time-limited, read-only access windows. Clients share their data on their terms, you provide professional oversight and analysis.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    panel: <ClientPanel />,
  },
  {
    title: 'Simulator Sandbox',
    description: 'Clone client data into an isolated sandbox. Adjust head counts, weights, and growth rates to model scenarios without touching live valuations.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    panel: <SimulatorPanel />,
  },
  {
    title: 'Professional Reports',
    description: 'Generate branded valuation summaries, asset registers, and accounting reports. Share via email or export as PDF.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    panel: <ReportsPanel />,
  },
]

/* ═══════════════════════════════════════════════════════
   Main section
   ═══════════════════════════════════════════════════════ */
export default function ForAdvisors() {
  const [active, setActive] = useState(0)

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
          <span className="text-sm font-medium uppercase tracking-wider" style={{ color: BLUE }}>
            For Advisors
          </span>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Purpose-built for{' '}
            <br className="hidden sm:block" />
            <span style={{ color: BLUE }}>rural professionals</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-text-secondary">
            Bankers, livestock agents, accountants, and insurers get dedicated tools to manage client portfolios with professional-grade analysis.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16 grid items-start gap-10 lg:grid-cols-[1fr_340px] lg:gap-12"
        >
          {/* Left: Animated panel */}
          <div className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {ADVISOR_FEATURES[active].panel}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Feature tabs */}
          <div className="order-1 space-y-2 lg:order-2">
            {ADVISOR_FEATURES.map((feature, i) => {
              const isActive = active === i
              return (
                <button
                  key={feature.title}
                  onClick={() => setActive(i)}
                  className={`group flex w-full cursor-pointer items-start gap-3.5 rounded-xl border px-4 py-4 text-left transition-all duration-200 ${
                    isActive
                      ? 'border-[#1E5C8C]/30 bg-[#1E5C8C]/10'
                      : 'border-transparent bg-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#1E5C8C]/25 text-[#2F8CD9]'
                      : 'bg-white/[0.05] text-text-muted group-hover:text-text-secondary'
                  }`}>
                    {feature.icon}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold transition-colors ${isActive ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>
                      {feature.title}
                    </p>
                    <p className={`mt-0.5 text-xs leading-relaxed transition-colors ${isActive ? 'text-text-secondary' : 'text-text-muted'}`}>
                      {feature.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
