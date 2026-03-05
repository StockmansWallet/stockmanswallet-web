import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Privacy Policy | Stockman's Wallet",
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-white">Privacy Policy</h1>

        <div className="space-y-6 text-sm leading-relaxed text-text-secondary">
          <p>
            <strong className="text-white">Last updated:</strong> 2 March 2026
          </p>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Overview</h2>
            <p>
              Stockman&apos;s Wallet (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our iOS application and website.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Data Collection</h2>
            <p>We collect information you provide directly:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Account information via Sign in with Apple</li>
              <li>Livestock herd data you enter into the app</li>
              <li>Property and saleyard details</li>
              <li>Chat conversations with Brangus AI</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Data Storage</h2>
            <p>
              Your data is stored locally on your device using SwiftData and on secure Supabase servers. All network requests use HTTPS encryption. Credentials are stored in the encrypted iOS Keychain.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Supabase (backend infrastructure)</li>
              <li>Anthropic/Claude (AI chat processing)</li>
              <li>ElevenLabs (voice synthesis)</li>
              <li>Apple WeatherKit (weather data)</li>
              <li>MLA (market data)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Account Deletion</h2>
            <p>
              You can delete your account and all associated data at any time from within the app settings.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Contact</h2>
            <p>
              For privacy-related enquiries, contact us at{' '}
              <a href="mailto:support@stockmanswallet.com.au" className="text-brand hover:text-brand-light">
                support@stockmanswallet.com.au
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
