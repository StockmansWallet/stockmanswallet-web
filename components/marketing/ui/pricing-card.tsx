import type { PricingTier } from '@/lib/marketing/types'
import { clsx } from 'clsx'
import LandingButton from './landing-button'

interface PricingCardProps {
  tier: PricingTier
}

export default function PricingCard({ tier }: PricingCardProps) {
  return (
    <div
      className={clsx(
        'relative flex flex-col rounded-[16px] border p-6 sm:p-7',
        tier.highlighted
          ? 'border-brand bg-bg-card-1 shadow-[0_0_40px_rgba(217,118,47,0.15)]'
          : 'border-white/5 bg-bg-card-1'
      )}
    >
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-4 py-1 text-xs font-semibold text-white">
          {tier.badge}
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
        <p className="mt-1 text-sm text-text-secondary">{tier.subtitle}</p>
      </div>
      <div className="mb-6">
        {tier.price !== null ? (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">${tier.price}</span>
            <span className="text-text-secondary">/month</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-brand">Coming Soon</span>
          </div>
        )}
        <p className="mt-2 text-sm text-text-tertiary">{tier.description}</p>
      </div>
      <ul className="mb-8 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature.name} className="flex items-start gap-2.5 text-sm">
            {feature.included ? (
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-text-quaternary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={feature.included ? 'text-text-secondary' : 'text-text-quaternary'}>
              {feature.name}
            </span>
          </li>
        ))}
      </ul>
      <LandingButton
        variant={tier.highlighted ? 'primary' : 'secondary'}
        href="#signup"
        className="w-full"
      >
        Join Waitlist
      </LandingButton>
      <p className="mt-3 text-center text-xs text-text-tertiary">30-day free trial</p>
    </div>
  )
}
