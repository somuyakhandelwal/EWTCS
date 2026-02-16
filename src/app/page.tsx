import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, Zap, FileText, Github, ChevronRight } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-foreground selection:bg-white selection:text-black font-sans">

      {/* Navbar Placeholder */}
      <nav className="fixed w-full z-50 top-0 start-0 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
          <span className="self-center text-xl font-semibold whitespace-nowrap text-white tracking-tighter">EWTCS</span>
          <div className="flex space-x-3">
            <Link href="/login">
              <Button variant="outline" className="text-white border-white/20 hover:bg-white hover:text-black transition-all">
                Nurse Portal
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-gray-800 to-gray-900 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>

        <div className="mx-auto max-w-3xl py-32 sm:py-48 lg:py-56 text-center">
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-400 ring-1 ring-white/10 hover:ring-white/20">
              Active Development Phase. <a href="#" className="font-semibold text-white"><span className="absolute inset-0" aria-hidden="true"></span>Read more <span aria-hidden="true">&rarr;</span></a>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-6">
            Hospital Grade <span className="text-gray-500">Efficiency</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-400">
            A minimalist, high-performance dashboard for monitoring emergency ward bed status. Designed for clarity, speed, and reliability in critical environments.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/login">
              <Button size="lg" className="bg-white text-black hover:bg-gray-200 rounded-full px-8 h-12 text-base font-medium">
                Access Dashboard
              </Button>
            </Link>
            <a href="https://github.com/somuyakhandelwal/EWTCS" target="_blank" className="text-sm font-semibold leading-6 text-white flex items-center gap-2 hover:text-gray-300 transition-colors">
              View Documentation <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32 border-t border-white/5 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-gray-400">Faster Response Time</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need to manage patient flow
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                    <Activity className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Real-Time Status
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-400">
                  Instant visibility into bed occupancy and patient status across the entire ward.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                    <Zap className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Zero-Latency Updates
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-400">
                  Performance-first architecture ensures updates are reflected instantly on all devices.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                    <FileText className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Daily Analysis
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-400">
                  Automated reporting tools that generate actionable insights from daily activities.
                </dd>
              </div>

            </dl>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black py-8 border-t border-white/10 text-center">
        <p className="text-gray-500 text-sm">
          &copy; 2026 EWTCS Project. Open Source.
        </p>
      </footer>
    </div>
  )
}
