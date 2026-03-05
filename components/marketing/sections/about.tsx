import { TEAM_MEMBERS } from '@/lib/marketing/constants'
import SectionHeading from '@/components/marketing/ui/section-heading'
import TeamMemberCard from '@/components/marketing/ui/team-member'
import FadeInOnScroll from '@/components/marketing/animations/fade-in-on-scroll'
import StaggerChildren, { StaggerItem } from '@/components/marketing/animations/stagger-children'

export default function About() {
  return (
    <section id="about" className="bg-bg-deep py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="About"
          title="Built by Australians, for Australian producers"
        />

        <FadeInOnScroll>
          <p className="mx-auto mb-12 max-w-2xl text-center text-base leading-relaxed text-text-secondary">
            Stockman&apos;s Wallet was born in Queensland from a simple question: why don&apos;t livestock producers have the same portfolio tools as share market investors? We&apos;re building the capital intelligence platform that Australian agriculture deserves.
          </p>
        </FadeInOnScroll>

        <StaggerChildren className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
          {TEAM_MEMBERS.map((member) => (
            <StaggerItem key={member.name}>
              <TeamMemberCard member={member} />
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  )
}
