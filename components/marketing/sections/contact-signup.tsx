import EmailForm from '@/components/marketing/ui/email-form'
import FadeInOnScroll from '@/components/marketing/animations/fade-in-on-scroll'

export default function ContactSignup() {
  return (
    <section id="signup" className="relative overflow-hidden py-20 lg:py-28">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(217,118,47,0.08)_0%,_transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <FadeInOnScroll>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand">
              Get Early Access
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Your herds are assets.{' '}
              <span className="text-brand">Manage them like it.</span>
            </h2>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.15}>
            <p className="mt-4 text-lg text-text-secondary">
              Join the waitlist and be the first to know when Stockman&apos;s Wallet launches on the App Store.
            </p>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.3}>
            <div className="mt-8 flex justify-center">
              <EmailForm size="large" />
            </div>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.4}>
            <p className="mt-6 text-sm text-text-tertiary">
              Currently in beta with 18+ testers on TestFlight. Launching soon.
            </p>
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.5}>
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-sm text-text-secondary">Have questions?</p>
              <a
                href="mailto:support@stockmanswallet.com.au"
                className="text-sm font-medium text-brand transition-colors hover:text-brand-light"
              >
                support@stockmanswallet.com.au
              </a>
            </div>
          </FadeInOnScroll>
        </div>
      </div>
    </section>
  )
}
