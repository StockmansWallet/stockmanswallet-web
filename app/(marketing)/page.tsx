import Image from "next/image";
import { CheckIcon } from "./icons";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 lg:pb-32 lg:pt-28">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-gradient-to-b from-brand/15 to-transparent blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Text */}
            <div>
              <div className="mb-8 flex h-20 w-20 items-center justify-center">
                <Image
                  src="/images/app-icon.png"
                  alt="Stockman's Wallet"
                  width={80}
                  height={80}
                  className="rounded-[18px] shadow-xl"
                  priority
                />
              </div>

              <h1 className="text-5xl font-semibold tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
                Your herds are
                <br />
                <span className="bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">
                  financial assets
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary sm:text-xl">
                Real-time livestock valuations powered by MLA market data.
                Built for Australian producers and advisors.
              </p>

              {/* Waitlist */}
              <div className="mt-10">
                <WaitlistForm />
                <p className="mt-3 text-xs text-text-muted">
                  Be the first to know when we launch. No spam, ever.
                </p>
              </div>
            </div>

            {/* Device mockup */}
            <div className="relative flex justify-center">
              <div className="w-full max-w-xs">
                <Image
                  src="/images/mockup-dashboard.png"
                  alt="Stockman's Wallet Dashboard showing portfolio value"
                  width={390}
                  height={844}
                  className="w-full drop-shadow-2xl"
                  priority
                />
              </div>
              {/* Reflection/glow under device */}
              <div className="absolute -bottom-8 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full bg-brand/20 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-black/5 px-6 py-10 dark:border-white/10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center md:grid-cols-4">
          <div>
            <p className="text-3xl font-semibold text-text-primary">Real-time</p>
            <p className="mt-1 text-sm text-text-muted">MLA Market Data</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-text-primary">50+</p>
            <p className="mt-1 text-sm text-text-muted">Cattle Breeds</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-text-primary">AI</p>
            <p className="mt-1 text-sm text-text-muted">Stockman IQ Advisor</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-text-primary">AUD</p>
            <p className="mt-1 text-sm text-text-muted">Australian Focused</p>
          </div>
        </div>
      </section>

      {/* Feature: Valuations */}
      <section className="relative overflow-hidden bg-[#1F1B18] px-6 py-28 lg:py-36">
        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand">
                Portfolio Valuation
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                Know what your
                <br />
                herds are worth.
                <br />
                <span className="text-white/40">Right now.</span>
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
                Live pricing from MLA NLRS data flows directly into your portfolio.
                Track total value, unrealised gains, and performance over time
                with interactive charts.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Daily MLA market-linked pricing",
                  "Portfolio breakdown by species, breed and category",
                  "Performance chart with time-range scrubbing",
                  "Unrealised gains/losses and ROI tracking",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                    <CheckIcon />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative flex justify-center lg:justify-end lg:-mb-36">
              <div className="w-full max-w-sm lg:max-w-md">
                <Image
                  src="/images/mockup-herds.png"
                  alt="Herd composition breakdown showing breed valuations"
                  width={390}
                  height={844}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature: Stockman IQ */}
      <section className="bg-bg-alt px-6 py-28 lg:py-36">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="flex items-center justify-center lg:order-first">
              <div className="w-full max-w-xs">
                <Image
                  src="/images/mockup-stockmaniq.png"
                  alt="Stockman IQ AI chat with Brangus advisor"
                  width={390}
                  height={844}
                  className="w-full drop-shadow-2xl"
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand">
                Stockman IQ
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary lg:text-5xl">
                Meet Brangus.
                <br />
                <span className="text-text-muted">Your AI advisor.</span>
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-text-secondary">
                Ask Brangus about market conditions, get insights on your herds,
                or create yard book events with natural voice commands. It knows
                your portfolio inside out.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Portfolio-aware AI responses",
                  "Natural voice input and ElevenLabs voice output",
                  "Yard Book event creation via conversation",
                  "Chat history with searchable conversations",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-text-secondary">
                    <CheckIcon />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature: Freight IQ */}
      <section className="px-6 py-28 lg:py-36">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand">
                Freight IQ
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary lg:text-5xl">
                Factor in freight.
                <br />
                <span className="text-text-muted">Before you sell.</span>
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-text-secondary">
                Estimate transport costs between any two locations with
                industry-standard loading densities. Know the true net return
                before making a selling decision.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Real driving distances via Apple Maps",
                  "11 transport category loading densities",
                  "Cost breakdown: per head, per deck, per km",
                  "Compare saleyards by net return after freight",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-text-secondary">
                    <CheckIcon />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-full max-w-xs">
                <Image
                  src="/images/mockup-freightiq.png"
                  alt="Freight IQ showing $24,408 transport cost estimate"
                  width={390}
                  height={844}
                  className="w-full drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* More features grid */}
      <section className="border-t border-black/5 bg-bg-alt px-6 py-28 dark:border-white/10 lg:py-36">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">
              And more
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary lg:text-5xl">
              Built for the way
              <br />
              you actually work.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Yard Book"
              description="Digital task management for your property. Track jobs, set reminders, link to herds, and create events with your voice."
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              }
            />
            <FeatureCard
              title="PDF Reports"
              description="Export branded Asset Register, Sales Summary and Accounting reports. Share with your bank, accountant or agent."
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              }
            />
            <FeatureCard
              title="Multi-Role Support"
              description="Tailored experiences for farmers, graziers, agents, bankers, insurers and accountants. See what matters to you."
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
            />
            <FeatureCard
              title="Breeding Tracking"
              description="Monitor breeding programs, calving percentages, daily weight gain projections and biological accrual across your herds."
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              }
            />
            <FeatureCard
              title="Weather Integration"
              description="Property-level weather forecasts powered by Apple WeatherKit. See conditions at a glance from your dashboard."
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                </svg>
              }
            />
            <FeatureCard
              title="Advisor Lens"
              description="Private valuation overlays, shading sliders, scenario modelling and client permission workflows for professional advisors."
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-28 lg:py-36">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">
              Pricing
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary lg:text-5xl">
              A plan for every
              <br />
              operation.
            </h2>
            <p className="mt-6 text-lg text-text-secondary">
              Every plan includes a 30-day free trial with full access.
              No credit card required.
            </p>
          </div>

          {/* Tier labels */}
          <div className="mx-auto mt-8 flex max-w-xs items-center justify-center gap-3">
            <span className="rounded-full bg-brand/10 px-4 py-1.5 text-xs font-semibold text-brand">
              Producers
            </span>
            <span className="rounded-full bg-[#5C8FAD]/10 px-4 py-1.5 text-xs font-semibold text-[#5C8FAD]">
              Advisors
            </span>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <PricingCard
              name="Stockman"
              subtitle="Single Property"
              description="For operators managing a single farm."
              badge="producer"
              features={[
                "Single property, unlimited herds",
                "Live MLA market valuations",
                "Portfolio dashboard with performance charts",
                "50 Brangus AI queries/month",
                "5 Freight IQ calculations/month",
                "Yard Book with push reminders",
                "Asset Register, Sales and Accounting reports",
                "Weather card (Apple WeatherKit)",
              ]}
            />
            <PricingCard
              name="Head Stockman"
              subtitle="Multi Property"
              description="For operators managing livestock across multiple farms."
              highlighted
              badge="producer"
              features={[
                "Everything in Stockman, plus:",
                "Unlimited properties",
                "150 Brangus AI queries/month",
                "15 Freight IQ calculations/month",
                "ElevenLabs premium voice output",
                "CSV import for bulk herd entry",
                "Grid IQ (processor grid analysis)",
                "Herd Scenario Simulator",
                "Saleyard Comparison and Property reports",
              ]}
            />
            <PricingCard
              name="Advisor"
              subtitle="Professional"
              description="For agribusiness bankers, livestock agents, accountants and insurers."
              badge="advisor"
              features={[
                "Up to 10 active client connections",
                "Advisor Lens (private valuation overlays)",
                "100 Brangus AI queries/month",
                "10 Freight IQ calculations/month",
                "Sandbox simulator for what-if modelling",
                "One-click scenario generation",
                "Sensitivity analysis",
                "Client permission workflow",
              ]}
            />
            <PricingCard
              name="Head Advisor"
              subtitle="Enterprise"
              description="For firms and practices managing a larger client book."
              highlighted
              badge="advisor"
              features={[
                "Everything in Advisor, plus:",
                "Unlimited client connections",
                "250 Brangus AI queries/month",
                "25 Freight IQ calculations/month",
                "ElevenLabs premium voice output",
                "Cross-client Property vs Property reports",
                "Dedicated onboarding support",
              ]}
            />
          </div>

          <div className="mx-auto mt-10 max-w-2xl text-center">
            <p className="text-sm text-text-muted">
              Need more? IQ Query Packs and Freight IQ Calculation Packs are
              available as one-time purchases. Purchased packs never expire.
            </p>
          </div>
        </div>
      </section>

      {/* Waitlist CTA */}
      <section id="waitlist" className="relative overflow-hidden px-6 py-28 lg:py-36">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1F1B18] to-[#472105]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/4 translate-x-1/4 rounded-full bg-brand/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <Image
            src="/images/app-icon.png"
            alt="Stockman's Wallet"
            width={64}
            height={64}
            className="mx-auto rounded-2xl shadow-lg"
          />
          <h2 className="mt-8 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Be first in the yards.
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Stockman&apos;s Wallet is launching soon. Join the waitlist to get
            early access and be the first to experience intelligent livestock
            valuation.
          </p>
          <div className="mt-10">
            <WaitlistForm variant="hero" />
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-6 py-28 lg:py-36">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">
              About
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary lg:text-5xl">
              Built by people who
              <br />
              understand livestock.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-text-secondary">
              Livestock are one of Australia&apos;s most valuable asset classes,
              yet most producers don&apos;t have the tools to manage them that way.
              We&apos;re changing that.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-text-secondary">
              Our team combines deep agricultural industry experience with
              modern technology to give every farmer, grazier and advisor the
              portfolio management tools they deserve.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="border-t border-black/5 bg-bg-alt px-6 py-28 dark:border-white/10 lg:py-36"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">
            Get in Touch
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary lg:text-5xl">
            Want to know more?
          </h2>
          <p className="mt-6 text-lg text-text-secondary">
            Whether you&apos;re a producer, advisor or just curious about what
            Stockman&apos;s Wallet can do for you, we&apos;d love to hear from
            you.
          </p>
          <a
            href="mailto:info@stockmanswallet.com.au"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-8 py-3.5 text-base font-medium text-white transition-all hover:bg-brand-dark"
          >
            info@stockmanswallet.com.au
          </a>
        </div>
      </section>
    </>
  );
}

function PricingCard({
  name,
  subtitle,
  description,
  features,
  highlighted = false,
  badge,
}: {
  name: string;
  subtitle: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge: "producer" | "advisor";
}) {
  const badgeColor =
    badge === "producer"
      ? "bg-brand/10 text-brand"
      : "bg-[#5C8FAD]/10 text-[#5C8FAD]";

  return (
    <div
      className={`relative rounded-2xl border p-8 ${
        highlighted
          ? "border-brand/30 bg-white shadow-xl shadow-brand/5 dark:bg-[#271F16]"
          : "border-black/5 bg-white dark:border-white/10 dark:bg-[#271F16]"
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 right-6 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
          Most Popular
        </div>
      )}
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-semibold text-text-primary">{name}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}>
          {subtitle}
        </span>
      </div>
      <p className="mt-2 text-sm text-text-secondary">{description}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-3xl font-semibold text-text-primary">Free</span>
        <span className="text-sm text-text-muted">for 30 days</span>
      </div>
      <div className="mt-6 rounded-full bg-brand/10 py-2.5 text-center text-sm font-semibold text-brand">
        Join Waitlist for Early Access
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-text-secondary">
            <CheckIcon />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-[#271F16]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}
