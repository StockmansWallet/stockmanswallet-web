import SectionHeading from '@/components/marketing/ui/section-heading'
import LandingCard from '@/components/marketing/ui/landing-card'
import LandingButton from '@/components/marketing/ui/landing-button'
import FadeInOnScroll from '@/components/marketing/animations/fade-in-on-scroll'
import StaggerChildren, { StaggerItem } from '@/components/marketing/animations/stagger-children'

const advisorFeatures = [
  {
    title: 'Advisor Lens',
    description: 'Apply private valuation overlays with breed premium adjustments, daily weight gain overrides, calving assumptions, and a 0-100% shading slider.',
    color: '#B0657A',
    icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  },
  {
    title: 'Client Management',
    description: 'Connect with producer clients via time-limited 3-day access windows. View their portfolio data read-only with permission status tracking.',
    color: '#B0657A',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    title: 'Simulator Sandbox',
    description: 'Clone client data and test what-if scenarios without touching live data. Compare optimistic, base, and conservative outcomes side by side.',
    color: '#B0657A',
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  },
  {
    title: 'Professional Reports',
    description: 'Generate Lens-adjusted valuation summaries with decision notes, scenario comparisons, and all standard reports branded for your practice.',
    color: '#B0657A',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
]

export default function ForAdvisors() {
  return (
    <section id="advisors" className="bg-bg-card-1 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="For Advisors"
          title="Purpose-built for rural advisors"
          subtitle="Bankers, agents, accountants, and insurers get their own workspace with professional tools for client livestock valuation."
        />

        <StaggerChildren className="grid gap-6 sm:grid-cols-2">
          {advisorFeatures.map((feature) => (
            <StaggerItem key={feature.title}>
              <LandingCard level={2} className="h-full">
                <div className="flex gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={feature.color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d={feature.icon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{feature.description}</p>
                  </div>
                </div>
              </LandingCard>
            </StaggerItem>
          ))}
        </StaggerChildren>

        <FadeInOnScroll delay={0.4}>
          <div className="mt-10 text-center">
            <LandingButton href="#pricing" variant="secondary">
              View Advisor Plans
            </LandingButton>
          </div>
        </FadeInOnScroll>
      </div>
    </section>
  )
}
