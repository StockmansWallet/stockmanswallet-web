import type { Metadata } from 'next'
import Hero from '@/components/marketing/sections/hero'
import Features from '@/components/marketing/sections/features'
import Brangus from '@/components/marketing/sections/brangus'
import { ADVISOR_ENABLED } from '@/lib/feature-flags'
import ForAdvisors from '@/components/marketing/sections/for-advisors'
import Pricing from '@/components/marketing/sections/pricing'
import About from '@/components/marketing/sections/about'
import ContactSignup from '@/components/marketing/sections/contact-signup'

export const metadata: Metadata = {
  title: {
    absolute: "Stockman's Wallet | Intelligent Livestock Valuation",
  },
  description:
    "Australia's first livestock portfolio management platform. Live market data, intelligent valuation models, AI-powered timing analysis, and professional-grade reporting for Australian producers.",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Stockman's Wallet | Intelligent Livestock Valuation",
    description:
      "Australia's first livestock portfolio management platform. Live market data, intelligent valuation models, and professional-grade reporting.",
    url: 'https://stockmanswallet.com.au',
    siteName: "Stockman's Wallet",
    locale: 'en_AU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Stockman's Wallet | Intelligent Livestock Valuation",
    description:
      "Australia's first livestock portfolio management platform. Live market data, intelligent valuation models, and professional-grade reporting.",
  },
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Brangus />
      {ADVISOR_ENABLED && <ForAdvisors />}
      <Pricing />
      <About />
      <ContactSignup />
    </>
  )
}
