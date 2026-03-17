'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function ClientTracker() {
  const pathname = usePathname()
  useEffect(() => {
    fetch('/api/monitoring/track', { method: 'POST' }).catch(() => {})
  }, [pathname])
  return null
}
