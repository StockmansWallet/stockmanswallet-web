'use client'

import { useEffect, useState } from 'react'

const scripts = [
  { num: 1, title: 'Intro' },
  { num: 2, title: 'Walkthrough' },
  { num: 3, title: 'Good News' },
  { num: 4, title: 'Tough News' },
  { num: 5, title: 'Banter' },
  { num: 6, title: 'Social' },
  { num: 7, title: 'Instructional' },
  { num: 8, title: 'Punchy' },
]

export function ScriptNav() {
  const [activeScript, setActiveScript] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const num = parseInt(entry.target.id.replace('sample-', ''), 10)
            if (!isNaN(num)) setActiveScript(num)
          }
        }
      },
      { rootMargin: '-30% 0px -50% 0px' }
    )

    for (const s of scripts) {
      const el = document.getElementById(`sample-${s.num}`)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div className="mb-10 flex flex-wrap gap-2">
      {scripts.map((s) => (
        <a
          key={s.num}
          href={`#sample-${s.num}`}
          onClick={(e) => {
            e.preventDefault()
            document
              .getElementById(`sample-${s.num}`)
              ?.scrollIntoView({ behavior: 'smooth' })
          }}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            activeScript === s.num
              ? 'bg-brand/15 text-brand'
              : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          <span className="tabular-nums">{String(s.num).padStart(2, '0')}</span>
          <span className="ml-1.5 hidden sm:inline">{s.title}</span>
        </a>
      ))}
    </div>
  )
}
