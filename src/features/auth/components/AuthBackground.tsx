'use client'

import React from 'react'
import { motion } from 'framer-motion'

export default function AuthBackground({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-muted/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-muted/50 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-sm relative z-10"
            >
                {children}
            </motion.div>

            <div className="absolute bottom-4 text-muted-foreground text-xs text-center w-full">
                &copy; 2026 EWTCS Project
            </div>
        </div>
    )
}

export function KioskRestoreLoader() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-muted/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-muted/50 rounded-full blur-[100px]" />
            </div>
            <div className="text-center text-muted-foreground animate-pulse text-lg relative z-10">
                Restoring kiosk session...
            </div>
        </div>
    )
}
