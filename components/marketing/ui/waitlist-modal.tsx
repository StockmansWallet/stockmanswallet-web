'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

type Role = 'producer' | 'advisor' | 'other'
type HerdSize = 'under_50' | '50_500' | '500_2000' | '2000_plus'
type PropertyCount = '1' | '2_plus'
type Feature = 'brangus' | 'freight_iq' | 'herd_valuation' | 'reports' | 'advisory_hub' | 'yard_book' | 'grid_iq' | 'producer_network'

interface WaitlistFormData {
  name: string
  email: string
  role: Role | ''
  postcode: string
  herd_size: HerdSize | ''
  property_count: PropertyCount | ''
  interested_features: Feature[]
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'producer', label: 'Producer' },
  { value: 'advisor', label: 'Advisor' },
  { value: 'other', label: 'Other' },
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

const FEATURE_OPTIONS: { value: Feature; label: string }[] = [
  { value: 'brangus', label: 'Brangus AI' },
  { value: 'herd_valuation', label: 'Herd Valuation' },
  { value: 'reports', label: 'Reports' },
  { value: 'advisory_hub', label: 'Advisory Hub' },
  { value: 'yard_book', label: 'Yard Book' },
  { value: 'freight_iq', label: 'Freight IQ' },
  { value: 'grid_iq', label: 'Grid IQ' },
  { value: 'producer_network', label: 'Producer Network' },
]

interface WaitlistModalProps {
  open: boolean
  onClose: () => void
}

export function WaitlistModal({ open, onClose }: WaitlistModalProps) {
  const [form, setForm] = useState<WaitlistFormData>({
    name: '',
    email: '',
    role: '',
    postcode: '',
    herd_size: '',
    property_count: '',
    interested_features: [],
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function updateField<K extends keyof WaitlistFormData>(key: K, value: WaitlistFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (status === 'error') setStatus('idle')
  }

  function toggleFeature(feature: Feature) {
    setForm((prev) => ({
      ...prev,
      interested_features: prev.interested_features.includes(feature)
        ? prev.interested_features.filter((f) => f !== feature)
        : [...prev.interested_features, feature],
    }))
    if (status === 'error') setStatus('idle')
  }

  const isValid =
    form.name.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.role !== '' &&
    form.postcode.trim() !== '' &&
    form.herd_size !== '' &&
    form.property_count !== ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.toLowerCase().trim(),
          role: form.role,
          postcode: form.postcode.trim(),
          herd_size: form.herd_size,
          property_count: form.property_count,
          interested_features: form.interested_features,
        }),
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
    // Reset after exit animation completes
    setTimeout(() => {
      setForm({ name: '', email: '', role: '', postcode: '', herd_size: '', property_count: '', interested_features: [] })
      setStatus('idle')
      setErrorMsg('')
    }, 350)
  }

  if (status === 'success') {
    return (
      <Modal open={open} onClose={handleClose} size="sm">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">You&apos;re on the list!</h3>
          <p className="mt-2 text-sm text-text-secondary">
            We&apos;ll be in touch before launch with early access details and exclusive founding member pricing.
          </p>
          <button
            onClick={handleClose}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-[16px] bg-brand px-5 text-sm font-semibold text-white transition-all duration-150 hover:bg-brand-light active:scale-[0.97] cursor-pointer"
          >
            Done
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} size="lg">
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">
          Join the{' '}
          <span className="bg-gradient-to-r from-brand via-brand-light to-brand bg-clip-text text-transparent">
            Waitlist
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base text-text-secondary">
          Be the first to know when we launch.
          <br />
          Founding members get early access and exclusive pricing.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Row 1: Name + Email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wl-name" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Name
            </label>
            <input
              id="wl-name"
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Your name"
              required
              className="w-full rounded-xl bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-surface-raised"
            />
          </div>
          <div>
            <label htmlFor="wl-email" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Email
            </label>
            <input
              id="wl-email"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-xl bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-surface-raised"
            />
          </div>
        </div>

        {/* Row 2: Role + Postcode side-by-side */}
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-secondary">Which best describes you?</legend>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('role', opt.value)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                    form.role === opt.value
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="wl-postcode" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Postcode
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
              className="w-full max-w-[160px] rounded-xl bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-surface-raised"
            />
          </div>
        </div>

        {/* Row 3: Herd size + Properties side-by-side */}
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-secondary">
              How many cattle do you manage?
            </legend>
            <div className="flex flex-wrap gap-2">
              {HERD_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('herd_size', opt.value)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                    form.herd_size === opt.value
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-secondary">
              How many properties?
            </legend>
            <div className="flex gap-2">
              {PROPERTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('property_count', opt.value)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                    form.property_count === opt.value
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Row 4: Interested features (multi-select, full width) */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text-secondary">
            What features interest you most?
          </legend>
          <div className="flex flex-wrap gap-2">
            {FEATURE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleFeature(opt.value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                  form.interested_features.includes(opt.value)
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Error */}
        {status === 'error' && (
          <p className="text-xs text-error">{errorMsg}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || status === 'submitting'}
          className="mt-1 inline-flex h-12 w-full items-center justify-center rounded-[16px] bg-brand text-sm font-semibold text-white transition-all duration-150 hover:bg-brand-light active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
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
      </form>
    </Modal>
  )
}
