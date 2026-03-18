import Hero from '@/components/marketing/sections/hero'
import Stats from '@/components/marketing/sections/stats'
import Features from '@/components/marketing/sections/features'
import HowItWorks from '@/components/marketing/sections/how-it-works'
import StockmanIQ from '@/components/marketing/sections/stockman-iq'
import ForAdvisors from '@/components/marketing/sections/for-advisors'
import Pricing from '@/components/marketing/sections/pricing'
import About from '@/components/marketing/sections/about'
import ContactSignup from '@/components/marketing/sections/contact-signup'

export default function HomePage() {
  return (
    <>
      <Hero />
      {/* <Stats /> */}
      <Features />
      {/* <HowItWorks /> */}
      <StockmanIQ />
      <ForAdvisors />
      <Pricing />
      <About />
      <ContactSignup />
    </>
  )
}
