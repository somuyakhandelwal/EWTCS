'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Pencil, Ban, CheckCircle } from 'lucide-react'
import { deactivateUser, activateUser } from '@/features/user-management/actions/user-management-actions'
import EditUserDialog from './EditUserDialog'

interface User {
    id: string
    username: string
    role: string
    is_active: boolean
    created_at: string
    ward_id?: string | null
}

interface Ward { id: string; name: string; code: string }

interface UserManagementTableProps {
    users: User[]
    wards?: Ward[]
}

export default function UserManagementTable({ users, wards = [] }: UserManagementTableProps) {
    const router = useRouter()
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleToggleActive = async (userId: string, currentStatus: boolean) => {
        setActionLoading(userId)
        setError(null)
        try {
            let result
            if (currentStatus) {
                result = await deactivateUser(userId, 'Deactivated by admin')
            } else {
                result = await activateUser(userId)
            }
            
            if (result.success) {
                // Use Next.js router refresh to update UI
                router.refresh()
            } else {
                setError(result.message || 'Failed to update user status')
            }
        } catch (error) {
            console.error('Failed to toggle user status', error)
            setError('An unexpected error occurred')
        } finally {
            setActionLoading(null)
        }
    }

    const handleEdit = (user: User) => {
        setSelectedUser(user)
        setIsEditing(true)
    }

    const handleCloseEdit = () => {
        setIsEditing(false)
        setSelectedUser(null)
        router.refresh()
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-900/30 text-purple-400 border-purple-900/50'
            case 'supervisor':
                return 'bg-blue-900/30 text-blue-400 border-blue-900/50'
            case 'nurse':
                return 'bg-green-900/30 text-green-400 border-green-900/50'
            default:
                return 'bg-zinc-800 text-zinc-400 border-zinc-700'
        }
    }

    return (
        <>
            {error && (
                <div className="mb-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-black/50">
                        <tr className="border-b border-zinc-800">
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Username
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Ward
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Created
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {users.map((user) => (
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
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        user.is_active
                                            ? 'bg-emerald-900/30 text-emerald-400'
                                            : 'bg-red-900/30 text-red-400'
                                    }`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-400">
                                    {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(user)}
                                            className="text-blue-400 border-blue-900/50 hover:bg-blue-900/20"
                                        >
                                            <Pencil className="h-3 w-3 mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleActive(user.id, user.is_active)}
                                            disabled={actionLoading === user.id}
                                            className={user.is_active
                                                ? 'text-red-400 border-red-900/50 hover:bg-red-900/20'
                                                : 'text-green-400 border-green-900/50 hover:bg-green-900/20'
                                            }
                                        >
                                            {actionLoading === user.id ? (
                                                'Loading...'
                                            ) : user.is_active ? (
                                                <>
                                                    <Ban className="h-3 w-3 mr-1" />
                                                    Deactivate
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Activate
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isEditing && selectedUser && (
                <EditUserDialog
                    user={selectedUser}
                    isOpen={isEditing}
                    onClose={handleCloseEdit}
                    wards={wards}
                />
            )}
        </>
    )
}
