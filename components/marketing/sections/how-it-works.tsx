import { HOW_IT_WORKS_STEPS } from '@/lib/marketing/constants'
import SectionHeading from '@/components/marketing/ui/section-heading'
import FadeInOnScroll from '@/components/marketing/animations/fade-in-on-scroll'

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-bg-deep py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How It Works"
          title="From paddock to portfolio in three steps"
          subtitle="Getting started takes minutes, not hours. Add your herds and let real MLA market data do the rest."
        />

        <div className="relative grid gap-8 md:grid-cols-3 md:gap-12">
          {/* Connecting line (desktop) */}
          <div className="absolute top-16 hidden h-0.5 bg-gradient-to-r from-brand/0 via-brand/30 to-brand/0 md:left-[16%] md:right-[16%] md:block" />

          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <FadeInOnScroll key={step.number} delay={index * 0.15}>
              <div className="relative text-center">
                {/* Number */}
                <div className="relative z-10 mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-xl font-bold text-white shadow-lg shadow-brand/20">
                  {step.number}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{step.description}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>

        {/* Valuation formula */}
        <FadeInOnScroll delay={0.5}>
          <div className="mt-16 rounded-[16px] border border-white/5 bg-bg-card-1 p-6 text-center md:p-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand">
              Valuation Engine
            </p>
            <p className="text-lg font-semibold text-white md:text-xl">
              Net Realisable Value = Physical Value + Breeding Accrual - Mortality Deduction
            </p>
            <p className="mt-3 text-sm text-text-secondary">
              Prices sourced from real MLA saleyard data, updated daily. Weight projections based on your daily weight gain rates. Breeding value accrued over the pregnancy cycle.
            </p>
          </div>
        </FadeInOnScroll>
      </div>
    </section>
  )
}
