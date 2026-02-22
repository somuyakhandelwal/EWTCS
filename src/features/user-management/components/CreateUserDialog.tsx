'use client'

import { useActionState, useCallback, useEffect, useState } from 'react'
import { createUser } from '@/features/user-management/actions/user-management-actions'
import { appendRecoveryLog } from '@/shared/lib/recovery-draft'
import { useRecoveryDraftForm } from '@/shared/hooks/useRecoveryDraftForm'
import { CreateUserDialogContent } from './CreateUserDialogContent'

interface Ward {
  id: string
  name: string
  code: string
}

export default function CreateUserDialog({ wards = [] }: { wards?: Ward[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, action] = useActionState<
    { success: boolean; message?: string; errors?: Record<string, string[]>; user?: unknown } | undefined,
    FormData
  >(createUser, undefined)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [wardId, setWardId] = useState('')
  const onRestore = useCallback((draft: { username: string; password: string; role: string; wardId: string }) => {
    setUsername(draft.username)
    setPassword(draft.password)
    setRole(draft.role)
    setWardId(draft.wardId)
  }, [])

  const { restoredNotice, clearDraft } = useRecoveryDraftForm({
    draftKey: 'ewtcs:create-user-draft',
    enabled: isOpen,
    values: { username, password, role, wardId },
    baseline: { username: '', password: '', role: '', wardId: '' },
    onRestore,
    restorePrompt: 'Unsaved new-user form data was found. Restore it now?',
    restoredEvent: 'create_user_form_restored',
    rejectedEvent: 'create_user_form_restore_rejected',
  })

  useEffect(() => {
    if (!state?.success || !isOpen) return
    clearDraft()
    appendRecoveryLog('create_user_form_saved')
    const timer = setTimeout(() => {
      setIsOpen(false)
      window.location.reload()
    }, 1000)
    return () => clearTimeout(timer)
  }, [clearDraft, isOpen, state?.success])

  useEffect(() => {
    if (state?.message && !state.success) {
      appendRecoveryLog('create_user_form_save_failed')
    }
  }, [state?.message, state?.success])

  const handleCancel = () => {
    setIsOpen(false)
    setUsername('')
    setPassword('')
    setRole('')
    setWardId('')
    clearDraft()
  }

  return (
    <CreateUserDialogContent
      isOpen={isOpen}
      wards={wards}
      action={action}
      state={state}
      restoredNotice={restoredNotice}
      username={username}
      password={password}
      role={role}
      wardId={wardId}
      setIsOpen={setIsOpen}
      setUsername={setUsername}
      setPassword={setPassword}
      setRole={setRole}
      setWardId={setWardId}
      onCancel={handleCancel}
    />
  )
}
