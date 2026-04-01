'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Modal } from '@/components/ui/modal'

type Role = 'producer' | 'advisor'
type HerdSize = 'under_50' | '50_500' | '500_2000' | '2000_plus'
type PropertyCount = '1' | '2_plus'
type ClientCount = 'under_15' | '15_100' | '100_plus'
type SubscriptionTier = 'jackaroo' | 'stockman' | 'head_stockman' | 'advisor' | 'head_advisor'

interface WaitlistFormData {
  name: string
  email: string
  role: Role | ''
  postcode: string
  herd_size: HerdSize | ''
  property_count: PropertyCount | ''
  client_count: ClientCount | ''
  preferred_tier: SubscriptionTier | ''
  interested_features: string[]
  contact_opt_in: boolean
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'producer', label: 'Producer' },
  { value: 'advisor', label: 'Advisor' },
]

const HERD_SIZE_OPTIONS: { value: HerdSize; label: string }[] = [
  { value: 'under_50', label: 'Under 50' },
  { value: '50_500', label: '50\u2013500' },
  { value: '500_2000', label: '500\u20132,000' },
  { value: '2000_plus', label: '2,000+' },
]

const PROPERTY_OPTIONS: { value: PropertyCount; label: string }[] = [
  { value: '1', label: '1' },
  { value: '2_plus', label: '2+' },
]

const CLIENT_COUNT_OPTIONS: { value: ClientCount; label: string }[] = [
  { value: 'under_15', label: 'Up to 15' },
  { value: '15_100', label: '15\u2013100' },
  { value: '100_plus', label: '100+' },
]

const TIER_OPTIONS: Record<Role, { value: SubscriptionTier; label: string; subtitle: string }[]> = {
  producer: [
    { value: 'jackaroo', label: 'Jackaroo', subtitle: 'Entry Level' },
    { value: 'stockman', label: 'Stockman', subtitle: 'Single Property' },
    { value: 'head_stockman', label: 'Head Stockman', subtitle: 'Multi Property' },
  ],
  advisor: [
    { value: 'advisor', label: 'Advisor', subtitle: 'Professional' },
    { value: 'head_advisor', label: 'Head Advisor', subtitle: 'Enterprise' },
  ],
}

const FEATURE_OPTIONS: Record<Role, { value: string; label: string }[]> = {
  producer: [
    { value: 'herd_valuation', label: 'Herd Valuation' },
    { value: 'brangus', label: 'Brangus AI' },
    { value: 'reports', label: 'Reports' },
    { value: 'yard_book', label: 'Yard Book' },
    { value: 'freight_iq', label: 'Freight IQ' },
    { value: 'grid_iq', label: 'Grid IQ' },
    { value: 'insights', label: 'Insights' },
    { value: 'producer_network', label: 'Producer Network' },
    { value: 'advisory_hub', label: 'Advisory Hub' },
    { value: 'markets', label: 'Markets' },
  ],
  advisor: [
    { value: 'brangus', label: 'Brangus AI' },
    { value: 'advisor_lens', label: 'Advisor Lens' },
    { value: 'scenarios', label: 'Scenarios & Simulator' },
    { value: 'reports', label: 'Reports' },
    { value: 'freight_iq', label: 'Freight IQ' },
    { value: 'insights', label: 'Insights' },
    { value: 'markets', label: 'Markets' },
  ],
}

const INITIAL_FORM: WaitlistFormData = {
  name: '',
  email: '',
  role: '',
  postcode: '',
  herd_size: '',
  property_count: '',
  client_count: '',
  preferred_tier: '',
  interested_features: [],
  contact_opt_in: false,
}

const reveal = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
}

interface WaitlistModalProps {
  open: boolean
  onClose: () => void
}

export function WaitlistModal({ open, onClose }: WaitlistModalProps) {
  const [form, setForm] = useState<WaitlistFormData>({ ...INITIAL_FORM })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [emailBlurred, setEmailBlurred] = useState(false)

  function updateField<K extends keyof WaitlistFormData>(key: K, value: WaitlistFormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'role') {
        next.herd_size = ''
        next.property_count = ''
        next.client_count = ''
        next.preferred_tier = ''
        next.interested_features = []
      }
      return next
    })
    if (status === 'error') setStatus('idle')
  }

  function toggleFeature(feature: string) {
    setForm((prev) => ({
      ...prev,
      interested_features: prev.interested_features.includes(feature)
        ? prev.interested_features.filter((f) => f !== feature)
        : [...prev.interested_features, feature],
    }))
    if (status === 'error') setStatus('idle')
  }

  function toggleAllFeatures() {
    if (!form.role) return
    const allValues = FEATURE_OPTIONS[form.role as Role].map((f) => f.value)
    setForm((prev) => ({
      ...prev,
      interested_features:
        prev.interested_features.length === allValues.length ? [] : allValues,
    }))
    if (status === 'error') setStatus('idle')
  }

  const hasRole = form.role !== ''
  const hasDetails =
    form.role === 'producer'
      ? form.herd_size !== '' && form.property_count !== ''
      : form.role === 'advisor'
        ? form.client_count !== ''
        : false
  const hasFeatures = form.interested_features.length > 0
  const allFeaturesSelected =
    hasRole && form.interested_features.length === FEATURE_OPTIONS[form.role as Role]?.length

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
  const showEmailHint = emailBlurred && form.email.length > 0 && !emailValid

  const hasTier = form.preferred_tier !== ''

  const isValid =
    form.name.trim() !== '' &&
    emailValid &&
    form.role !== '' &&
    form.postcode.trim() !== '' &&
    hasDetails &&
    hasFeatures &&
    hasTier

  const missingHint = (() => {
    if (!form.name.trim()) return 'Enter your name'
    if (!emailValid) return 'Enter a valid email address'
    if (!form.role) return 'Choose your role'
    if (!form.postcode.trim()) return 'Enter your postcode'
    if (!hasDetails) {
      return form.role === 'producer'
        ? 'Select herd size and properties above'
        : 'Select client count above'
    }
    if (!hasFeatures) return 'Select at least one feature'
    if (!hasTier) return 'Choose a preferred plan'
    return null
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setStatus('submitting')
    setErrorMsg('')

    try {
      const payload: Record<string, string | string[] | boolean> = {
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        role: form.role,
        postcode: form.postcode.trim(),
        interested_features: form.interested_features,
        contact_opt_in: form.contact_opt_in,
      }
      if (form.role === 'producer') {
        payload.herd_size = form.herd_size
        payload.property_count = form.property_count
      } else {
        payload.client_count = form.client_count
      }
      if (form.preferred_tier) {
        payload.preferred_tier = form.preferred_tier
      }

      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setStatus('success')
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  function handleClose() {
    onClose()
    setTimeout(() => {
      setForm({ ...INITIAL_FORM })
      setStatus('idle')
      setErrorMsg('')
      setEmailBlurred(false)
    }, 350)
  }

  // -- Shared style helpers --
  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-brand/40 focus:bg-white/[0.06]'

  function pillClass(selected: boolean) {
    return `rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
      selected
        ? 'border-brand/40 bg-brand/10 text-brand'
        : 'border-white/[0.08] bg-white/[0.02] text-text-secondary hover:border-white/15 hover:bg-white/[0.05]'
    }`
  }

  function chipClass(selected: boolean) {
    return `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 cursor-pointer ${
      selected
        ? 'border-brand/40 bg-brand/10 text-brand'
        : 'border-white/[0.08] text-text-secondary hover:border-white/15 hover:bg-white/[0.05]'
    }`
  }

  // -- Success state --
  if (status === 'success') {
    return (
      <Modal open={open} onClose={handleClose} size="sm">
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-5 text-lg font-semibold text-white">You&apos;re on the list!</h3>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-text-secondary">
            We&apos;ll be in touch before launch with early access details and exclusive founding member pricing.
          </p>
          <button
            onClick={handleClose}
            className="mt-7 inline-flex h-10 items-center justify-center rounded-xl bg-brand px-6 text-sm font-semibold text-white transition-all duration-150 hover:bg-brand-light active:scale-[0.97] cursor-pointer"
          >
            Done
          </button>
        </div>
      </Modal>
    )
  }

  // -- Form --
  return (
    <Modal open={open} onClose={handleClose} size="lg">
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/[0.08] hover:text-text-primary cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="max-h-[80vh] overflow-y-auto overscroll-contain -mx-6 px-6 pb-1">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Join the <span className="text-brand">Waitlist</span>
          </h2>
          <p className="mx-auto mt-2.5 max-w-sm text-[15px] leading-relaxed text-text-secondary">
            Be the first to know when we launch, and help us build something great for your operation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role — Apple segmented control */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
              I am a <span className="text-brand/80">*</span>
            </label>
            <div className="flex rounded-xl bg-white/[0.04] p-1">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('role', opt.value)}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    form.role === opt.value
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Email */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="wl-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
                Name <span className="text-brand/80">*</span>
              </label>
              <input
                id="wl-name"
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Your name"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wl-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
                Email <span className="text-brand/80">*</span>
              </label>
              <input
                id="wl-email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                onBlur={() => setEmailBlurred(true)}
                placeholder="you@example.com"
                required
                className={`${inputClass} ${showEmailHint ? 'border-red-400/50' : ''}`}
              />
              <AnimatePresence>
                {showEmailHint && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1.5 text-xs text-red-400/80"
                  >
                    Please enter a valid email address
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Postcode */}
          <div>
            <label htmlFor="wl-postcode" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Postcode <span className="text-brand/80">*</span>
            </label>
            <input
              id="wl-postcode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={form.postcode}
              onChange={(e) => updateField('postcode', e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 4350"
              required
              className={`${inputClass} sm:max-w-[140px]`}
            />
          </div>

          {/* ── Producer details ── */}
          <AnimatePresence>
            {form.role === 'producer' && (
              <motion.div {...reveal} className="overflow-hidden">
                <div className="border-t border-white/[0.06] pt-5">
                  <p className="mb-3.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                    Your operation
                  </p>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-text-secondary">
                        Head count <span className="text-brand/80">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {HERD_SIZE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateField('herd_size', opt.value)}
                            className={pillClass(form.herd_size === opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-text-secondary">
                        Properties <span className="text-brand/80">*</span>
                      </label>
                      <div className="flex gap-2">
                        {PROPERTY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateField('property_count', opt.value)}
                            className={pillClass(form.property_count === opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Advisor details ── */}
          <AnimatePresence>
            {form.role === 'advisor' && (
              <motion.div {...reveal} className="overflow-hidden">
                <div className="border-t border-white/[0.06] pt-5">
                  <p className="mb-3.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                    Your practice
                  </p>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-secondary">
                      Clients managed <span className="text-brand/80">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CLIENT_COUNT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateField('client_count', opt.value)}
                          className={pillClass(form.client_count === opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Features ── */}
          <AnimatePresence>
            {hasRole && hasDetails && (
              <motion.div {...reveal} className="overflow-hidden">
                <div className="border-t border-white/[0.06] pt-5">
                  <p className="mb-3.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                    Features you&apos;re interested in
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={toggleAllFeatures}
                      className={chipClass(allFeaturesSelected)}
                    >
                      {allFeaturesSelected && <Check className="h-3 w-3" />}
                      All
                    </button>
                    {FEATURE_OPTIONS[form.role as Role].map((opt) => {
                      const selected = form.interested_features.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleFeature(opt.value)}
                          className={chipClass(selected)}
                        >
                          {selected && <Check className="h-3 w-3" />}
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Subscription tier ── */}
          <AnimatePresence>
            {hasRole && hasDetails && hasFeatures && (
              <motion.div {...reveal} className="overflow-hidden">
                <div className="border-t border-white/[0.06] pt-5">
                  <p className="mb-3.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                    Preferred plan
                  </p>
                  <div className={`grid gap-2 ${form.role === 'producer' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                    {TIER_OPTIONS[form.role as Role].map((opt) => {
                      const selected = form.preferred_tier === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateField('preferred_tier', opt.value)}
                          className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 cursor-pointer ${
                            selected
                              ? 'border-brand/40 bg-brand/[0.08]'
                              : 'border-white/[0.08] hover:border-white/15 hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                            selected
                              ? 'border-brand bg-brand'
                              : 'border-white/20'
                          }`}>
                            {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <span className={`text-sm font-medium ${selected ? 'text-white' : 'text-text-secondary'}`}>
                              {opt.label}
                            </span>
                            <span className={`block text-[11px] ${selected ? 'text-text-secondary' : 'text-text-muted'}`}>
                              {opt.subtitle}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Footer (only after features revealed) ── */}
          <AnimatePresence>
            {hasRole && hasDetails && (
              <motion.div {...reveal} className="overflow-hidden">
                <div className="border-t border-white/[0.06] pt-5">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.contact_opt_in}
                      onChange={(e) => updateField('contact_opt_in', e.target.checked)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-transparent accent-brand"
                    />
                    <span className="text-sm text-text-muted group-hover:text-text-secondary transition-colors">
                      Keep me updated with product news and launch updates
                    </span>
                  </label>

                  {status === 'error' && (
                    <p className="mt-3 text-xs text-red-400">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={!isValid || status === 'submitting'}
                    className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    {status === 'submitting' ? (
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      'Join Waitlist'
                    )}
                  </button>

                  <AnimatePresence>
                    {!isValid && missingHint && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-2.5 text-center text-xs text-text-muted"
                      >
                        {missingHint}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </Modal>
  )
}
