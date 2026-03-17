'use client'

import { useState } from 'react'

interface EmailFormProps {
  size?: 'default' | 'large'
  className?: string
}

export default function EmailForm({ size = 'default', className }: EmailFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return

    setStatus('submitting')
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className={`flex items-center gap-2 rounded-[16px] bg-success/20 px-6 py-4 ${className ?? ''}`}>
        <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-sm font-medium text-white">You&apos;re on the list! We&apos;ll be in touch.</p>
      </div>
    )
  }

  const inputHeight = size === 'large' ? 'h-14' : 'h-[52px]'
  const buttonHeight = size === 'large' ? 'h-12' : 'h-10'

  return (
    <form onSubmit={handleSubmit} className={`relative flex w-full max-w-md gap-2 ${className ?? ''}`}>
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
        placeholder="Enter your email"
        className={`${inputHeight} flex-1 rounded-[16px] border border-white/10 bg-bg-card-1 px-4 text-sm text-white placeholder:text-text-tertiary outline-none transition-colors focus:border-brand`}
        required
      />
      <button
        type="submit"
        disabled={status === 'submitting'}
        className={`${buttonHeight} self-center whitespace-nowrap rounded-[16px] bg-brand px-5 text-sm font-semibold text-white transition-all duration-150 hover:bg-brand-light active:scale-[0.97] disabled:opacity-50 cursor-pointer`}
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
      {status === 'error' && (
        <p className="absolute -bottom-6 left-0 text-xs text-error">Something went wrong. Please try again.</p>
      )}
    </form>
  )
}
