'use client'

import { ThemeToggle } from "./ThemeToggle"

export function GlobalThemeToggle() {
    return (
        <div className="fixed bottom-5 left-5 z-[70]">
            <ThemeToggle />
        </div>
    )
}
