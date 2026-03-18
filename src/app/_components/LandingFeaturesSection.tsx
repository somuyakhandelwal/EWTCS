import { features } from '../_landing-data'

export function LandingFeaturesSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Platform Capabilities
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything your ward needs
          </h2>
          <p className="mt-4 text-muted-foreground text-base">
            From real-time bed monitoring to AI-driven insights — every feature purpose-built for
            high-pressure emergency ward environments.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-muted/20 p-6 hover:bg-muted/40 hover:border-foreground/20 transition-all duration-200"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/10 group-hover:bg-foreground/15 transition-colors">
                <Icon className="h-5 w-5 text-foreground" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
