const SITE_URL = "https://stockmanswallet.com.au";
const SITE_NAME = "Stockman's Wallet";

const organisationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  legalName: "Stockman's Wallet Pty Ltd",
  url: SITE_URL,
  logo: `${SITE_URL}/images/sw-logo.png`,
  description:
    "Australia's first livestock portfolio management platform. Built for producers and rural advisors.",
  email: "hello@stockmanswallet.com.au",
  address: {
    "@type": "PostalAddress",
    addressRegion: "Queensland",
    addressCountry: "AU",
  },
  sameAs: [SITE_URL],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "en-AU",
};

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
      >
        {JSON.stringify(organisationJsonLd)}
      </script>
      <script
        type="application/ld+json"
        suppressHydrationWarning
      >
        {JSON.stringify(websiteJsonLd)}
      </script>
    </>
  );
}
