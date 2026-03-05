'use client'

import { motion } from 'framer-motion'

interface FadeInOnScrollProps {
  children: React.ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  duration?: number
  className?: string
}

const directionOffsets = {
  up: { y: 30 },
  down: { y: -30 },
  left: { x: 30 },
  right: { x: -30 },
}

export default function FadeInOnScroll({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  className,
}: FadeInOnScrollProps) {
  const offset = directionOffsets[direction]

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
