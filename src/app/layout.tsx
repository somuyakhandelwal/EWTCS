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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DatabaseStatusBanner />
        {children}
      </body>
    </html>
  );
}
