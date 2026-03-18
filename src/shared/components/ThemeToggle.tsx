"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/shared/lib/utils"

interface ThemeToggleProps {
    className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Ensure hydration matches before rendering the toggle state
    React.useEffect(() => {
        setMounted(true)
    }, [])

    const baseClass = cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-lg",
        "border border-border bg-background shadow-md",
        "text-foreground transition-colors duration-200",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        className
    )

    if (!mounted) {
        return (
            <button className={baseClass} aria-label="Toggle theme">
                <span className="sr-only">Toggle theme</span>
            </button>
        )
    }

    return (
        <button
            onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
            className={baseClass}
            title={resolvedTheme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-label={resolvedTheme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
