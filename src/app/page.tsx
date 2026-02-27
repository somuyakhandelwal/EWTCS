import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { Activity, Zap, FileText } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">

      {/* Navbar Placeholder */}
      <nav className="fixed w-full z-50 top-0 start-0 border-b border-border bg-background/50 backdrop-blur-xl">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
          <span className="self-center text-xl font-semibold whitespace-nowrap text-foreground tracking-tighter">EWTCS</span>
          <div className="flex space-x-3">
            <Link href="/login">
              <Button variant="outline" className="text-foreground border-border hover:bg-foreground hover:text-background transition-all">
                Nurse Portal
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-muted to-border opacity-30 dark:opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>

        <div className="mx-auto max-w-3xl py-32 sm:py-48 lg:py-56 text-center">
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-muted-foreground ring-1 ring-border hover:ring-foreground/20">
              Active Development Phase. <a href="#" className="font-semibold text-foreground"><span className="absolute inset-0" aria-hidden="true"></span>Read more <span aria-hidden="true">&rarr;</span></a>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
            Hospital Grade <span className="text-muted-foreground">Efficiency</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            A minimalist, high-performance dashboard for monitoring emergency ward bed status. Designed for clarity, speed, and reliability in critical environments.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/login">
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 h-12 text-base font-medium">
                Access Dashboard
              </Button>
            </Link>
            <a href="https://github.com/somuyakhandelwal/EWTCS" target="_blank" className="text-sm font-semibold leading-6 text-foreground flex items-center gap-2 hover:text-muted-foreground transition-colors">
              View Documentation <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32 border-t border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-muted-foreground">Faster Response Time</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to manage patient flow
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-foreground">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/10">
                    <Activity className="h-6 w-6 text-foreground" aria-hidden="true" />
                  </div>
                  Real-Time Status
                </dt>
                <dd className="mt-2 text-base leading-7 text-muted-foreground">
                  Instant visibility into bed occupancy and patient status across the entire ward.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-foreground">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/10">
                    <Zap className="h-6 w-6 text-foreground" aria-hidden="true" />
                  </div>
                  Zero-Latency Updates
                </dt>
                <dd className="mt-2 text-base leading-7 text-muted-foreground">
                  Performance-first architecture ensures updates are reflected instantly on all devices.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-foreground">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/10">
                    <FileText className="h-6 w-6 text-foreground" aria-hidden="true" />
                  </div>
                  Daily Analysis
                </dt>
                <dd className="mt-2 text-base leading-7 text-muted-foreground">
                  Automated reporting tools that generate actionable insights from daily activities.
                </dd>
              </div>

            </dl>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-background py-8 border-t border-border text-center">
        <p className="text-muted-foreground text-sm">
          &copy; 2026 EWTCS Project. Open Source.
        </p>
      </footer>
    </div>
  )
}
