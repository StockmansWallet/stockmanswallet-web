import type { Metadata } from "next";
import { LegalLink, LegalList, LegalPage, LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Stockman's Wallet",
};

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" eyebrow="Stockman's Wallet privacy">
      <p className="text-sm font-semibold text-[#6f5647]">Last updated: 30 April 2026</p>

      <LegalSection title="Overview">
        <p>
          Stockman&apos;s Wallet (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is operated by
          Stockman&apos;s Wallet Pty Ltd, based in Queensland, Australia. We are committed to
          protecting your privacy in accordance with the Australian Privacy Act 1988 (Cth) and the
          Australian Privacy Principles (APPs). This Privacy Policy explains how we collect, use,
          disclose, and safeguard your information when you use our iOS application and website.
        </p>
      </LegalSection>

      <LegalSection title="Information We Collect">
        <p>We collect information you provide directly when using the app:</p>
        <LegalList>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Account information:</strong> Name and
            email address via Sign in with Apple or email registration. When using Sign in with
            Apple, you may choose to hide your email address.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Livestock data:</strong> Herd details,
            head counts, weights, breed information, purchase prices, and other livestock management
            data you enter.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Property information:</strong> Property
            names, locations, and PIC (Property Identification Code) numbers.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Sales records:</strong> Saleyard and
            private sale transaction details.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Yard book events:</strong> Scheduled
            tasks, health records, and muster events.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">AI conversations:</strong> Messages you
            send to Brangus, our AI assistant. These are processed in real time and not stored on
            our servers after the session ends.
          </li>
        </LegalList>
        <p>
          We do not collect location data, contacts, photos, or any information from other apps on
          your device.
        </p>
      </LegalSection>

      <LegalSection title="How We Use Your Information">
        <p>We use your information to:</p>
        <LegalList>
          <li>
            Provide livestock portfolio valuations using MLA (Meat &amp; Livestock Australia) market
            data.
          </li>
          <li>Calculate freight cost estimates between locations.</li>
          <li>Power Brangus, our AI assistant, to answer questions about your portfolio.</li>
          <li>Sync your data between devices via your account.</li>
          <li>Send notifications about yardbook events you have scheduled.</li>
        </LegalList>
        <p>
          We do not sell, rent, or share your personal information with third parties for marketing
          purposes. We do not use your data for advertising or profiling.
        </p>
      </LegalSection>

      <LegalSection title="Data Storage and Security">
        <p>
          Your data is stored locally on your device and on secure cloud servers hosted by Supabase
          (infrastructure provided by Amazon Web Services). All data in transit is encrypted using
          HTTPS/TLS. Authentication credentials are stored in the encrypted iOS Keychain and are
          never transmitted in plain text.
        </p>
        <p>
          Our database servers are located in the Sydney, Australia region (ap-southeast-2). We
          implement row-level security policies to ensure users can only access their own data.
        </p>
      </LegalSection>

      <LegalSection title="Third-Party Services">
        <p>
          We use the following third-party services to operate the app and website. Each processes
          only the minimum data required for its function:
        </p>
        <LegalList>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Supabase</strong> (backend
            infrastructure, authentication, database) - stores your account and livestock data.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Anthropic / Claude</strong> (AI
            processing) - processes your Brangus chat messages. Messages are not retained by
            Anthropic after processing.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Apple WeatherKit</strong> (weather
            data) - retrieves weather information for your property locations.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">
              MLA (Meat &amp; Livestock Australia)
            </strong>{" "}
            (market data) - provides livestock market prices. No personal data is sent.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Vercel Web Analytics</strong> (website
            analytics) - records privacy-preserving, aggregate website traffic information so we can
            understand page performance and visitor interest. It is not used for advertising or
            cross-site tracking.
          </li>
        </LegalList>
        <p>
          We do not sell your data, use advertising trackers, or use analytics for profiling.
          Website analytics are used only in aggregate to improve the public website and launch
          communications.
        </p>
      </LegalSection>

      <LegalSection title="Data Retention">
        <p>
          We retain your data for as long as your account is active. If you delete your account, all
          associated data is permanently removed from our servers within 30 days. Local data on your
          device is removed immediately upon account deletion.
        </p>
      </LegalSection>

      <LegalSection title="Your Rights">
        <p>You have the right to:</p>
        <LegalList>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Access</strong> your personal data at
            any time through the app.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Correct</strong> inaccurate data by
            editing your profile or livestock records.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Delete</strong> your account and all
            associated data from Settings &gt; Security &gt; Delete Account.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Export</strong> your data by contacting
            us at the email below.
          </li>
          <li>
            <strong className="font-semibold text-[#2a1d16]">Clear</strong> all synced data without
            deleting your account from Settings &gt; Data &amp; Sync.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Children's Privacy">
        <p>
          Stockman&apos;s Wallet is not directed at children under 17. We do not knowingly collect
          personal information from children. If you believe a child has provided us with personal
          information, please contact us and we will promptly delete it.
        </p>
      </LegalSection>

      <LegalSection title="Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any material
          changes by posting the updated policy on this page with a revised &quot;Last updated&quot;
          date. Your continued use of the app after changes are posted constitutes your acceptance
          of the updated policy.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For privacy-related enquiries or to exercise your rights, contact us at{" "}
          <LegalLink href="mailto:hello@stockmanswallet.com.au">
            hello@stockmanswallet.com.au
          </LegalLink>
        </p>
        <p>
          Stockman&apos;s Wallet Pty Ltd
          <br />
          Queensland, Australia
        </p>
      </LegalSection>
    </LegalPage>
  );
}
