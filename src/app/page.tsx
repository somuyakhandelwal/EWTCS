import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { Activity, Lock, ArrowRight } from "lucide-react"
import { stats } from "./_landing-data"
import { LandingFeaturesSection } from "./_components/LandingFeaturesSection"
import { LandingRolesSection } from "./_components/LandingRolesSection"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">

      {/* ── Navbar ── */}
      <nav className="fixed w-full z-50 top-0 border-b border-border bg-background/60 backdrop-blur-xl">
        <div className="max-w-screen-xl flex items-center justify-between mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
              <Activity className="h-4 w-4 text-background" aria-hidden="true" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">EWTCS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
              v1.3 · Production Ready
            </span>
            <Link href="/login">
              <Button size="sm" className="rounded-full px-5 bg-foreground text-background hover:bg-foreground/90">
                Sign In <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative isolate px-6 pt-14 lg:px-8">
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/20 to-muted opacity-30 dark:opacity-15 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>

        <div className="mx-auto max-w-3xl py-28 sm:py-40 lg:py-48 text-center">
          <div className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-muted-foreground ring-1 ring-border">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              Emergency Ward Tracking &amp; Control System
            </span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl leading-tight">
            Ward Intelligence,<br />
            <span className="text-muted-foreground">Delivered.</span>
          </h1>

          <p className="mt-8 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            EWTCS is a purpose-built emergency ward management platform — combining real-time bed
            tracking, AI-generated daily reports, role-specific dashboards, and a complete audit
            trail in one unified system.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 h-12 text-base font-medium w-full sm:w-auto"
              >
                Access the System <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <a
              href="https://github.com/somuyakhandelwal/EWTCS"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              View on GitHub <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div className="border-y border-border bg-muted/20">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-3xl sm:text-4xl font-bold text-foreground">{s.value}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ── Features ── */}
      <LandingFeaturesSection />

      {/* ── Roles ── */}
      <LandingRolesSection />

      {/* ── CTA ── */}
      <section className="py-24 sm:py-32 border-t border-border">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Secure · Role-Restricted · Fully Audited
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8 text-base">
            Sign in with your assigned credentials to access the system. Contact your administrator
            if access needs to be provisioned.
          </p>
          <Link href="/login">
            <Button
              size="lg"
              className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-10 h-12 text-base font-medium"
            >
              Sign In to EWTCS <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-muted/10 py-10 px-6">
        <div className="mx-auto max-w-screen-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-foreground/10 flex items-center justify-center">
              <Activity className="h-3 w-3 text-foreground" aria-hidden="true" />
            </div>
            <span className="font-medium text-foreground">EWTCS</span>
            <span>· Emergency Ward Tracking &amp; Control System</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/somuyakhandelwal/EWTCS"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <span>&copy; 2026 EWTCS Project. MIT License.</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
