'use client'

import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { PasswordResetHint } from './PasswordResetHint'
import { UserFormSubmitButton } from './UserFormSubmitButton'

interface User {
  id: string
  username: string
}

interface Ward {
  id: string
  name: string
  code: string
}

interface EditUserDialogContentProps {
  user: User
  wards: Ward[]
  action: (payload: FormData) => void
  state:
  | {
    success?: boolean
    message?: string
    errors?: {
      username?: string[]
      role?: string[]
    }
  }
  | undefined
  restoredNotice: boolean
  username: string
  role: string
  wardId: string
  setUsername: (value: string) => void
  setRole: (value: string) => void
  setWardId: (value: string) => void
  onClose: () => void
}

export function EditUserDialogContent({
  user,
  wards,
  action,
  state,
  restoredNotice,
  username,
  role,
  wardId,
  setUsername,
  setRole,
  setWardId,
  onClose,
}: EditUserDialogContentProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Edit User</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Update user details for <span className="text-foreground font-medium">{user.username}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />

          {restoredNotice && (
            <div className="p-3 rounded-md text-sm bg-emerald-900/20 text-emerald-400 border border-emerald-900/50">
              Recovered unsaved user edits from previous session.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username" className="text-card-foreground">Username</Label>
            <Input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="bg-background border-border text-foreground"
            />
            {state?.errors?.username && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {state.errors.username[0]}
              </p>
            )}
          </div>

          <PasswordResetHint />

          <div className="space-y-2">
            <Label htmlFor="role" className="text-card-foreground">Role</Label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="nurse">Nurse</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
              <option value="auditor">Auditor</option>
               <option value="cardiologist">Cardiologist</option>
               <option value="cath_lab_nurse">Cath Lab Nurse</option>
            </select>
            {state?.errors?.role && <p className="text-sm text-red-500">{state.errors.role[0]}</p>}
          </div>

          {wards.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="wardId" className="text-card-foreground">
                Ward Assignment <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <select
                id="wardId"
                name="wardId"
                value={wardId}
                onChange={(event) => setWardId(event.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No ward assigned</option>
                {wards.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
          )}

          {state?.message && (
            <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${state.success
                ? 'bg-blue-900/20 text-blue-400 border border-blue-900/50'
                : 'bg-red-900/20 text-red-400 border border-red-900/50'
              }`}>
              {state.success ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{state.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-muted-foreground border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <UserFormSubmitButton
              className="bg-blue-600 hover:bg-blue-700 text-foreground"
              idleLabel="Update User"
              pendingLabel="Updating..."
            />
          </div>
        </form>
      </div>
    </div>
  )
}