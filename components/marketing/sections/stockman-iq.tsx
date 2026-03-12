'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const CHAT_MESSAGES = [
  {
    role: 'user' as const,
    text: 'When should I sell my Brahman steers for the best return?',
  },
  {
    role: 'assistant' as const,
    text: 'Based on your 45 Brahman steers at 420kg with 1.2kg/day gain, here is my analysis:',
  },
]

const INSIGHT_CARDS = [
  { label: 'Best Sale Month', value: 'October', detail: 'at 520kg live weight' },
  { label: 'Projected Value', value: '$147,712', detail: 'net of freight' },
  { label: 'Sell vs Hold', value: '+$12,400', detail: 'selling in Oct vs Dec', positive: true },
]

function TypingText({ text, delay, onComplete }: { text: string; delay: number; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(startTimer)
  }, [delay])

  useEffect(() => {
    if (!started) return
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timer)
        onComplete?.()
      }
    }, 18)
    return () => clearInterval(timer)
  }, [started, text, onComplete])

  if (!started) return null

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block h-4 w-0.5 animate-pulse bg-brand ml-0.5" />
      )}
    </span>
  )
}

export default function StockmanIQ() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [showInsights, setShowInsights] = useState(false)

  return (
    <section id="stockman-iq" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-medium uppercase tracking-wider text-brand">Stockman IQ</span>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              AI-powered capital
              <br />
              timing intelligence
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-text-secondary">
              Ask questions in plain English. Get data-driven insights on when to sell, where to sell, and what you will net after freight and fees.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                'Natural language questions about your herds',
                'Voice input and output with Australian accent',
                'Portfolio-aware responses using your live data',
                'Create yard book events from conversation',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15">
                    <svg className="h-3 w-3 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Chat Demo */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="rounded-3xl border border-white/[0.06] bg-bg-card-1 p-6 shadow-2xl sm:p-8">
              {/* Chat header */}
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/20">
                  <svg className="h-5 w-5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Brangus</p>
                  <p className="text-xs text-text-muted">Stockman IQ Assistant</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs text-text-muted">Online</span>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-4">
                {inView && (
                  <>
                    {/* User message */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand/20 px-4 py-3">
                        <p className="text-sm text-white">{CHAT_MESSAGES[0].text}</p>
                      </div>
                    </motion.div>

                    {/* AI message */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 1.2 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-bg-card-2 px-4 py-3">
                        <p className="text-sm text-text-secondary leading-relaxed">
                          <TypingText
                            text={CHAT_MESSAGES[1].text}
                            delay={1500}
                            onComplete={() => setShowInsights(true)}
                          />
                        </p>
                      </div>
                    </motion.div>
                  </>
                )}

                {/* Insight cards */}
                {showInsights && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {INSIGHT_CARDS.map((card, i) => (
                      <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.4, delay: i * 0.15 }}
                        className="rounded-xl border border-white/[0.06] bg-bg-card-2 p-3"
                      >
                        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{card.label}</p>
                        <p className={`mt-1 text-lg font-bold ${card.positive ? 'text-success' : 'text-white'}`}>
                          {card.value}
                        </p>
                        <p className="text-[11px] text-text-muted">{card.detail}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Glow */}
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-brand/[0.04] blur-3xl" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
