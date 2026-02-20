'use client'

// UserTableRow — single row in the User Management table
// US-5.5: includes Reset Password action button

import { Button } from '@/shared/components/ui/button'
import { Pencil, Ban, CheckCircle, KeyRound } from 'lucide-react'

export interface UserRow {
    id: string
    username: string
    role: string
    is_active: boolean
    created_at: string
    ward_id?: string | null
}

export interface Ward { id: string; name: string; code: string }

interface UserTableRowProps {
    user: UserRow
    wards: Ward[]
    onEdit: (user: UserRow) => void
    onReset: (user: UserRow) => void
    onToggleActive: (userId: string, currentStatus: boolean) => void
    actionLoading: string | null
}

function getRoleBadgeColor(role: string): string {
    switch (role) {
        case 'admin':      return 'bg-purple-900/30 text-purple-400 border-purple-900/50'
        case 'supervisor': return 'bg-blue-900/30 text-blue-400 border-blue-900/50'
        case 'nurse':      return 'bg-green-900/30 text-green-400 border-green-900/50'
        default:           return 'bg-zinc-800 text-zinc-400 border-zinc-700'
    }
}

export function UserTableRow({ user, wards, onEdit, onReset, onToggleActive, actionLoading }: UserTableRowProps) {
    return (
        <tr key={user.id} className="hover:bg-zinc-900/50 transition-colors">
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-white">{user.username}</div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-400">
                {user.ward_id
                    ? (wards.find(w => w.id === user.ward_id)?.name ?? '—')
                    : <span className="text-amber-500/70 text-xs">Unassigned</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-400">
                {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(user)}
                        className="text-blue-400 border-blue-900/50 hover:bg-blue-900/20">
                        <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onReset(user)}
                        className="text-amber-400 border-amber-900/50 hover:bg-amber-900/20">
                        <KeyRound className="h-3 w-3 mr-1" />Reset Password
                    </Button>
                    <Button variant="outline" size="sm"
                        onClick={() => onToggleActive(user.id, user.is_active)}
                        disabled={actionLoading === user.id}
                        className={user.is_active
                            ? 'text-red-400 border-red-900/50 hover:bg-red-900/20'
                            : 'text-green-400 border-green-900/50 hover:bg-green-900/20'}>
                        {actionLoading === user.id ? 'Loading...' : user.is_active
                            ? <><Ban className="h-3 w-3 mr-1" />Deactivate</>
                            : <><CheckCircle className="h-3 w-3 mr-1" />Activate</>}
                    </Button>
                </div>
            </td>
        </tr>
    )
}
