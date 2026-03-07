'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

export function PrintButton() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <Button
      onClick={handlePrint}
      variant="outline"
      size="sm"
      className="gap-2 border-border text-card-foreground hover:text-foreground hover:border-zinc-500 print:hidden"
    >
      <Printer className="h-4 w-4" />
      Print View
    </Button>
  )
}