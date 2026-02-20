'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/shared/components/ui/button'

interface UserFormSubmitButtonProps {
  idleLabel: string
  pendingLabel: string
  className: string
}

export function UserFormSubmitButton({
  idleLabel,
  pendingLabel,
  className,
}: UserFormSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  )
}