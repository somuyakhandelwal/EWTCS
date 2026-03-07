'use client'
// EPIC 12 — Audit Logs & Compliance  US-12.1

import { useState, useTransition } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Search, RotateCcw } from 'lucide-react'
import type { AuditLogFilterInput } from '../actions/audit-log-actions'

const ACTION_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE', 'LOGIN', 'LOGOUT']

interface Props {
    entityTypes: string[]
    onSearch: (filter: AuditLogFilterInput) => void
    isPending: boolean
}

const selectCls = 'h-9 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-blue-500'

export function AuditLogFilters({ entityTypes, onSearch, isPending }: Props) {
    const [entityType, setEntityType] = useState('')
    const [actionType, setActionType] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [userId, setUserId] = useState('')
    const [, startTransition] = useTransition()

    function buildFilter(page = 1): AuditLogFilterInput {
        return {
            entityType: entityType || undefined,
            actionType: actionType || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            userId: userId || undefined,
            page,
            pageSize: 50,
        }
    }

    function handleSearch() {
        startTransition(() => onSearch(buildFilter(1)))
    }

    function handleReset() {
        setEntityType('')
        setActionType('')
        setStartDate('')
        setEndDate('')
        setUserId('')
        startTransition(() => onSearch({ page: 1, pageSize: 50 }))
    }

    return (
        <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Entity Type</label>
                <select
                    value={entityType}
                    onChange={e => setEntityType(e.target.value)}
                    className={`${selectCls} w-36`}
                >
                    <option value="">All entities</option>
                    {entityTypes.map(et => (
                        <option key={et} value={et}>{et}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Action</label>
                <select
                    value={actionType}
                    onChange={e => setActionType(e.target.value)}
                    className={`${selectCls} w-36`}
                >
                    <option value="">All actions</option>
                    {ACTION_TYPES.map(at => (
                        <option key={at} value={at}>{at}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">From</label>
                <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-36 bg-zinc-800 border-zinc-700 text-zinc-200 h-9"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">To</label>
                <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-36 bg-zinc-800 border-zinc-700 text-zinc-200 h-9"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">User ID (UUID)</label>
                <Input
                    placeholder="Filter by user ID…"
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    className="w-52 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 h-9"
                />
            </div>

            <Button
                onClick={handleSearch}
                disabled={isPending}
                className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
                <Search className="h-4 w-4 mr-1" />
                Search
            </Button>
            <Button
                variant="outline"
                onClick={handleReset}
                disabled={isPending}
                className="h-9 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
            </Button>
        </div>
    )
}
