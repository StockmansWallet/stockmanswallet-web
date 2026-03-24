import type { Metadata } from 'next'
import AboutHero from '@/components/marketing/sections/about/about-hero'
import AboutMission from '@/components/marketing/sections/about/about-mission'
import AboutValues from '@/components/marketing/sections/about/about-values'
import AboutTeam from '@/components/marketing/sections/about/about-team'
import AboutAustralia from '@/components/marketing/sections/about/about-australia'
import AboutCTA from '@/components/marketing/sections/about/about-cta'

export const metadata: Metadata = {
  title: "About | Stockman's Wallet",
  description:
    "Meet the team behind Stockman's Wallet \u2014 an Australian livestock valuation platform giving producers the same quality financial tools available to equity investors.",
}

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutMission />
      <AboutValues />
      <AboutTeam />
      <AboutAustralia />
      <AboutCTA />
    </>
  )
}
