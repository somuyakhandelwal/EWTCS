'use client'

import { useActionState, useCallback, useEffect, useState } from 'react'
import { updateUser } from '@/features/user-management/actions/user-management-actions'
import { appendRecoveryLog } from '@/shared/lib/recovery-draft'
import { useRecoveryDraftForm } from '@/shared/hooks/useRecoveryDraftForm'
import { EditUserDialogContent } from './EditUserDialogContent'

interface User {
  id: string
  username: string
  role: string
  is_active: boolean
  ward_id?: string | null
}

interface Ward {
  id: string
  name: string
  code: string
}

interface EditUserDialogProps {
  user: User
  isOpen: boolean
  onClose: () => void
  wards?: Ward[]
}

export default function EditUserDialog({ user, isOpen, onClose, wards = [] }: EditUserDialogProps) {
  const [state, action] = useActionState(updateUser, undefined)
  const [username, setUsername] = useState(user.username)
  const [role, setRole] = useState(user.role)
  const [wardId, setWardId] = useState(user.ward_id ?? '')

  const onRestore = useCallback((draft: { username: string; role: string; wardId: string }) => {
    setUsername(draft.username)
    setRole(draft.role)
    setWardId(draft.wardId)
  }, [])

  const draftKey = `ewtcs:edit-user-draft:${user.id}`
  const { restoredNotice, clearDraft } = useRecoveryDraftForm({
    draftKey,
    enabled: isOpen,
    values: { username, role, wardId },
    baseline: { username: user.username, role: user.role, wardId: user.ward_id ?? '' },
    onRestore,
    restorePrompt: 'Unsaved user edits were found. Restore them now?',
    restoredEvent: 'edit_user_form_restored',
    rejectedEvent: 'edit_user_form_restore_rejected',
    eventContext: { userId: user.id },
  })

  useEffect(() => {
    if (!isOpen) return
    setUsername(user.username)
    setRole(user.role)
    setWardId(user.ward_id ?? '')
  }, [isOpen, user.id, user.role, user.username, user.ward_id])

  useEffect(() => {
    if (!state?.success || !isOpen) return
    clearDraft()
    appendRecoveryLog('edit_user_form_saved', { userId: user.id })
    const timer = setTimeout(() => {
      onClose()
      window.location.reload()
    }, 1500)
    return () => clearTimeout(timer)
  }, [clearDraft, isOpen, onClose, state?.success, user.id])

  useEffect(() => {
    if (state?.message && !state.success) {
      appendRecoveryLog('edit_user_form_save_failed', { userId: user.id })
    }
  }, [state?.message, state?.success, user.id])

  if (!isOpen) return null

  return (
    <EditUserDialogContent
      user={user}
      wards={wards}
      action={action}
      state={state}
      restoredNotice={restoredNotice}
      username={username}
      role={role}
      wardId={wardId}
      setUsername={setUsername}
      setRole={setRole}
      setWardId={setWardId}
      onClose={onClose}
    />
  )
}
