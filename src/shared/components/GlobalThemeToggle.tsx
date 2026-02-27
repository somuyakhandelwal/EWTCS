'use client'

import { ThemeToggle } from "./ThemeToggle"

export function GlobalThemeToggle() {
    return (
        <div className="fixed bottom-6 right-6 z-[100] sm:bottom-8 sm:right-8">
            <div className="bg-card/80 backdrop-blur-md border border-border shadow-2xl rounded-full p-2 flex items-center justify-center">
                <ThemeToggle className="bg-transparent border-none shadow-none backdrop-blur-none hover:bg-transparent" />
            </div>
        </div>
    )
}
