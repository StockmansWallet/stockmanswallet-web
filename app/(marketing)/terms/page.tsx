import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Terms of Service | Stockman's Wallet",
}

export default function TermsOfService() {
  return (
    <main className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-white">Terms of Service</h1>

        <div className="space-y-6 text-sm leading-relaxed text-text-secondary">
          <p>
            <strong className="text-white">Last updated:</strong> 30 April 2026
          </p>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Acceptance of Terms</h2>
            <p>
              By downloading, installing, or using Stockman&apos;s Wallet, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the application.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Service Description</h2>
            <p>
              Stockman&apos;s Wallet is a livestock portfolio management application that provides valuation estimates based on publicly available MLA market data and user inputs.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Disclaimers</h2>
            <ul className="ml-4 mt-2 list-disc space-y-2">
              <li>Valuations are estimates based on publicly available MLA market data and user inputs. Actual sale prices may differ.</li>
              <li>The app does not provide financial advice. Users should consult qualified professionals for financial decisions.</li>
              <li>AI responses from Brangus are informational and may contain inaccuracies. Always verify important information independently.</li>
              <li>Market data is sourced from Meat &amp; Livestock Australia and is subject to their data availability and accuracy.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">User Responsibilities</h2>
            <p>
              You are responsible for the accuracy of the data you enter into the application, including herd details, property information, and livestock records.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Contact</h2>
            <p>
              For questions about these terms, contact us at{' '}
              <a href="mailto:hello@stockmanswallet.com.au" className="text-brand hover:text-brand-light">
                hello@stockmanswallet.com.au
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
