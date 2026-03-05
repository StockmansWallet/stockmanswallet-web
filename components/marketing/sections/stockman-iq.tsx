import SectionHeading from '@/components/marketing/ui/section-heading'
import FadeInOnScroll from '@/components/marketing/animations/fade-in-on-scroll'
import LandingButton from '@/components/marketing/ui/landing-button'
import LandingCard from '@/components/marketing/ui/landing-card'

export default function StockmanIQ() {
  return (
    <section id="stockman-iq" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Text Content */}
          <div className="flex flex-col justify-center">
            <FadeInOnScroll>
              <SectionHeading
                eyebrow="Stockman IQ"
                title="Meet Brangus, your AI livestock advisor"
                subtitle="Ask when to sell, where to sell, and what you'll net after freight."
                centered={false}
              />
            </FadeInOnScroll>

            <FadeInOnScroll delay={0.15}>
              <ul className="space-y-4">
                {[
                  { title: 'Natural language questions', desc: 'Ask about your herds, market trends, freight costs, and farm operations in plain English.' },
                  { title: 'Voice input and output', desc: 'Hands-free mode with ElevenLabs natural voice. Perfect for when you are out in the paddock.' },
                  { title: 'Portfolio-aware responses', desc: 'Brangus references your actual herd data, properties, sales history, and upcoming events.' },
                  { title: 'Action from conversation', desc: 'Create Yard Book events, calculate freight, and manage tasks directly from chat.' },
                ].map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20">
                      <svg className="h-3 w-3 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-sm text-text-secondary">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </FadeInOnScroll>

            <FadeInOnScroll delay={0.3}>
              <div className="mt-8">
                <LandingButton href="#signup">Get Early Access</LandingButton>
              </div>
            </FadeInOnScroll>
          </div>

          {/* Chat Mockup + Insight Cards */}
          <FadeInOnScroll direction="left" delay={0.2} className="flex flex-col gap-6">
            {/* Chat Interface Mockup */}
            <LandingCard className="glass overflow-hidden">
              <div className="mb-4 flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand">
                  <span className="text-xs font-bold text-white">B</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Brangus</p>
                  <p className="text-xs text-text-tertiary">AI Livestock Advisor</p>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-[16px] rounded-br-[4px] bg-brand px-4 py-3">
                    <p className="text-sm text-white">When should I sell my Brahman steers?</p>
                  </div>
                </div>

                {/* Bot response */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-[16px] rounded-bl-[4px] bg-bg-card-2 px-4 py-3">
                    <p className="text-sm leading-relaxed text-text-secondary">
                      Based on your 100 Brahman steers at 350 kg gaining 0.8 kg/day, and 5-year MLA price trends for Roma, <span className="font-medium text-brand-light">October looks like your strongest sale window</span>. At projected weight of 422 kg and current trends, you are looking at approximately <span className="font-medium text-brand-light">$147,700 gross value</span>.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      Freight to Roma from your property would cost approximately $1,240 (2 decks), netting you around <span className="font-medium text-brand-light">$146,460 after transport</span>.
                    </p>
                  </div>
                </div>
              </div>
            </LandingCard>

            {/* Insight Cards */}
            <div className="grid grid-cols-2 gap-3">
              <LandingCard level={2} className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">Best Sale Month</p>
                <p className="mt-2 text-2xl font-bold text-white">October</p>
                <p className="mt-1 text-xs text-text-tertiary">Based on 5-year trends</p>
              </LandingCard>
              <LandingCard level={2} className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-success">Sell vs Hold</p>
                <p className="mt-2 text-2xl font-bold text-white">+$12,400</p>
                <p className="mt-1 text-xs text-text-tertiary">If held 60 more days</p>
              </LandingCard>
            </div>
          </FadeInOnScroll>
        </div>
      </div>
    </section>
  )
}
