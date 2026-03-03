'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface KioskRestoreLoaderProps {
    isChecking: boolean
}

export function KioskRestoreLoader({ isChecking }: KioskRestoreLoaderProps) {
    if (!isChecking) return null

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium text-muted-foreground">Restoring Kiosk Session...</p>
            </div>
        </motion.div>
    )
}
