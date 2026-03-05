import { FEATURES } from '@/lib/marketing/constants'
import SectionHeading from '@/components/marketing/ui/section-heading'
import FeatureCard from '@/components/marketing/ui/feature-card'
import StaggerChildren, { StaggerItem } from '@/components/marketing/animations/stagger-children'

export default function Features() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to manage livestock as a portfolio"
          subtitle="From real-time valuations to AI-powered insights, Stockman's Wallet gives you the capital intelligence to make better decisions."
        />

        <StaggerChildren className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <StaggerItem key={feature.id}>
              <FeatureCard feature={feature} />
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  )
}
