import Link from 'next/link'
import { Activity, ClipboardCheck } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type NurseArea = 'dashboard' | 'triage'

interface NurseAreaSidebarProps {
  activeArea: NurseArea
}

const LINKS: Array<{ key: NurseArea; label: string; href: string; icon: typeof Activity }> = [
  { key: 'dashboard', label: 'Emergency Ward', href: '/dashboard', icon: Activity },
  { key: 'triage', label: 'Triage Area', href: '/triage', icon: ClipboardCheck },
]

export function NurseAreaSidebar({ activeArea }: NurseAreaSidebarProps) {
  return (
    <aside className="w-full lg:w-64 lg:shrink-0" aria-label="Nurse area navigation">
      <div className="rounded-xl border border-border bg-card p-3 lg:sticky lg:top-4">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Areas
        </p>
        <nav className="space-y-1">
          {LINKS.map((link) => {
            const Icon = link.icon
            const isActive = activeArea === link.key

            return (
              <Link
                key={link.key}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
