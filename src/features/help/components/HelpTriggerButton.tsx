'use client'

import { HelpCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Tooltip } from '@/shared/components/ui/tooltip'

interface HelpTriggerButtonProps {
  isOpen: boolean
  onClick: () => void
}

export function HelpTriggerButton({ isOpen, onClick }: HelpTriggerButtonProps) {
  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      <Tooltip content={isOpen ? 'Close help panel (F1)' : 'Open help panel (F1)'} side="left">
        <Button
          type="button"
          onClick={onClick}
          size="sm"
          className="rounded-full h-11 px-4 shadow-lg"
          title={isOpen ? 'Close help panel' : 'Open help panel'}
          aria-label={isOpen ? 'Close help panel' : 'Open help panel'}
        >
          <HelpCircle className="h-4 w-4 mr-2" aria-hidden="true" />
          Help
        </Button>
      </Tooltip>
    </div>
  )
}
