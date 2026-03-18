import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import "./globals.css";
import { initializeSystem } from "@/shared/config/init";
import { DatabaseStatusBanner } from "@/shared/components/ui/DatabaseStatusBanner"
import { ThemeProvider } from "@/shared/components/ThemeProvider"
import { PageTransition } from "@/shared/components/PageTransition"

const ClientTracker = dynamic(
  () => import("@/shared/components/ClientTracker").then((mod) => mod.ClientTracker)
)

const RouteProgressBar = dynamic(
  () => import("@/shared/components/RouteProgressBar").then((mod) => mod.RouteProgressBar)
)

const GlobalHelp = dynamic(
  () => import("@/features/help/components/GlobalHelp").then((mod) => mod.GlobalHelp)
)

const GlobalThemeToggle = dynamic(
  () => import("@/shared/components/GlobalThemeToggle").then((mod) => mod.GlobalThemeToggle)
)

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
