'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

interface StatItem {
  value: number
  suffix: string
  label: string
  prefix?: string
}

const STATS: StatItem[] = [
  { value: 17, suffix: '+', label: 'Livestock categories tracked', prefix: '' },
  { value: 50, suffix: '+', label: 'Live market categories', prefix: '' },
  { value: 9, suffix: '', label: 'AI insight templates', prefix: '' },
  { value: 5, suffix: '', label: 'Professional report types', prefix: '' },
]

function AnimatedNumber({ value, prefix = '', suffix, inView }: { value: number; prefix?: string; suffix: string; inView: boolean }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const duration = 1200
    const steps = 40
    const increment = value / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.min(Math.round(increment * step), value)
      setDisplay(current)
      if (step >= steps) clearInterval(timer)
    }, duration / steps)

    return () => clearInterval(timer)
  }, [inView, value])

  return (
    <span className="tabular-nums">
      {prefix}{inView ? display : 0}{suffix}
    </span>
  )
}

export default function Stats() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="relative border-y border-white/[0.04]">
      <div ref={ref} className="relative mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-16 sm:px-6 md:grid-cols-4 lg:px-8">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="text-center"
          >
            <p className="text-3xl font-bold text-white sm:text-4xl">
              <AnimatedNumber
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                inView={inView}
              />
            </p>
            <p className="mt-1 text-sm text-text-muted">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
