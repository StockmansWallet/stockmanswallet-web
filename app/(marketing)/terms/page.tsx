import type { Metadata } from "next";
import { LegalLink, LegalList, LegalPage, LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | Stockman's Wallet",
};

export default function TermsOfService() {
  return (
    <LegalPage title="Terms of Service" eyebrow="Stockman's Wallet legal">
      <p className="text-sm font-semibold text-[#6f5647]">Last updated: 30 April 2026</p>

      <LegalSection title="Acceptance of Terms">
        <p>
          By downloading, installing, or using Stockman&apos;s Wallet, you agree to be bound by
          these Terms of Service. If you do not agree to these terms, do not use the application.
        </p>
      </LegalSection>

      <LegalSection title="Service Description">
        <p>
          Stockman&apos;s Wallet is a livestock portfolio management application that provides
          valuation estimates based on publicly available MLA market data and user inputs.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimers">
        <LegalList>
          <li>
            Valuations are estimates based on publicly available MLA market data and user inputs.
            Actual sale prices may differ.
          </li>
          <li>
            The app does not provide financial advice. Users should consult qualified professionals
            for financial decisions.
          </li>
          <li>
            AI responses from Brangus are informational and may contain inaccuracies. Always verify
            important information independently.
          </li>
          <li>
            Market data is sourced from Meat &amp; Livestock Australia and is subject to their data
            availability and accuracy.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="User Responsibilities">
        <p>
          You are responsible for the accuracy of the data you enter into the application, including
          herd details, property information, and livestock records.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For questions about these terms, contact us at{" "}
          <LegalLink href="mailto:hello@stockmanswallet.com.au">
            hello@stockmanswallet.com.au
          </LegalLink>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
