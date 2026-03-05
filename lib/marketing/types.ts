export interface Feature {
  id: string
  name: string
  description: string
  accentColor: string
  accentColorLight: string
  bullets: string[]
  icon: string
}

export interface PricingTier {
  id: string
  name: string
  subtitle: string
  price: number | null
  priceAnnual: number | null
  description: string
  highlighted: boolean
  badge?: string
  features: PricingFeature[]
}

export interface PricingFeature {
  name: string
  included: boolean
}

export interface TeamMember {
  name: string
  role: string
  email: string
  bio: string
}

export interface Step {
  number: number
  title: string
  description: string
}

export interface NavLink {
  label: string
  href: string
}
