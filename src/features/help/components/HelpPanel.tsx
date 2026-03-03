'use client'

import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Tooltip } from '@/shared/components/ui/tooltip'
import type { CrossPageGroup, HelpContext } from '@/features/help/types/help'

interface HelpPanelProps {
  isOpen: boolean
  search: string
  context: HelpContext
  crossPageResults: CrossPageGroup[] | null
  onSearchChange: (value: string) => void
  onClose: () => void
  onStartTour: () => void
  tourAvailable: boolean
}

export function HelpPanel({
  isOpen,
  search,
  context,
  crossPageResults,
  onSearchChange,
  onClose,
  onStartTour,
  tourAvailable,
}: HelpPanelProps) {
  if (!isOpen) return null

  const query = search.trim().toLowerCase()
  const filteredTips = context.tips.filter((tip) => {
    const haystack = `${tip.title} ${tip.description}`.toLowerCase()
    return query.length === 0 || haystack.includes(query)
  })

  return (
    <aside className="fixed right-5 bottom-20 z-[75] w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">{context.pageTitle}</h2>
          <p className="text-xs text-muted-foreground mt-1">{context.summary}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} title="Dismiss help panel" aria-label="Dismiss help panel">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-3 relative">
        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5" aria-hidden="true" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search all help content…"
          className="pl-9"
          aria-label="Search help content across all pages"
        />
      </div>

      <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
        {crossPageResults !== null ? (
          crossPageResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results found across all pages.</p>
          ) : (
            crossPageResults.map((group) => (
              <div key={group.routeKey} className="mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 px-1">
                  {group.pageTitle}
                </p>
                {group.tips.map((tip) => (
                  <div key={tip.id} className="rounded-md border border-border bg-background/50 p-3 mb-1">
                    <h3 className="text-sm font-medium text-foreground">{tip.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{tip.description}</p>
                  </div>
                ))}
              </div>
            ))
          )
        ) : filteredTips.length === 0 ? (
          <p className="text-sm text-muted-foreground">No help items matched your search.</p>
        ) : (
          filteredTips.map((tip) => (
            <div key={tip.id} className="rounded-md border border-border bg-background/50 p-3">
              <h3 className="text-sm font-medium text-foreground">{tip.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{tip.description}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Tooltip content="View full documentation with screenshots and printable guides" side="top">
          <Link href="/manual" className="text-xs text-primary underline-offset-2 hover:underline" title="Open full user manual">
            Open full user manual
          </Link>
        </Tooltip>
        <Tooltip content={tourAvailable ? 'Step through this page\'s key sections' : 'No tour available for this page'} side="top">
          <Button size="sm" onClick={onStartTour} disabled={!tourAvailable} title="Start guided tour">
            Start Tour
          </Button>
        </Tooltip>
      </div>
    </aside>
  )
}
