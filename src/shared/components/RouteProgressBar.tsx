'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import nprogress from 'nprogress'

export function RouteProgressBar() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        nprogress.configure({ showSpinner: false })
    }, [])

    useEffect(() => {
        // This triggers when the route has actually changed
        // In App Router, we don't have a reliable 'routeChangeStart' globally
        // unless we patch the Router or use Link wrappers.
        // For now, we complete it here.
        nprogress.done()

        return () => {
            nprogress.start()
        }
    }, [pathname, searchParams])

    return null
}
