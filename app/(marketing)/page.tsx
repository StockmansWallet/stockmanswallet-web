import {
  ChartBarIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
} from "./icons";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F4A871]/10 to-transparent px-6 py-24 dark:from-[#472105]/30 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">
              Intelligent Livestock Valuation
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              Your herds are assets.
              <br />
              <span className="text-brand">Manage them like it.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-text-secondary">
              Track cattle, sheep and pig herds as financial assets with
              real-time MLA market valuations. Built for Australian farmers,
              graziers and rural advisors.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="https://apps.apple.com/au/app/stockmans-wallet/id6740545737"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-8 py-3.5 text-base font-medium text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark hover:shadow-xl hover:shadow-brand/30"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Download on the App Store
              </a>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 px-8 py-3.5 text-base font-medium text-text-primary transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
              >
                See Features
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-black/5 bg-bg-alt px-6 py-8 dark:border-white/10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 text-center text-sm text-text-muted">
          <div>
            <span className="block text-2xl font-bold text-text-primary">Real-time</span>
            MLA Market Data
          </div>
          <div className="hidden h-8 w-px bg-black/10 dark:bg-white/10 sm:block" />
          <div>
            <span className="block text-2xl font-bold text-text-primary">50+</span>
            Cattle Breeds
          </div>
          <div className="hidden h-8 w-px bg-black/10 dark:bg-white/10 sm:block" />
          <div>
            <span className="block text-2xl font-bold text-text-primary">AI-Powered</span>
            Stockman IQ Assistant
          </div>
          <div className="hidden h-8 w-px bg-black/10 dark:bg-white/10 sm:block" />
          <div>
            <span className="block text-2xl font-bold text-text-primary">AUD</span>
            Australian Focused
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Everything you need to manage livestock as financial assets
            </h2>
            <p className="mt-4 text-text-secondary">
              From paddock to portfolio, Stockman&apos;s Wallet gives you the
              tools to understand the true value of your herds.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<CurrencyDollarIcon />}
              title="Live Market Valuations"
              description="Real-time pricing from MLA NLRS data. Know exactly what your herds are worth today, not last month."
            />
            <FeatureCard
              icon={<ChartBarIcon />}
              title="Portfolio Dashboard"
              description="See your total livestock portfolio value at a glance. Track performance over time with interactive charts."
            />
            <FeatureCard
              icon={<TruckIcon />}
              title="Freight IQ"
              description="Estimate transport costs between any two locations. Factor freight into your selling decisions."
            />
            <FeatureCard
              icon={<ChatBubbleLeftRightIcon />}
              title="Stockman IQ"
              description="Your AI livestock advisor. Ask Brangus about market conditions, herd management and portfolio strategy."
            />
            <FeatureCard
              icon={<ClipboardDocumentListIcon />}
              title="Yard Book"
              description="Digital task management for your property. Track jobs, reminders and schedules in one place."
            />
            <FeatureCard
              icon={<ShieldCheckIcon />}
              title="Multi-Role Support"
              description="Built for farmers, graziers, agents, bankers, insurers and accountants. Each role gets a tailored experience."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-brand-brown-deep to-brand-brown px-6 py-24 text-white lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to see what your herds are really worth?
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Download Stockman&apos;s Wallet and start tracking your livestock
            portfolio today. Free to get started.
          </p>
          <a
            href="https://apps.apple.com/au/app/stockmans-wallet/id6740545737"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-brand-brown-deep transition-all hover:bg-white/90"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            Download on the App Store
          </a>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">
              About
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Built by people who understand livestock
            </h2>
            <p className="mt-4 text-text-secondary">
              Stockman&apos;s Wallet was born from a simple observation: livestock
              are one of Australia&apos;s most valuable asset classes, yet most
              producers don&apos;t have the tools to manage them that way.
            </p>
            <p className="mt-4 text-text-secondary">
              Our team combines deep agricultural industry experience with
              modern technology to give every farmer, grazier and advisor the
              portfolio management tools they deserve.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        className="border-t border-black/5 bg-bg-alt px-6 py-24 dark:border-white/10 lg:py-32"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">
            Get in Touch
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Want to know more?
          </h2>
          <p className="mt-4 text-text-secondary">
            Whether you&apos;re a producer, advisor or just curious about what
            Stockman&apos;s Wallet can do for you, we&apos;d love to hear from
            you.
          </p>
          <a
            href="mailto:info@stockmanswallet.com.au"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-8 py-3.5 text-base font-medium text-white transition-all hover:bg-brand-dark"
          >
            Email Us
          </a>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-[#271F16]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}
