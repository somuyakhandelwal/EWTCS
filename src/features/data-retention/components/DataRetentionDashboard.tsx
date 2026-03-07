'use client'
// EPIC 14 — Data Retention & Archival  US-14.1, US-14.2

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Database, Archive, Settings, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { updateRetentionPolicyAction, runArchiveAction } from '../actions/retention-actions'
import type { RetentionPolicy, ArchiveStats } from '../lib/retention-queries'

interface Props {
    policies: RetentionPolicy[]
    stats: ArchiveStats
}

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: React.ReactNode }) {
    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    {icon} {label}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</div>
                {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
            </CardContent>
        </Card>
    )
}

export function DataRetentionDashboard({ policies: initialPolicies, stats: initialStats }: Props) {
    const [policies, setPolicies] = useState(initialPolicies)
    const [stats, setStats] = useState(initialStats)
    const [editMonths, setEditMonths] = useState<Record<string, string>>({})
    const [archiveMonths, setArchiveMonths] = useState('24')
    const [archiveResult, setArchiveResult] = useState<{ count: number; cutoff: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [isArchiving, startArchive] = useTransition()

    function handlePolicyEdit(entityType: string, current: number) {
        setEditMonths(m => ({ ...m, [entityType]: String(m[entityType] ?? current) }))
    }

    async function savePolicyEdit(entityType: string) {
        const months = parseInt(editMonths[entityType] ?? '', 10)
        if (isNaN(months) || months < 1) return
        startTransition(async () => {
            setError(null)
            const res = await updateRetentionPolicyAction({ entityType, retainMonths: months })
            if (res.success) {
                setPolicies(p => p.map(pol => pol.entity_type === entityType ? { ...pol, retain_months: months } : pol))
                setEditMonths(m => { const next = { ...m }; delete next[entityType]; return next })
            } else {
                setError(res.error ?? 'Failed to update policy')
            }
        })
    }

    async function handleArchive() {
        const months = parseInt(archiveMonths, 10)
        if (isNaN(months) || months < 1) return
        setError(null)
        setArchiveResult(null)
        startArchive(async () => {
            const res = await runArchiveAction({ retainMonths: months })
            if (res.success && res.result) {
                setArchiveResult({ count: res.result.archivedCount, cutoff: res.result.cutoffDate })
                // Refresh stats approximation
                setStats(s => ({
                    ...s,
                    activeRows: Math.max(0, s.activeRows - res.result!.archivedCount),
                    archivedRows: s.archivedRows + res.result!.archivedCount,
                }))
            } else {
                setError(res.error ?? 'Archive failed')
            }
        })
    }

    const fmtDate = (d: string | null) => d
        ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—'

    return (
        <div className="space-y-8">
            {/* Stats row */}
            <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Active Rows" value={stats.activeRows}
                    sub={`Oldest: ${fmtDate(stats.oldestActiveEntry)}`}
                    icon={<Database className="h-4 w-4" />} />
                <StatCard label="Archived Rows" value={stats.archivedRows}
                    sub={`Oldest: ${fmtDate(stats.oldestArchiveEntry)}`}
                    icon={<Archive className="h-4 w-4 text-zinc-400" />} />
                <StatCard label="Active Table Age"
                    value={stats.oldestActiveEntry
                        ? `${Math.floor((Date.now() - new Date(stats.oldestActiveEntry).getTime()) / 86400000 / 30)} mo`
                        : '—'}
                    sub="Months since oldest row"
                    icon={<Settings className="h-4 w-4 text-zinc-400" />} />
                <StatCard label="Policies"
                    value={policies.length}
                    sub="Configured retention rules"
                    icon={<Settings className="h-4 w-4 text-zinc-400" />} />
            </div>

            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-900/20 border border-red-700/50 text-red-300 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {archiveResult && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-900/20 border border-emerald-700/50 text-emerald-300 text-sm">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    Archived <strong>{archiveResult.count.toLocaleString()}</strong> rows older than{' '}
                    {fmtDate(archiveResult.cutoff)}.
                </div>
            )}

            {/* Retention policies */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Settings className="h-5 w-5 text-zinc-400" />
                        Retention Policies
                    </CardTitle>
                    <p className="text-sm text-zinc-400 mt-1">
                        Configure how long active data is kept before archival.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {policies.map(pol => {
                            const isEditing = pol.entity_type in editMonths
                            return (
                                <div key={pol.id} className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-zinc-800">
                                    <div>
                                        <p className="text-sm font-medium text-white capitalize">{pol.entity_type.replace(/_/g, ' ')}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            Retain <strong className="text-zinc-300">{pol.retain_months} months</strong> in active table
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isEditing ? (
                                            <>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={120}
                                                    value={editMonths[pol.entity_type]}
                                                    onChange={e => setEditMonths(m => ({ ...m, [pol.entity_type]: e.target.value }))}
                                                    className="w-20 h-8 bg-zinc-800 border-zinc-700 text-zinc-200 text-sm"
                                                />
                                                <span className="text-xs text-zinc-400">months</span>
                                                <Button
                                                    size="sm"
                                                    onClick={() => savePolicyEdit(pol.entity_type)}
                                                    disabled={isPending}
                                                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                                >
                                                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditMonths(m => { const n = { ...m }; delete n[pol.entity_type]; return n })}
                                                    className="h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePolicyEdit(pol.entity_type, pol.retain_months)}
                                                className="h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
                                            >
                                                Edit
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Manual archive */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Archive className="h-5 w-5 text-amber-400" />
                        Run Archive Now
                    </CardTitle>
                    <p className="text-sm text-zinc-400 mt-1">
                        Move all <code className="text-zinc-300 bg-zinc-800 px-1 rounded">bed_stage_logs</code> older than the threshold
                        to the archive table. This operation is <strong className="text-white">irreversible</strong> within the active table.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-sm text-zinc-300 whitespace-nowrap">Retain the most recent</label>
                        <Input
                            type="number"
                            min={1}
                            max={120}
                            value={archiveMonths}
                            onChange={e => setArchiveMonths(e.target.value)}
                            className="w-20 h-9 bg-zinc-800 border-zinc-700 text-zinc-200"
                        />
                        <label className="text-sm text-zinc-300">months of data</label>
                        <Button
                            onClick={handleArchive}
                            disabled={isArchiving}
                            className="h-9 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {isArchiving
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Archiving…</>
                                : <><Archive className="h-4 w-4 mr-2" />Run Archive</>
                            }
                        </Button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-3">
                        All entries with <code>transition_time</code> older than the selected threshold will be moved to
                        <code> bed_stage_logs_archive</code>. The archived data remains queryable for compliance purposes.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
