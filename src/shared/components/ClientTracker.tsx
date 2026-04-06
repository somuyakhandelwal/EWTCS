'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { detectBrowserCompatibilityOnClient } from '@/shared/lib/browser-compat'

export function ClientTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const compatibility = detectBrowserCompatibilityOnClient()
    fetch('/api/monitoring/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        browserFamily: compatibility.family,
        browserVersion: compatibility.majorVersion,
        compatibilityTier: compatibility.tier,
      }),
    }).catch(() => {})
  }, [pathname])

  return null
}
