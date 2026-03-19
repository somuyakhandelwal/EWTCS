'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface PageTransitionProps {
    children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname()

    return (
        <div
            key={pathname}
            className="w-full h-full page-transition-enter"
        >
            {children}
        </div>
    )
}
