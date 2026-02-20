'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deactivateUser, activateUser } from '@/features/user-management/actions/user-management-actions'
import EditUserDialog from './EditUserDialog'
import ResetPasswordDialog from './ResetPasswordDialog'
import { UserTableRow } from './UserTableRow'
import type { UserRow, Ward } from './UserTableRow'

interface UserManagementTableProps {
    users: UserRow[]
    wards?: Ward[]
}

export default function UserManagementTable({ users, wards = [] }: UserManagementTableProps) {
    const router = useRouter()
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isResetting, setIsResetting] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleToggleActive = async (userId: string, currentStatus: boolean) => {
        setActionLoading(userId)
        setError(null)
        try {
            const result = currentStatus
                ? await deactivateUser(userId, 'Deactivated by admin')
                : await activateUser(userId)
            if (result.success) { router.refresh() }
            else { setError(result.message || 'Failed to update user status') }
        } catch {
            setError('An unexpected error occurred')
        } finally {
            setActionLoading(null)
        }
    }

    const handleEdit  = (user: UserRow) => { setSelectedUser(user); setIsEditing(true) }
    const handleReset = (user: UserRow) => { setSelectedUser(user); setIsResetting(true) }
    const handleCloseEdit  = () => { setIsEditing(false);  setSelectedUser(null); router.refresh() }
    const handleCloseReset = () => { setIsResetting(false); setSelectedUser(null) }

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
                            {['Username','Role','Ward','Status','Created','Actions'].map((h, i) => (
                                <th key={h} className={`px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider ${
                                    i === 5 ? 'text-right' : 'text-left'
                                }`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {users.map((user) => (
                            <UserTableRow
                                key={user.id}
                                user={user}
                                wards={wards}
                                onEdit={handleEdit}
                                onReset={handleReset}
                                onToggleActive={handleToggleActive}
                                actionLoading={actionLoading}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {isEditing && selectedUser && (
                <EditUserDialog user={selectedUser} isOpen={isEditing} onClose={handleCloseEdit} wards={wards} />
            )}
            {isResetting && selectedUser && (
                <ResetPasswordDialog user={selectedUser} isOpen={isResetting} onClose={handleCloseReset} />
            )}
        </>
    )
}