'use client'

import { UserPlus, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { UserFormSubmitButton } from './UserFormSubmitButton'

interface Ward {
  id: string
  name: string
  code: string
}

interface CreateUserDialogContentProps {
  isOpen: boolean
  wards: Ward[]
  action: (payload: FormData) => void
  state:
    | {
        success?: boolean
        message?: string
        errors?: {
          username?: string[]
          password?: string[]
          role?: string[]
        }
      }
    | undefined
  restoredNotice: boolean
  username: string
  password: string
  role: string
  wardId: string
  setIsOpen: (open: boolean) => void
  setUsername: (value: string) => void
  setPassword: (value: string) => void
  setRole: (value: string) => void
  setWardId: (value: string) => void
  onCancel: () => void
}

export function CreateUserDialogContent({
  isOpen,
  wards,
  action,
  state,
  restoredNotice,
  username,
  password,
  role,
  wardId,
  setIsOpen,
  setUsername,
  setPassword,
  setRole,
  setWardId,
  onCancel,
}: CreateUserDialogContentProps) {
  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        <UserPlus className="h-4 w-4 mr-2" />
        Create New User
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Create New User</h2>
            <p className="text-sm text-zinc-400 mt-1">Add a new user to the system</p>
          </div>
          <button onClick={onCancel} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={action} className="space-y-4">
          {restoredNotice && (
            <div className="p-3 rounded-md text-sm bg-emerald-900/20 text-emerald-400 border border-emerald-900/50">
              Recovered unsaved user form data from previous session.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username" className="text-zinc-200">Username</Label>
            <Input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              required
              className="bg-black/50 border-zinc-700 text-white"
            />
            {state?.errors?.username && <p className="text-sm text-red-500">{state.errors.username[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-200">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
              className="bg-black/50 border-zinc-700 text-white"
            />
            {state?.errors?.password && <p className="text-sm text-red-500">{state.errors.password[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-zinc-200">Role</Label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              required
              className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select a role</option>
              <option value="nurse">Nurse</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
              <option value="auditor">Auditor</option>
            </select>
            {state?.errors?.role && <p className="text-sm text-red-500">{state.errors.role[0]}</p>}
          </div>

          {wards.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="wardId" className="text-zinc-200">
                Ward Assignment <span className="text-zinc-500 font-normal">(Optional)</span>
              </Label>
              <select
                id="wardId"
                name="wardId"
                value={wardId}
                onChange={(event) => setWardId(event.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">No ward assigned</option>
                {wards.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
          )}

          {state?.message && (
            <div className={`p-3 rounded-md text-sm ${
              state.success
                ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-900/50'
                : 'bg-red-900/20 text-red-400 border border-red-900/50'
            }`}>
              {state.message}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="text-zinc-400 border-zinc-700 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <UserFormSubmitButton
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              idleLabel="Create User"
              pendingLabel="Creating..."
            />
          </div>
        </form>
      </div>
    </div>
  )
}