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
            <strong className="text-white">Last updated:</strong> 6 March 2026
          </p>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Overview</h2>
            <p>
              Stockman&apos;s Wallet (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is operated by Stockman&apos;s Wallet Pty Ltd (ABN pending), based in Queensland, Australia. We are committed to protecting your privacy in accordance with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our iOS application and website.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Information We Collect</h2>
            <p className="mb-2">We collect information you provide directly when using the app:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li><strong className="text-white">Account information:</strong> Name and email address via Sign in with Apple or email registration. When using Sign in with Apple, you may choose to hide your email address.</li>
              <li><strong className="text-white">Livestock data:</strong> Herd details, head counts, weights, breed information, purchase prices, and other livestock management data you enter.</li>
              <li><strong className="text-white">Property information:</strong> Property names, locations, and PIC (Property Identification Code) numbers.</li>
              <li><strong className="text-white">Sales records:</strong> Saleyard and private sale transaction details.</li>
              <li><strong className="text-white">Yard book events:</strong> Scheduled tasks, health records, and muster events.</li>
              <li><strong className="text-white">AI conversations:</strong> Messages you send to Brangus, our AI assistant. These are processed in real time and not stored on our servers after the session ends.</li>
            </ul>
            <p className="mt-3">We do not collect location data, contacts, photos, or any information from other apps on your device.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Provide livestock portfolio valuations using MLA (Meat &amp; Livestock Australia) market data</li>
              <li>Calculate freight cost estimates between locations</li>
              <li>Power Brangus, our AI assistant, to answer questions about your portfolio</li>
              <li>Sync your data between devices via your account</li>
              <li>Send notifications about yard book events you have scheduled</li>
            </ul>
            <p className="mt-3">We do not sell, rent, or share your personal information with third parties for marketing purposes. We do not use your data for advertising or profiling.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Data Storage and Security</h2>
            <p>
              Your data is stored locally on your device and on secure cloud servers hosted by Supabase (infrastructure provided by Amazon Web Services). All data in transit is encrypted using HTTPS/TLS. Authentication credentials are stored in the encrypted iOS Keychain and are never transmitted in plain text.
            </p>
            <p className="mt-2">
              Our database servers are located in the Sydney, Australia region (ap-southeast-2). We implement row-level security policies to ensure users can only access their own data.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Third-Party Services</h2>
            <p>We use the following third-party services to operate the app. Each processes only the minimum data required for its function:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li><strong className="text-white">Supabase</strong> (backend infrastructure, authentication, database) - stores your account and livestock data</li>
              <li><strong className="text-white">Anthropic / Claude</strong> (AI processing) - processes your Brangus chat messages. Messages are not retained by Anthropic after processing.</li>
              <li><strong className="text-white">Apple WeatherKit</strong> (weather data) - retrieves weather information for your property locations</li>
              <li><strong className="text-white">MLA (Meat &amp; Livestock Australia)</strong> (market data) - provides livestock market prices. No personal data is sent.</li>
            </ul>
            <p className="mt-3">We do not use any analytics, advertising, or tracking SDKs.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account, all associated data is permanently removed from our servers within 30 days. Local data on your device is removed immediately upon account deletion.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li><strong className="text-white">Access</strong> your personal data at any time through the app</li>
              <li><strong className="text-white">Correct</strong> inaccurate data by editing your profile or livestock records</li>
              <li><strong className="text-white">Delete</strong> your account and all associated data from Settings &gt; Security &gt; Delete Account</li>
              <li><strong className="text-white">Export</strong> your data by contacting us at the email below</li>
              <li><strong className="text-white">Clear</strong> all synced data without deleting your account from Settings &gt; Data &amp; Sync</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Children&apos;s Privacy</h2>
            <p>
              Stockman&apos;s Wallet is not directed at children under 17. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will promptly delete it.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised &quot;Last updated&quot; date. Your continued use of the app after changes are posted constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Contact</h2>
            <p>
              For privacy-related enquiries or to exercise your rights, contact us at{' '}
              <a href="mailto:support@stockmanswallet.com.au" className="text-brand hover:text-brand-light">
                support@stockmanswallet.com.au
              </a>
            </p>
            <p className="mt-2">
              Stockman&apos;s Wallet Pty Ltd<br />
              Queensland, Australia
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
