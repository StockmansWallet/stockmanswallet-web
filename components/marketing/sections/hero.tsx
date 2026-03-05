import Image from 'next/image'
import FadeInOnScroll from '@/components/marketing/animations/fade-in-on-scroll'
import EmailForm from '@/components/marketing/ui/email-form'

export default function Hero() {
  return (
    <section id="hero" className="relative flex min-h-screen items-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand/5 via-bg-primary to-bg-primary" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(217,118,47,0.08)_0%,_transparent_60%)]" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-32">
        {/* Text Content */}
        <div className="flex flex-col justify-center">
          <FadeInOnScroll>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand">
              Australian AgTech
            </p>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.1}>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Know what your cattle are worth.{' '}
              <span className="text-brand">Every day.</span>
            </h1>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.2}>
            <p className="mt-4 text-lg text-brand-light font-medium">
              Intelligent Livestock Valuation
            </p>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.3}>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-text-secondary">
              Real MLA market data. Real-time herd valuations. Zero guesswork. Capital timing intelligence for Australian livestock producers and rural advisors.
            </p>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.4}>
            <div className="mt-8">
              <EmailForm />
            </div>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.5}>
            <div className="mt-6 flex items-center gap-4">
              <Image
                src="/images/download-on-app-store.svg"
                alt="Download on the App Store"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
              <p className="text-xs text-text-tertiary">iPhone (iOS 18.0+)</p>
            </div>
          </FadeInOnScroll>
        </div>

        {/* App Mockup */}
        <FadeInOnScroll direction="left" delay={0.3} className="flex items-center justify-center">
          <div className="relative">
            {/* Phone — clean frameless mockup */}
            <div className="relative mx-auto w-[280px] sm:w-[300px]">
              <Image
                src="/images/mockup-dashboard.png"
                alt="Stockman's Wallet app dashboard showing livestock portfolio valuation"
                width={390}
                height={844}
                className="w-full drop-shadow-[0_20px_60px_rgba(217,118,47,0.15)]"
                priority
              />
            </div>

            {/* Floating Portfolio Value Card */}
            <div className="absolute -left-36 top-8 hidden w-56 rounded-[20px] border border-white/[0.08] bg-[rgba(39,31,22,0.7)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:block">
              <p className="text-xs text-text-tertiary">Portfolio Value</p>
              <p className="mt-1 text-3xl font-bold text-white">$1.52M</p>
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5">
                <svg className="h-3 w-3 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l5-5 3 3 4-4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11h4v4" />
                </svg>
                <span className="text-xs font-semibold text-success">+6,319%</span>
              </div>
            </div>

            {/* Floating Chart Card */}
            <div className="absolute -right-32 bottom-24 hidden w-60 rounded-[20px] border border-white/[0.08] bg-[rgba(39,31,22,0.7)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:block">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-text-secondary">Performance</p>
                <p className="text-xs text-brand">All Time</p>
              </div>
              <svg viewBox="0 0 200 80" className="w-full" fill="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D9762F" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#D9762F" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 70 L10 68 L25 65 L40 60 L55 55 L65 48 L75 45 L85 40 L95 38 L105 32 L115 28 L125 25 L135 22 L145 18 L155 15 L165 14 L175 12 L185 10 L200 8 L200 80 L0 80 Z"
                  fill="url(#chartGradient)"
                />
                <path
                  d="M0 70 L10 68 L25 65 L40 60 L55 55 L65 48 L75 45 L85 40 L95 38 L105 32 L115 28 L125 25 L135 22 L145 18 L155 15 L165 14 L175 12 L185 10 L200 8"
                  stroke="#D9762F"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="200" cy="8" r="3" fill="#D9762F" />
              </svg>
              <div className="mt-3 flex gap-1">
                {['1D', '7D', '1M', '3M', '6M', 'All'].map((range) => (
                  <span
                    key={range}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      range === 'All'
                        ? 'bg-brand/20 text-brand'
                        : 'text-text-tertiary'
                    }`}
                  >
                    {range}
                  </span>
                ))}
              </div>
            </div>

            {/* Glow effect */}
            <div className="absolute -inset-10 -z-10 rounded-full bg-brand/10 blur-3xl" />
          </div>
        </FadeInOnScroll>
      </div>
    </section>
  )
}
