import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { initializeSystem } from "@/shared/config/init";
import { DatabaseStatusBanner } from "@/shared/components/ui/DatabaseStatusBanner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EWTCS - Emergency Ward Bed Status Monitoring",
  description: "Real-time digital dashboard for hospital emergency ward management with AI-powered daily reports",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

if (typeof window === "undefined") {
  void initializeSystem();
}

import { Suspense } from "react"
import { ThemeProvider } from "@/shared/components/ThemeProvider"
import { GlobalThemeToggle } from "@/shared/components/GlobalThemeToggle"
import { RouteProgressBar } from "@/shared/components/RouteProgressBar"
import { PageTransition } from "@/shared/components/PageTransition"
import { GlobalHelp } from "@/features/help/components/GlobalHelp"
import { ClientTracker } from "@/shared/components/ClientTracker"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <ClientTracker />
            <RouteProgressBar />
          </Suspense>
          <DatabaseStatusBanner />
          <PageTransition>
            {children}
          </PageTransition>
          <GlobalHelp />
          <GlobalThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
