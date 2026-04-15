import Image from 'next/image'
import Link from 'next/link'
import { Lora } from 'next/font/google'

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
})

export default function VoiceBriefLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${lora.variable} flex min-h-screen flex-col bg-bg-primary`}
      style={{ '--font-serif': 'var(--font-lora), "Lora", Georgia, serif' } as React.CSSProperties}
    >
      {/* Minimal header - logo only */}
      <header className="fixed top-0 z-50 w-full border-b border-border-subtle bg-bg-primary/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/sw-logo-tally.svg"
              alt="Stockman's Wallet"
              width={44}
              height={44}
              className="h-11 w-11"
            />
            <span className="text-lg font-bold text-white sm:text-xl">
              Stockman&apos;s Wallet
            </span>
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
