import type { TeamMember as TeamMemberType } from '@/lib/marketing/types'
import LandingCard from './landing-card'

interface TeamMemberProps {
  member: TeamMemberType
}

export default function TeamMemberCard({ member }: TeamMemberProps) {
  return (
    <LandingCard className="text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-bg-card-2 text-2xl font-bold text-brand">
        {member.name.split(' ').map(n => n[0]).join('')}
      </div>
      <h3 className="text-lg font-semibold text-white">{member.name}</h3>
      <p className="mt-1 text-sm font-medium text-brand">{member.role}</p>
      <p className="mt-2 text-sm text-text-secondary">{member.bio}</p>
    </LandingCard>
  )
}
