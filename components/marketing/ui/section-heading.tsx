import { clsx } from 'clsx'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  subtitle?: string
  centered?: boolean
  className?: string
}

export default function SectionHeading({ eyebrow, title, subtitle, centered = true, className }: SectionHeadingProps) {
  return (
    <div className={clsx('mb-12 md:mb-16', centered && 'text-center', className)}>
      {eyebrow && (
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
          {subtitle}
        </p>
      )}
    </div>
  )
}
