'use client'
// Generate Summary Button
// EPIC 9 US-9.1/9.2: Trigger AI summary generation for a specific date.

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { generateSummaryAction } from '../actions/summary-actions'

interface GenerateSummaryButtonProps {
  date: string
  canRegenerate: boolean
}

export function GenerateSummaryButton({ date, canRegenerate }: GenerateSummaryButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (!canRegenerate) {
    return (
      <span className="text-xs text-zinc-600 italic">
        Summary finalised — cannot regenerate
      </span>
    )
  }

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      const result = await generateSummaryAction({ summaryDate: date })
      if (!result.success) {
        setError(result.error ?? 'Generation failed')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                   bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        {isPending ? 'Generating…' : 'Generate'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
