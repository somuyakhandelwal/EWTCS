import { roles } from '../_landing-data'
import { CheckCircle2 } from 'lucide-react'

export function LandingRolesSection() {
  return (
    <section className="py-24 sm:py-32 border-t border-border bg-muted/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Role-Based Access
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A dashboard for every role
          </h2>
          <p className="mt-4 text-muted-foreground text-base">
            EWTCS provides purpose-built interfaces and permissions for each of the four roles in
            your ward.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map(({ role, colorText, colorBg, colorBorder, points }) => (
            <div
              key={role}
              className={`rounded-2xl border ${colorBorder} ${colorBg} p-6`}
            >
              <div className={`text-sm font-bold uppercase tracking-widest ${colorText} mb-4`}>
                {role}
              </div>
              <ul className="space-y-2">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${colorText}`} aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
