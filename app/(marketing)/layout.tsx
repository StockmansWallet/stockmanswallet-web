import { Header } from '@/components/marketing/header'
import { Footer } from '@/components/marketing/footer'
import { WaitlistProvider } from '@/components/marketing/ui/waitlist-provider'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WaitlistProvider>
      <div className="flex min-h-screen flex-col bg-bg-primary">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </WaitlistProvider>
  )
}
