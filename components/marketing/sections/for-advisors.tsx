'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BLUE = '#2F8CD9'
const BLUE_DARK = '#1E5C8C'

function formatAUD(v: number) {
  return '$' + v.toLocaleString('en-AU')
}

/* ═══════════════════════════════════════════════════════
   Panel 0: Dashboard
   Based on: advisor/page.tsx
   Shows welcome, stats, recent clients, region chart
   ═══════════════════════════════════════════════════════ */
function DashboardPanel() {
  const recentClients = [
    { name: 'J. McAllister', property: 'Doongara Station', herds: 4, status: 'active' as const },
    { name: 'S. Thornton', property: 'Boonarga Downs', herds: 6, status: 'active' as const },
    { name: 'R. Patterson', property: 'Willow Creek', herds: 2, status: 'pending' as const },
    { name: 'M. Douglas', property: 'Doongara North', herds: 3, status: 'expired' as const },
  ]
  const statusStyles = {
    active: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Active' },
    pending: { bg: 'bg-[#2F8CD9]/15', text: 'text-[#2F8CD9]', label: 'Pending' },
    expired: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Expired' },
  }
  const regions = [
    { name: 'Charters Towers Regional Council', count: 56, pct: 40, value: '$85.6M', colour: '#34D399' },
    { name: 'Etheridge Shire Council', count: 37, pct: 26, value: '$55.6M', colour: '#60A5FA' },
    { name: 'Townsville City Council', count: 28, pct: 20, value: '$42.8M', colour: '#F472B6' },
    { name: 'Hinchinbrook Shire Council', count: 20, pct: 14, value: '$30.0M', colour: '#A78BFA' },
  ]

  return (
    <div className="space-y-3">
      {/* Top row: Welcome + Portfolio value */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <div className="rounded-xl bg-white/[0.04] px-4 py-3">
          <p className="text-lg font-bold text-[#2F8CD9]">Welcome, Rebecca</p>
          <p className="mt-0.5 text-[10px] text-text-muted">Your advisor workspace overview.</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] px-4 py-3 text-center sm:min-w-[200px]">
          <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Total Livestock Under Management</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">$213,955,020</p>
          <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            $6.2M <span className="opacity-50">|</span> +2.9%
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {[
          { label: 'Total Clients', value: '141', dot: 'bg-[#2F8CD9]' },
          { label: 'Sharing Data', value: '132', dot: 'bg-emerald-400' },
          { label: 'Pending', value: '9', dot: 'bg-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-white/[0.04] p-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${stat.dot}`} />
              <p className="text-lg font-bold tabular-nums text-white">{stat.value}</p>
            </div>
            <p className="mt-0.5 text-[10px] text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Two-column: Recent Clients + LGA + Quick Actions */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_3fr]">
        {/* Recent clients */}
        <div className="overflow-hidden rounded-xl bg-white/[0.04]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Recent Clients</p>
            <span className="text-[10px] font-medium text-[#2F8CD9]">View all</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentClients.map((client) => {
              const style = statusStyles[client.status]
              return (
                <div key={client.name} className="flex items-center gap-2.5 px-3 py-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[9px] font-semibold text-white/60">
                    {client.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-white">{client.name}</p>
                    <p className="text-[9px] text-text-muted">{client.property} · {client.herds} herds</p>
                  </div>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column: LGA chart + Quick actions stacked */}
        <div className="flex flex-col gap-2">
          {/* Clients by LGA - donut chart */}
          <div className="overflow-hidden rounded-xl bg-white/[0.04]">
            <div className="border-b border-white/[0.06] px-4 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Clients by Local Govt Area</p>
            </div>
            <div className="flex items-center gap-4 p-3">
              {/* Donut chart SVG */}
              <div className="relative shrink-0">
                <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                  {(() => {
                    const r = 38
                    const circ = 2 * Math.PI * r
                    let offset = 0
                    return regions.map((region) => {
                      const dash = (region.pct / 100) * circ
                      const gap = circ - dash
                      const currentOffset = offset
                      offset += dash
                      return (
                        <circle
                          key={region.name}
                          cx="50" cy="50" r={r}
                          fill="none"
                          stroke={region.colour}
                          strokeWidth="12"
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={-currentOffset}
                          strokeLinecap="butt"
                        />
                      )
                    })
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-sm font-bold tabular-nums text-white">141</p>
                  <p className="text-[8px] text-text-muted">clients</p>
                </div>
              </div>

              {/* Legend */}
              <div className="min-w-0 flex-1 space-y-1.5">
                {regions.map((region) => (
                  <div key={region.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: region.colour }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] text-text-secondary">{region.name}</p>
                      <p className="text-[9px] tabular-nums text-text-muted">{region.count} clients · {region.value}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium tabular-nums text-white">{region.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'My Clients', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
              { label: 'Find Producers', icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' },
            ].map((action) => (
              <div key={action.label} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2F8CD9]/15">
                  <svg className="h-3.5 w-3.5 text-[#2F8CD9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-text-secondary">{action.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Panel 1: Advisor Lens
   Based on: advisor-lens-panel.tsx
   Shows baseline/adjusted/shaded values + assumption sliders
   ═══════════════════════════════════════════════════════ */
function LensPanel() {
  return (
    <div className="space-y-3">
      {/* Header bar with client info */}
      <div className="rounded-xl bg-white/[0.04] px-4 py-3">
        <div className="flex items-center justify-between">
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
        <div className="mt-2 flex items-center gap-3 border-t border-white/[0.06] pt-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[9px] font-semibold text-white/60">JM</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white">J. McAllister</p>
            <p className="text-[10px] text-text-muted">Doongara Station, QLD · 4 herds · 186 head</p>
          </div>
        </div>
      </div>

      {/* Three value cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { label: 'Baseline', value: '$1,842,500', sub: "Client's value", colour: 'text-white' },
          { label: 'Adjusted', value: '$1,716,200', sub: '-6.9%', colour: 'text-[#2F8CD9]' },
          { label: 'Shaded', value: '$1,544,580', sub: '10% shading', colour: 'text-amber-400' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl bg-white/[0.04] p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{card.label}</p>
            <p className={`mt-1 text-sm font-bold tabular-nums ${card.colour}`}>{card.value}</p>
            <p className="mt-0.5 text-[10px] text-text-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Assumption overrides */}
      <div className="rounded-xl bg-white/[0.04] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Assumption Overrides</p>
        <div className="space-y-3">
          {[
            { label: 'Head Count', value: '178', baseline: '186', pct: 96 },
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
                <div className="h-full rounded-full bg-[#2F8CD9]" style={{ width: `${item.pct}%` }} />
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
            <div className="h-full w-[90%] rounded-full bg-amber-500" />
          </div>
          <div className="absolute left-[90%] top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-500 bg-surface-primary" />
        </div>
        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-400">90%</span>
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                { assumption: 'Head Count', producer: '186', advisor: '178', impact: '-$79,320' },
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
          &ldquo;Head count reduced from 186 to 178 to exclude 8 head pending vet clearance following recent drench resistance testing. Breed premium adjusted to -2.5% as the Doongara Angus herd carries a higher proportion of crossbreds than pure Angus, reducing the premium achievable at Charters Towers. DWG lowered to 0.8 kg/day reflecting below-average pasture conditions following a dry February and limited supplementary feeding. Calving rate reduced from 88% to 82% due to 24 first-calf heifers in the breeder herd, which historically calve at a lower rate. Mortality rate increased from 2.0% to 3.5% based on the property&#39;s 3-year rolling average, which accounts for tick fever losses in 2024. 10% shading applied per standard bank lending policy to provide a security margin on the assessed portfolio value.&rdquo;
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
    title: 'Dashboard',
    description: 'Your advisory workspace at a glance. Track client connections, permission status, and regional portfolio distribution.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    panel: <DashboardPanel />,
  },
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
    <section id="advisors" className="relative py-16 sm:py-24 lg:py-32">
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
          className="mt-12 grid items-start gap-8 sm:mt-16 sm:gap-10 lg:grid-cols-[1fr_320px] lg:gap-12"
        >
          {/* Left: Animated panel */}
          <div className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 sm:p-4 lg:p-5">
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
