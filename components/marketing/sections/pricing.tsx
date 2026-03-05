import { PRICING_TIERS } from '@/lib/marketing/constants'
import SectionHeading from '@/components/marketing/ui/section-heading'
import PricingCard from '@/components/marketing/ui/pricing-card'
import StaggerChildren, { StaggerItem } from '@/components/marketing/animations/stagger-children'
import FadeInOnScroll from '@/components/marketing/animations/fade-in-on-scroll'

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple, transparent pricing"
          subtitle="30-day free trial on all plans. No payment required to start. Full Head Stockman features during your trial."
        />

        <StaggerChildren className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_TIERS.map((tier) => (
            <StaggerItem key={tier.id}>
              <PricingCard tier={tier} />
            </StaggerItem>
          ))}
        </StaggerChildren>

        {/* Usage top-ups note */}
        <FadeInOnScroll delay={0.5}>
          <div className="mt-12 text-center">
            <p className="text-sm text-text-secondary">
              Need more AI queries or freight calculations? Purchase top-up packs anytime. They never expire.
            </p>
          </div>
        </FadeInOnScroll>
      </div>
    </section>
  )
}
