'use client'

// UserTableRow — single row in the User Management table
// US-5.5: includes Reset Password action button

import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
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

// Removed legacy hardcoded rainbow badges

export function UserTableRow({ user, wards, onEdit, onReset, onToggleActive, actionLoading }: UserTableRowProps) {
    return (
        <tr key={user.id} className="hover:bg-card transition-colors">
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground">{user.username}</div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <Badge variant="outline" className="capitalize">
                    {user.role}
                </Badge>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                {user.ward_id
                    ? (wards.find(w => w.id === user.ward_id)?.name ?? '—')
                    : <span className="text-muted-foreground text-xs italic">Unassigned</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                        <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onReset(user)}>
                        <KeyRound className="h-3 w-3 mr-1" />Reset Password
                    </Button>
                    <Button
                        variant={user.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => onToggleActive(user.id, user.is_active)}
                        disabled={actionLoading === user.id}
                    >
                        {actionLoading === user.id ? 'Loading...' : user.is_active
                            ? <><Ban className="h-3 w-3 mr-1" />Deactivate</>
                            : <><CheckCircle className="h-3 w-3 mr-1" />Activate</>}
                    </Button>
                </div>
            </td>
        </tr>
    )
}
