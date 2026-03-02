import type { Config } from "tailwindcss"

const config = {
    darkMode: "class",
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                status: {
                    empty: "hsl(var(--status-empty))",
                    cleaning: "hsl(var(--status-cleaning))",
                    occupied: "hsl(var(--status-occupied))",
                    delayed: "hsl(var(--status-delayed))",
                    escalated: "hsl(var(--status-escalated))",
                    success: "hsl(var(--status-success))",
                    virtual: "hsl(var(--status-virtual))",
                    temporary: "hsl(var(--status-temporary))",
                    audit: "hsl(var(--status-audit))",
                },
                retention: "hsl(var(--retention-blue))",
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "pulse-slow": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.7" },
                },
                "glow-escalated": {
                    "0%, 100%": { boxShadow: "0 0 10px hsl(var(--status-escalated) / 0.5)" },
                    "50%": { boxShadow: "0 0 20px hsl(var(--status-escalated) / 0.8)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "pulse-slow": "pulse-slow 3s ease-in-out infinite",
                "glow-escalated": "glow-escalated 2s ease-in-out infinite",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
