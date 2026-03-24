'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { WaitlistModal } from './waitlist-modal'

interface WaitlistContextValue {
  openWaitlist: () => void
}

const WaitlistContext = createContext<WaitlistContextValue>({ openWaitlist: () => {} })

export function useWaitlist() {
  return useContext(WaitlistContext)
}

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <WaitlistContext.Provider value={{ openWaitlist: () => setOpen(true) }}>
      {children}
      <WaitlistModal open={open} onClose={() => setOpen(false)} />
    </WaitlistContext.Provider>
  )
}
