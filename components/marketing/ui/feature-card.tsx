import type { Feature } from '@/lib/marketing/types'
import LandingCard from './landing-card'

interface FeatureCardProps {
  feature: Feature
}

const iconPaths: Record<string, string> = {
  chart: 'M3 13h2v8H3zm4-4h2v12H7zm4-3h2v15h-2zm4 6h2v9h-2zm4-8h2v17h-2z',
  cattle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z',
  brain: 'M12 2a9 9 0 00-9 9c0 3.87 2.46 7.16 5.9 8.42.07-.76.21-1.49.42-2.2A7.01 7.01 0 015 12a7 7 0 1114 0 7.01 7.01 0 01-4.32 5.22c.21.71.35 1.44.42 2.2A9 9 0 0021 11a9 9 0 00-9-9z',
  calendar: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z',
  truck: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  grid: 'M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z',
  document: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z',
  briefcase: 'M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z',
}

export default function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <LandingCard className="group relative overflow-hidden transition-all duration-300 hover:border-white/10">
      <div
        className="absolute inset-x-0 top-0 h-1 transition-all duration-300 group-hover:h-1.5"
        style={{ backgroundColor: feature.accentColor }}
      />
      <div className="pt-3">
        <div
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: `${feature.accentColor}20` }}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke={feature.accentColor}
            strokeWidth={1.5}
          >
            <path d={iconPaths[feature.icon] || iconPaths.chart} />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-white">{feature.name}</h3>
        <p className="mb-4 text-sm leading-relaxed text-text-secondary">{feature.description}</p>
        <ul className="space-y-1.5">
          {feature.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-text-tertiary">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0"
                fill={feature.accentColor}
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </LandingCard>
  )
}
