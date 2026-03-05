import { clsx } from 'clsx'

interface CardProps {
  level?: 1 | 2 | 3 | 4
  className?: string
  children: React.ReactNode
}

const levelClasses = {
  1: 'bg-bg-card-1',
  2: 'bg-bg-card-2',
  3: 'bg-bg-card-3',
  4: 'bg-bg-card-4',
}

export default function LandingCard({ level = 1, className, children }: CardProps) {
  return (
    <div className={clsx('rounded-[16px] border border-white/5 p-6 sm:p-7', levelClasses[level], className)}>
      {children}
    </div>
  )
}
