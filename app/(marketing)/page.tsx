import type { Metadata } from 'next'
import Hero from '@/components/marketing/sections/hero'
import Features from '@/components/marketing/sections/features'
import StockmanIQ from '@/components/marketing/sections/stockman-iq'
import ForAdvisors from '@/components/marketing/sections/for-advisors'
import Pricing from '@/components/marketing/sections/pricing'
import About from '@/components/marketing/sections/about'
import ContactSignup from '@/components/marketing/sections/contact-signup'

export const metadata: Metadata = {
  title: "Stockman's Wallet | Intelligent Livestock Valuation",
  description:
    "Australia's first livestock portfolio management platform. Live market data, intelligent valuation models, AI-powered timing analysis, and professional-grade reporting for producers and rural advisors.",
  openGraph: {
    title: "Stockman's Wallet | Intelligent Livestock Valuation",
    description:
      "Australia's first livestock portfolio management platform. Live market data, intelligent valuation models, and professional-grade reporting.",
    url: 'https://stockmanswallet.com.au',
    siteName: "Stockman's Wallet",
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <StockmanIQ />
      <ForAdvisors />
      <Pricing />
      <About />
      <ContactSignup />
    </>
  )
}
