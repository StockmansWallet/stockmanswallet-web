'use client'

import { useEffect, useState } from 'react'

const sections = [
  { id: 'character', label: 'Character' },
  { id: 'voice', label: 'Voice' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'audition', label: 'Audition' },
  { id: 'submit', label: 'Submit' },
]

export function VoiceBriefNav() {
  const [activeSection, setActiveSection] = useState('')
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    )

    for (const section of sections) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }

    const handleScroll = () => {
      setPastHero(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <>
      {/* Floating section nav - large screens only */}
      <nav
        className={`fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1 transition-opacity duration-500 xl:flex ${
          pastHero ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`group flex cursor-pointer items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3.5 text-xs tracking-wide transition-all ${
              activeSection === section.id
                ? 'bg-brand/15 text-brand'
                : 'text-text-muted hover:bg-white/[0.04] hover:text-white'
            }`}
            onClick={(e) => {
              e.preventDefault()
              document
                .getElementById(section.id)
                ?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                activeSection === section.id ? 'bg-brand' : 'bg-white/20 group-hover:bg-white/40'
              }`}
            />
            {section.label}
          </a>
        ))}
      </nav>

      {/* Sticky submit CTA */}
      <a
        href="#submit"
        onClick={(e) => {
          e.preventDefault()
          document
            .getElementById('submit')
            ?.scrollIntoView({ behavior: 'smooth' })
        }}
        className={`fixed bottom-6 right-6 z-40 cursor-pointer rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all duration-300 hover:bg-brand-light hover:shadow-brand/40 ${
          pastHero && activeSection !== 'submit'
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        Submit Audition
      </a>
    </>
  )
}
