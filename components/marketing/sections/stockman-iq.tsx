'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, useInView, AnimatePresence } from 'framer-motion'

interface ChatExample {
  userMessage: string
  assistantMessage: string
  contextCards: { label: string; value: string; detail: string; color?: string }[]
}

const CHAT_EXAMPLES: ChatExample[] = [
  {
    userMessage: "Brangus, what's the freight cost to get 87 of my heifers to Emerald Saleyards?",
    assistantMessage: `To Emerald it's gonna cost you $5,958 plus $596 GST - so $6,554 all up. Works out to about $68.50 a head. You've got 9 spare spots on that last deck if you want to throw a few extra on and spread the cost, but there you go.`,
    contextCards: [
      { label: 'Freight to Emerald', value: '$5,958', detail: '+ $596 GST' },
      { label: 'Per Head', value: '$68.48', detail: '87 heifers' },
      { label: 'Distance', value: '662 km', detail: 'Pure Produce to Emerald' },
    ],
  },
  {
    userMessage: "Brangus, if the market drops 20c/kg over the next month, what does that look like for my entire portfolio?",
    assistantMessage: `Hmm, yeah that'd hurt. A 20c drop takes you from $1.67 million down to $1.58 million. That's an $83,649 hit across the whole portfolio.

Your breeders cop the worst of it - they're your biggest chunk, so that's a $47,352 whack right there. The steers and heifers wear the rest between them.

Not the end of the world if you're holding for better prices, but if the market's heading south you'd want to move quick before it gets worse.`,
    contextCards: [
      { label: 'Current Portfolio', value: '$1,665,732', detail: '' },
      { label: 'After -20c/kg Drop', value: '$1,582,083', detail: '' },
      { label: 'Total Loss', value: '$83,649', detail: '5% decrease', color: 'text-error' },
    ],
  },
  {
    userMessage: "Brangus I forgot it's Hilary's birthday on the 10th June, I need to book the mustering chopper for next Thursday for the bulls and Campbells utes in for a Service this Friday.",
    assistantMessage: `Done, mate. Got all three locked in the Yard Book
- Hilary's birthday 10 June (gotta remember the flowers or the dog sleeps on the couch)
- Mustering chopper for the bulls next Thursday 26 March
- Campbells utes in for service this Friday 20 March

You'll get reminders so you don't have to remember a thing. What are you doing for Hilary's do?`,
    contextCards: [],
  },
  {
    userMessage: "Brangus, I've just had a live export order come through for my Yearling Steers on farm at $4.95/kg. Provide a price comparison to sell them at Charters Towers sale yard, including transport.",
    assistantMessage: `Beauty, let's run the numbers. You've got 210 head at 450kg average.

Live export offer: $4.95/kg = $2,227 per head (on farm, no transport cost)

Charters Towers saleyard route: Yearling Steers at 400+kg are tracking $4.84/kg through the yard. That's $2,178 per head... but you're up for $10.73/head freight ($2,254 total + $225 GST). So you're netting $2,167 per head after transport.

The gap: Live export pays $60/head better than going to Charters Towers. That's a $12,600 swing on the whole herd.`,
    contextCards: [
      { label: 'Live Export Offer', value: '$4.95/kg', detail: '$2,227/h' },
      { label: 'Charters Towers', value: '$4.84/kg', detail: 'After $10.73 freight' },
      { label: 'Price Difference', value: '+$60/h', detail: 'Live export advantage', color: 'text-success' },
    ],
  },
]

function TypingText({ text, delay, onComplete, scrollRef }: { text: string; delay: number; onComplete?: () => void; scrollRef?: React.RefObject<HTMLDivElement | null> }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setStarted(false)
    const startTimer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(startTimer)
  }, [delay, text])

  useEffect(() => {
    if (!started) return
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (scrollRef?.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
      if (i >= text.length) {
        clearInterval(timer)
        onComplete?.()
      }
    }, 8)
    return () => clearInterval(timer)
  }, [started, text, onComplete, scrollRef])

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

function BubbleTail({ side, color }: { side: 'left' | 'right'; color: string }) {
  const isRight = side === 'right'
  return (
    <svg
      width="22"
      height="17"
      viewBox="0 0 22.37 16.55"
      fill="none"
      className={`absolute -bottom-[10px] ${isRight ? 'right-[4px]' : 'left-[4px]'}`}
      style={isRight ? undefined : { transform: 'scaleX(-1)' }}
    >
      <path
        d="M0,4.5s1.82-.06,5.8,5.76c3.03,4.43,6.92,5.51,10.01,6.09,4.81.9,8.2-1.45,5.76-1.96-1.77-.37-5.28-2.66-5.09-7.46.21-5.51,2.28-6.94,2.28-6.94L0,4.5Z"
        fill={color}
      />
    </svg>
  )
}

const cardSpring = { type: 'spring', stiffness: 300, damping: 28 } as const

function ContextCard({ card, index }: { card: ChatExample['contextCards'][0]; index: number }) {
  return (
    <motion.div
      layout
      initial={{ x: 200, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: -200, opacity: 0, scale: 0.9 }}
      transition={{
        ...cardSpring,
        delay: index * 0.12,
        opacity: { duration: 0.3, delay: index * 0.12 },
      }}
      className="flex h-[66px] min-w-[100px] flex-col justify-center gap-0.5 rounded-xl bg-white/5 px-3"
    >
      <div className="flex items-center gap-0.5">
        <span className="flex-1 truncate text-[10px] font-semibold uppercase tracking-wide text-text-muted">{card.label}</span>
        <svg className="h-2.5 w-2.5 shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <span className={`text-[17px] font-bold leading-tight ${card.color ?? 'text-white'}`}>{card.value}</span>
      <span className="text-[10px] text-text-secondary">{card.detail}</span>
    </motion.div>
  )
}

const HOLD_DURATION = 10000 // ms to show completed conversation before transitioning

export default function StockmanIQ() {
  const ref = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCards, setShowCards] = useState(false)
  const [phase, setPhase] = useState<'typing' | 'holding' | 'transitioning'>('typing')

  const current = CHAT_EXAMPLES[currentIndex]

  const handleTypingComplete = useCallback(() => {
    setShowCards(true)
    setPhase('holding')
  }, [])

  // Hold then transition to next
  useEffect(() => {
    if (phase !== 'holding') return
    const timer = setTimeout(() => {
      setPhase('transitioning')
      // Slide out cards immediately
      setShowCards(false)
      // After exit animation, move to next
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % CHAT_EXAMPLES.length)
        if (scrollRef.current) scrollRef.current.scrollTop = 0
        setPhase('typing')
      }, 600)
    }, HOLD_DURATION)
    return () => clearTimeout(timer)
  }, [phase])

  return (
    <section id="stockman-iq" className="relative py-24 lg:py-32 overflow-x-clip">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-[1.2fr_2fr] lg:gap-12">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-medium uppercase tracking-wider text-brand">Portfolio Intelligence</span>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-br from-brand-light via-brand to-brand-dark bg-clip-text text-transparent">Meet Brangus.</span>
              <br />
              <span className="text-white">Your intelligent livestock advisor...</span>
              <br />
              <span className="text-white">And new best mate.</span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-text-secondary">
              Ask him anything in plain English. Sale timing, freight costs, market trends, herd valuations. He knows your portfolio and gives you straight answers backed by live data.
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
            {/* Brangus leaning on the chat */}
            <div className="absolute right-[-130px] bottom-[-45px] z-10 h-[820px] w-[420px] pointer-events-none">
              <Image
                src="/images/brangus-lean-2.webp"
                alt="Brangus leaning on a post beside the chat panel"
                fill
                className="object-contain object-right-bottom"
              />
            </div>

            <div className="mr-[280px] flex h-[460px] flex-col rounded-3xl border border-white/[0.06] bg-[#231f1d]">
              {/* Scrollable messages area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-5 pb-3">
                <AnimatePresence mode="wait">
                  {inView && (
                    <motion.div
                      key={currentIndex}
                      initial={{ opacity: 0, y: 30 }}
                      animate={phase === 'transitioning' ? { opacity: 0, y: -40 } : { opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                      className="space-y-4"
                    >
                      {/* User message */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="flex items-end justify-end gap-2"
                      >
                        <div className="relative max-w-[72%] rounded-3xl bg-brand px-4 py-2.5">
                          <p className="text-xs text-white leading-relaxed">{current.userMessage}</p>
                          <BubbleTail side="right" color="#D9762F" />
                        </div>
                        <Image
                          src="/images/demo-user-profile.webp"
                          alt="User"
                          width={40}
                          height={40}
                          className="-mb-7 h-10 w-10 shrink-0 self-end rounded-full object-cover"
                        />
                      </motion.div>

                      {/* AI response */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.8 }}
                        className="flex items-end gap-2"
                      >
                        <Image
                          src="/images/brangus-chat-profile.webp"
                          alt="Brangus"
                          width={40}
                          height={40}
                          className="-mb-7 h-10 w-10 shrink-0 self-end rounded-full object-cover"
                        />
                        <div className="relative max-w-[72%] rounded-3xl bg-[#44372D] px-4 py-2.5">
                          <p className="text-xs text-white/80 leading-relaxed whitespace-pre-line">
                            <TypingText
                              text={current.assistantMessage}
                              delay={1200}
                              scrollRef={scrollRef}
                              onComplete={handleTypingComplete}
                            />
                          </p>
                          <BubbleTail side="left" color="#44372D" />
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Context cards - bar always visible, tiles animate individually */}
              <div className="flex h-[90px] items-center gap-2 overflow-hidden border-t border-white/[0.08] px-3 py-2.5">
                <AnimatePresence mode="popLayout">
                  {showCards && current.contextCards.length > 0 && current.contextCards.map((card, i) => (
                    <ContextCard key={`${currentIndex}-${card.label}`} card={card} index={i} />
                  ))}
                </AnimatePresence>
              </div>

              {/* Input bar - pinned at bottom */}
              <div className="flex items-center gap-2 border-t border-white/[0.06] p-4">
                <div className="flex min-h-[44px] flex-1 items-center rounded-[22px] border border-white/10 bg-white/5 pl-4 pr-1.5">
                  <span className="flex-1 text-sm text-text-muted">Ask Brangus anything...</span>
                </div>
                <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all hover:bg-white/10">
                  <svg className="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h2.5l5-4.5V19.5l-5-4.5z" />
                    <line x1="22" y1="2" x2="2" y2="22" strokeWidth={1.5} />
                  </svg>
                </div>
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
