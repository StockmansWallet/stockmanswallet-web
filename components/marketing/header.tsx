'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { NAV_LINKS } from '@/lib/marketing/constants'
import LandingButton from '@/components/marketing/ui/landing-button'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? 'glass-strong shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/app-icon.png"
            alt="Stockman's Wallet"
            width={32}
            height={32}
            className="h-8 w-8 rounded-[8px]"
          />
          <span className="text-lg font-bold text-white">Stockman&apos;s Wallet</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-[10px] px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-white hover:bg-white/5"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-brand transition-colors hover:text-brand-light"
          >
            Log In
          </Link>
          <LandingButton size="sm" href="#signup">
            Join Waitlist
          </LandingButton>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-[10px] text-text-secondary hover:bg-white/5 lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="glass-strong absolute inset-x-0 top-16 border-t border-white/5 lg:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-[10px] px-3 py-3 text-base font-medium text-text-secondary transition-colors hover:text-white hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/sign-in"
              onClick={() => setMobileOpen(false)}
              className="rounded-[10px] px-3 py-3 text-base font-medium text-brand transition-colors hover:text-brand-light"
            >
              Log In
            </Link>
            <div className="mt-2 border-t border-white/5 pt-4">
              <LandingButton href="#signup" className="w-full" onClick={() => setMobileOpen(false)}>
                Join Waitlist
              </LandingButton>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
