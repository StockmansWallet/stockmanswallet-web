'use client'

import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Modal } from '@/components/ui/modal'
import { ADVISOR_ENABLED } from '@/lib/feature-flags'

type Role = 'producer' | 'advisor'
type HerdSize = 'under_50' | '50_500' | '500_2000' | '2000_plus'
type PropertyCount = '1' | '2_3' | '4_plus'
type ClientCount = 'under_15' | '15_100' | '100_plus'

interface WaitlistFormData {
  name: string
  email: string
  role: Role | ''
  postcode: string
  herd_size: HerdSize | ''
  property_count: PropertyCount | ''
  client_count: ClientCount | ''
  interested_features: string[]
  contact_opt_in: boolean
}

const ALL_ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'producer', label: 'Producer' },
  { value: 'advisor', label: 'Advisor' },
]

const ROLE_OPTIONS = ADVISOR_ENABLED
  ? ALL_ROLE_OPTIONS
  : ALL_ROLE_OPTIONS.filter((o) => o.value !== 'advisor')

const HERD_SIZE_OPTIONS: { value: HerdSize; label: string }[] = [
  { value: 'under_50', label: 'Under 50' },
  { value: '50_500', label: '50\u2013500' },
  { value: '500_2000', label: '500\u20132,000' },
  { value: '2000_plus', label: '2,000+' },
]

const PROPERTY_OPTIONS: { value: PropertyCount; label: string }[] = [
  { value: '1', label: '1' },
  { value: '2_3', label: '2\u20133' },
  { value: '4_plus', label: '4+' },
]

const CLIENT_COUNT_OPTIONS: { value: ClientCount; label: string }[] = [
  { value: 'under_15', label: 'Up to 15' },
  { value: '15_100', label: '15\u2013100' },
  { value: '100_plus', label: '100+' },
]

const FEATURE_OPTIONS: Record<Role, { value: string; label: string }[]> = {
  producer: [
    { value: 'herd_valuation', label: 'Herd Valuation' },
    { value: 'brangus', label: 'Brangus AI' },
    { value: 'reports', label: 'Reports' },
    { value: 'yard_book', label: 'Yard Book' },
    { value: 'freight_iq', label: 'Freight IQ' },
    { value: 'grid_iq', label: 'Grid IQ' },
    { value: 'insights', label: 'Insights' },
    { value: 'ch40', label: 'Ch 40' },
    ...(ADVISOR_ENABLED ? [{ value: 'advisory_hub', label: 'Advisory Hub' }] : []),
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

const STEPS = [
  {
    title: 'Contact',
    eyebrow: 'Step 1',
    description: 'Tell us where to send early access details.',
  },
  {
    title: 'Operation',
    eyebrow: 'Step 2',
    description: 'A little context helps us prioritise the right launch cohorts.',
  },
  {
    title: 'Interests',
    eyebrow: 'Step 3',
    description: 'Choose the tools you care about most.',
  },
] as const

const INITIAL_FORM: WaitlistFormData = {
  name: '',
  email: '',
  role: ROLE_OPTIONS.length === 1 ? ROLE_OPTIONS[0].value : '',
  postcode: '',
  herd_size: '',
  property_count: '',
  client_count: '',
  interested_features: [],
  contact_opt_in: false,
}

interface WaitlistModalProps {
  open: boolean
  onClose: () => void
}

export function WaitlistModal({ open, onClose }: WaitlistModalProps) {
  const [form, setForm] = useState<WaitlistFormData>({ ...INITIAL_FORM })
  const [step, setStep] = useState(0)
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
    const allValues = FEATURE_OPTIONS[form.role].map((f) => f.value)
    setForm((prev) => ({
      ...prev,
      interested_features: prev.interested_features.length === allValues.length ? [] : allValues,
    }))
    if (status === 'error') setStatus('idle')
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
  const showEmailHint = emailBlurred && form.email.length > 0 && !emailValid
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

  const contactValid =
    form.name.trim() !== '' && emailValid && form.role !== '' && form.postcode.trim() !== ''
  const isValid = contactValid && hasDetails && hasFeatures
  const canGoNext = step === 0 ? contactValid : step === 1 ? hasDetails : isValid

  const missingHint = (() => {
    if (step === 0) {
      if (!form.name.trim()) return 'Enter your name'
      if (!emailValid) return 'Enter a valid email address'
      if (!form.role) return 'Choose your role'
      if (!form.postcode.trim()) return 'Enter your postcode'
    }
    if (step === 1 && !hasDetails) {
      return form.role === 'producer' ? 'Select herd size and properties' : 'Select client count'
    }
    if (step === 2 && !hasFeatures) return 'Select at least one feature'
    return null
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || step !== STEPS.length - 1) return

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
      setStep(0)
      setStatus('idle')
      setErrorMsg('')
      setEmailBlurred(false)
    }, 350)
  }

  function goBack() {
    setStep((prev) => Math.max(0, prev - 1))
  }

  function goNext() {
    if (!canGoNext) {
      setEmailBlurred(true)
      return
    }
    setStep((prev) => Math.min(STEPS.length - 1, prev + 1))
  }

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

  if (status === 'success') {
    return (
      <Modal open={open} onClose={handleClose} size="sm" ariaLabel="Waitlist signup confirmed">
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <Check className="h-7 w-7 text-success" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-white">You&apos;re on the list!</h3>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-text-secondary">
            We&apos;ll be in touch before the app launches with early access details and exclusive
            founding member pricing.
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

  const activeStep = STEPS[step]

  return (
    <Modal open={open} onClose={handleClose} size="xl" ariaLabel="Join the waitlist">
      <button
        onClick={handleClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/[0.08] hover:text-text-primary"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="-mx-6 -my-6 grid max-h-[84vh] overflow-hidden rounded-3xl md:grid-cols-[0.84fr_1.16fr]">
        <aside className="flex flex-col justify-between border-b border-white/[0.06] bg-white/[0.035] p-6 md:border-r md:border-b-0 md:p-8">
          <div>
            <p className="text-xs font-semibold tracking-wider text-brand uppercase">
              Early Access
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Join the Waitlist
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              The landing page is live now. The app launches June 2026 on the App Store, with
              early access opened in waves.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {STEPS.map((item, index) => {
              const selected = step === index
              const complete =
                index === 0 ? contactValid : index === 1 ? hasDetails : hasFeatures

              return (
                <div
                  key={item.title}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    selected
                      ? 'border-brand/35 bg-brand/10'
                      : complete
                        ? 'border-success/20 bg-success/5'
                        : 'border-white/[0.06] bg-white/[0.025]'
                  }`}
                  aria-current={selected ? 'step' : undefined}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      complete
                        ? 'bg-success/15 text-success'
                        : selected
                          ? 'bg-brand text-white'
                          : 'bg-white/[0.06] text-text-muted'
                    }`}
                  >
                    {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-text-muted">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="flex min-h-[520px] flex-col">
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <p className="text-xs font-semibold tracking-wider text-brand uppercase">
              {activeStep.eyebrow}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">{activeStep.title}</h3>
            <p className="mt-1 text-sm text-text-secondary">{activeStep.description}</p>

            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="mt-7 space-y-5"
                >
                  {ROLE_OPTIONS.length > 1 ? (
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
                            aria-pressed={form.role === opt.value}
                            className={`flex-1 cursor-pointer rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
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
                  ) : null}

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
                        className={`${inputClass} ${showEmailHint ? 'border-error/50' : ''}`}
                      />
                      <AnimatePresence>
                        {showEmailHint && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="mt-1.5 text-xs text-error/80"
                          >
                            Please enter a valid email address
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

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
                      className={`${inputClass} sm:max-w-[150px]`}
                    />
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="operation"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="mt-7 space-y-6"
                >
                  {form.role === 'producer' ? (
                    <>
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
                              aria-pressed={form.herd_size === opt.value}
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
                        <div className="flex flex-wrap gap-2">
                          {PROPERTY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => updateField('property_count', opt.value)}
                              aria-pressed={form.property_count === opt.value}
                              className={pillClass(form.property_count === opt.value)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
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
                            aria-pressed={form.client_count === opt.value}
                            className={pillClass(form.client_count === opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 2 && hasRole && (
                <motion.div
                  key="interests"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="mt-7 space-y-6"
                >
                  <div>
                    <p className="mb-3 text-sm font-medium text-text-secondary">
                      Features you&apos;re interested in <span className="text-brand/80">*</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={toggleAllFeatures}
                        aria-pressed={allFeaturesSelected}
                        className={chipClass(allFeaturesSelected)}
                      >
                        {allFeaturesSelected && <Check className="h-3 w-3" aria-hidden="true" />}
                        All
                      </button>
                      {FEATURE_OPTIONS[form.role as Role].map((opt) => {
                        const selected = form.interested_features.includes(opt.value)
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleFeature(opt.value)}
                            aria-pressed={selected}
                            className={chipClass(selected)}
                          >
                            {selected && <Check className="h-3 w-3" aria-hidden="true" />}
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <label className="group flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                    <input
                      type="checkbox"
                      checked={form.contact_opt_in}
                      onChange={(e) => updateField('contact_opt_in', e.target.checked)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-transparent accent-brand"
                    />
                    <span className="text-sm text-text-muted transition-colors group-hover:text-text-secondary">
                      Keep me updated with product news and launch updates
                    </span>
                  </label>

                  {status === 'error' && <p className="text-xs text-error">{errorMsg}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="border-t border-white/[0.06] p-4 md:px-8">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0 || status === 'submitting'}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] px-4 text-sm font-semibold text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-white disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>

              <AnimatePresence mode="wait">
                {missingHint ? (
                  <motion.p
                    key={missingHint}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hidden text-center text-xs text-text-muted sm:block"
                  >
                    {missingHint}
                  </motion.p>
                ) : (
                  <motion.p
                    key="ready"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hidden text-center text-xs text-success sm:block"
                  >
                    Looks good
                  </motion.p>
                )}
              </AnimatePresence>

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext || status === 'submitting'}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-light disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isValid || status === 'submitting'}
                  className="inline-flex h-11 min-w-32 cursor-pointer items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-light disabled:pointer-events-none disabled:opacity-40"
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
              )}
            </div>
            {missingHint && (
              <p className="mt-2 text-center text-xs text-text-muted sm:hidden">{missingHint}</p>
            )}
          </div>
        </form>
      </div>
    </Modal>
  )
}
