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
      className="gap-2 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 print:hidden"
    >
      <Printer className="h-4 w-4" />
      Print View
    </Button>
  )
}